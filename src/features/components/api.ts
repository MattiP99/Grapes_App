import { fetchStorageLocations } from '@/features/ingredients/api';
import { buildStockByLocation } from '@/lib/stock';
import { supabase } from '@/lib/supabase';
import type { Component, ComponentIngredient, ComponentWithCost, ComponentWithStock, Ingredient } from '@/types/database';

/** Componenti con costo calcolato e stock prodotto/immagazzinato per location. */
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
    const costPerUnit = component.batch_yield > 0 ? totalCost / component.batch_yield : 0;
    return { ...component, ingredients, totalCost, costPerUnit };
  });
}

export interface ComponentIngredientDraft {
  ingredient_id: string;
  quantity: number;
}

export interface ComponentFormValues {
  id?: string;
  name: string;
  unit: string;
  batch_yield: number;
  ingredients: ComponentIngredientDraft[];
}

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
