import { fetchStorageLocations } from '@/features/ingredients/api';
import { buildStockByLocation } from '@/lib/stock';
import { supabase } from '@/lib/supabase';
import type { Component, ComponentIngredient, ComponentWithCost, ComponentWithStock, Ingredient } from '@/types/database';

/**
 * Componenti (semilavorati) con costo calcolato E quantità già pronte in
 * magazzino (usato dal Piano di lavoro, dove si scelgono componenti da
 * produrre in base a quanti ne restano già fatti).
 */
export async function fetchComponentsWithStock(): Promise<ComponentWithStock[]> {
  const [components, locations, { data: stockRows, error: stockError }] = await Promise.all([
    fetchComponents(),
    fetchStorageLocations(),
    supabase.from('component_stock').select('component_id, location_id, quantity, min_threshold'),
  ]);
  if (stockError) throw stockError;

  return components.map((component) => ({
    ...component,
    stock: buildStockByLocation((stockRows ?? []).filter((r) => r.component_id === component.id), locations),
  }));
}

/**
 * Recupera tutti i componenti (semilavorati) con il costo totale e per-unità
 * calcolato dagli ingredienti che li compongono. Usato dalla pagina Ricette
 * (tab Componenti) e da qui, dalle ricette che li usano nelle loro varianti.
 */
export async function fetchComponents(): Promise<ComponentWithCost[]> {
  const { data: components, error } = await supabase.from('components').select('*').order('name');
  if (error) throw error;
  if (!components || components.length === 0) return [];

  const componentIds = components.map((c) => c.id);
  const { data: componentIngredients, error: ciError } = await supabase
    .from('component_ingredients')
    .select('*, ingredient:ingredients(*)')
    .in('component_id', componentIds);
  if (ciError) throw ciError;

  return components.map((component: Component) => {
    const ingredients = (componentIngredients ?? []).filter((ci) => ci.component_id === component.id) as (ComponentIngredient & {
      ingredient: Ingredient;
    })[];
    const totalCost = ingredients.reduce((sum, i) => sum + i.quantity * i.ingredient.cost_per_unit, 0);
    // Il costo totale di un'infornata (`batch_yield` pezzi) diviso per pezzo.
    const costPerUnit = component.batch_yield > 0 ? totalCost / component.batch_yield : 0;
    return { ...component, ingredients, totalCost, costPerUnit };
  });
}

export interface ComponentIngredientDraft {
  ingredient_id: string;
  quantity: number;
}

/** Dati del form di creazione/modifica componente (vedi EditComponentModal). */
export interface ComponentFormValues {
  id?: string;
  name: string;
  unit: string;
  /** Quanti pezzi/unità produce UNA infornata di questo componente (serve per calcolare il costo per unità). */
  batch_yield: number;
  ingredients: ComponentIngredientDraft[];
}

/** Crea o aggiorna un componente e riscrive da zero la sua lista ingredienti. */
export async function upsertComponent(owner_id: string, values: ComponentFormValues): Promise<Component> {
  const { data: component, error } = await supabase
    .from('components')
    .upsert({ id: values.id, owner_id, name: values.name, unit: values.unit, batch_yield: values.batch_yield })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('component_ingredients').delete().eq('component_id', component.id);
  if (values.ingredients.length > 0) {
    const { error: ciError } = await supabase.from('component_ingredients').insert(
      values.ingredients.map((i) => ({ component_id: component.id, ingredient_id: i.ingredient_id, quantity: i.quantity }))
    );
    if (ciError) throw ciError;
  }

  return component as Component;
}

export async function deleteComponent(id: string) {
  const { error } = await supabase.from('components').delete().eq('id', id);
  if (error) throw error;
}
