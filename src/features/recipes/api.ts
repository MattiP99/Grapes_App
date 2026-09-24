import { fetchComponents } from '@/features/components/api';
import { fetchStorageLocations } from '@/features/ingredients/api';
import { buildStockByLocation } from '@/lib/stock';
import { supabase } from '@/lib/supabase';
import type {
  ComponentWithCost,
  Ingredient,
  Recipe,
  RecipeVariant,
  RecipeVariantIngredient,
  RecipeVariantLine,
  RecipeVariantWithStock,
  RecipeWithVariants,
} from '@/types/database';

/**
 * Tutte le varianti di TUTTE le ricette, con lo stock di prodotto finito già
 * pronto (già cotto/decorato, in attesa di consegna) per ciascun magazzino.
 * Usato per il Piano di lavoro, quando si sceglie quale variante produrre.
 */
export async function fetchRecipeVariantsWithStock(): Promise<RecipeVariantWithStock[]> {
  const [{ data: variants, error }, locations, { data: stockRows, error: stockError }] = await Promise.all([
    supabase.from('recipe_variants').select('*, recipe:recipes(name)').order('label'),
    fetchStorageLocations(),
    supabase.from('recipe_variant_stock').select('variant_id, location_id, quantity, min_threshold'),
  ]);
  if (error) throw error;
  if (stockError) throw stockError;

  return (variants ?? []).map((variant: any) => ({
    id: variant.id,
    recipe_id: variant.recipe_id,
    label: variant.label,
    total_weight: variant.total_weight,
    portions: variant.portions,
    recipe_name: variant.recipe?.name ?? '—',
    stock: buildStockByLocation((stockRows ?? []).filter((r) => r.variant_id === variant.id), locations),
  }));
}

/**
 * Recupera tutte le ricette con le loro varianti, e per ogni variante gli
 * ingredienti/componenti che la compongono con relativo costo calcolato.
 * È la query più complessa dell'app: fa 4 chiamate (ricette, varianti,
 * componenti, ingredienti-di-variante) e le "incolla" insieme in memoria
 * invece di fare tante piccole query annidate una per ricetta.
 */
export async function fetchRecipes(): Promise<RecipeWithVariants[]> {
  const { data: recipes, error: recipesError } = await supabase.from('recipes').select('*').order('name');
  if (recipesError) throw recipesError;
  if (!recipes || recipes.length === 0) return [];

  const recipeIds = recipes.map((r) => r.id);

  const [{ data: variants, error: variantsError }, components] = await Promise.all([
    supabase.from('recipe_variants').select('*').in('recipe_id', recipeIds),
    fetchComponents(),
  ]);
  if (variantsError) throw variantsError;

  const componentById = new Map<string, ComponentWithCost>(components.map((c) => [c.id, c]));
  const variantIds = (variants ?? []).map((v) => v.id);

  // Se non ci sono varianti non ha senso interrogare le loro righe ingrediente
  // (e Supabase darebbe comunque errore con un `.in(...)` su un array vuoto).
  const { data: variantIngredients, error: viError } =
    variantIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('recipe_variant_ingredients')
          .select('*, ingredient:ingredients(*)')
          .in('variant_id', variantIds);
  if (viError) throw viError;

  return recipes.map((recipe: Recipe) => {
    const recipeVariants = (variants ?? [])
      .filter((v) => v.recipe_id === recipe.id)
      .map((variant: RecipeVariant) => {
        const rows = (variantIngredients ?? []).filter((vi) => vi.variant_id === variant.id) as (RecipeVariantIngredient & {
          ingredient: Ingredient | null;
        })[];

        // Ogni riga ingrediente di una variante punta ALTERNATIVAMENTE a un
        // ingrediente semplice oppure a un componente/semilavorato: si calcola
        // il costo di quella riga usando quale dei due è effettivamente presente.
        const lines: RecipeVariantLine[] = rows.map((row) => {
          if (row.ingredient_id && row.ingredient) {
            return { ...row, ingredient: row.ingredient, component: null, cost: row.quantity * row.ingredient.cost_per_unit };
          }
          const component = row.component_id ? componentById.get(row.component_id) ?? null : null;
          return { ...row, ingredient: null, component, cost: component ? row.quantity * component.costPerUnit : 0 };
        });

        const cost = lines.reduce((sum, l) => sum + l.cost, 0);
        return { ...variant, ingredients: lines, cost };
      });

    // Il costo/margine "di riferimento" della ricetta (mostrato nell'elenco)
    // è quello della sua PRIMA variante, non una media di tutte.
    const referenceCost = recipeVariants[0]?.cost ?? 0;
    const margin = recipe.sell_price - referenceCost;
    const marginPct = recipe.sell_price > 0 ? (margin / recipe.sell_price) * 100 : 0;

    return { ...recipe, variants: recipeVariants, cost: referenceCost, margin, marginPct };
  });
}

