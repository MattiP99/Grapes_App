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

/** Tutte le varianti di ricetta (di tutte le ricette) con lo stock di prodotto finito per location. */
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

    const referenceCost = recipeVariants[0]?.cost ?? 0;
    const margin = recipe.sell_price - referenceCost;
    const marginPct = recipe.sell_price > 0 ? (margin / recipe.sell_price) * 100 : 0;

    return { ...recipe, variants: recipeVariants, cost: referenceCost, margin, marginPct };
  });
}

export type VariantIngredientDraft =
  | { ingredient_id: string; component_id?: undefined; quantity: number }
  | { ingredient_id?: undefined; component_id: string; quantity: number };

export interface VariantDraft {
  id?: string;
  label: string;
  total_weight: number;
  portions: number;
  ingredients: VariantIngredientDraft[];
}

export interface RecipeFormValues {
  id?: string;
  name: string;
  category: string;
  description: string | null;
  sell_price: number;
  variants: VariantDraft[];
}

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