/** Una riga ingrediente/componente di una variante, ancora "in bozza" (prima del salvataggio). */
export type VariantIngredientDraft =
  | { ingredient_id: string; component_id?: undefined; quantity: number }
  | { ingredient_id?: undefined; component_id: string; quantity: number };

/** Una variante ancora "in bozza", come compilata nel form di EditRecipeModal. */
export interface VariantDraft {
  /** Assente per una variante nuova, presente per una già esistente che si sta modificando. */
  id?: string;
  label: string;
  total_weight: number;
  portions: number;
  ingredients: VariantIngredientDraft[];
}

/** Dati del form di creazione/modifica ricetta (vedi EditRecipeModal). */
export interface RecipeFormValues {
  id?: string;
  name: string;
  category: string;
  description: string | null;
  sell_price: number;
  variants: VariantDraft[];
}

/**
 * Crea o aggiorna una ricetta e tutte le sue varianti in un colpo. Per le
 * varianti già esistenti (quelle rimosse dal form rispetto a quanto salvato
 * in precedenza) le elimina dal database; per tutte le altre fa un upsert e
 * poi RISCRIVE da zero le righe ingrediente di quella variante (le elimina e
 * le re-inserisce, più semplice che calcolare un "diff" riga per riga).
 */
export async function upsertRecipe(owner_id: string, values: RecipeFormValues): Promise<Recipe> {
  const { data: recipe, error } = await supabase
    .from('recipes')
    .upsert({
      id: values.id,
      owner_id,
      name: values.name,
      category: values.category,
      description: values.description,
      sell_price: values.sell_price,
    })
    .select()
    .single();
  if (error) throw error;

  // Se si sta modificando una ricetta esistente, elimina le varianti che
  // c'erano prima ma non sono più presenti nel form (l'utente le ha rimosse).
  if (values.id) {
    const { data: existingVariants } = await supabase.from('recipe_variants').select('id').eq('recipe_id', recipe.id);
    const keptIds = values.variants.filter((v) => v.id).map((v) => v.id);
    const toDelete = (existingVariants ?? []).map((v) => v.id).filter((id) => !keptIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('recipe_variants').delete().in('id', toDelete);
    }
  }

  for (const variant of values.variants) {
    const { data: savedVariant, error: variantError } = await supabase
      .from('recipe_variants')
      .upsert({ id: variant.id, recipe_id: recipe.id, label: variant.label, total_weight: variant.total_weight, portions: variant.portions })
      .select()
      .single();
    if (variantError) throw variantError;

    // Riscrive da zero gli ingredienti di questa variante.
    await supabase.from('recipe_variant_ingredients').delete().eq('variant_id', savedVariant.id);
    if (variant.ingredients.length > 0) {
      const { error: viError } = await supabase.from('recipe_variant_ingredients').insert(
        variant.ingredients.map((i) => ({
          variant_id: savedVariant.id,
          ingredient_id: i.ingredient_id ?? null,
          component_id: i.component_id ?? null,
          quantity: i.quantity,
        }))
      );
      if (viError) throw viError;
    }
  }

  return recipe as Recipe;
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}
