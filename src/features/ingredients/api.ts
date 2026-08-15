import { supabase } from '@/lib/supabase';
import type { Ingredient, IngredientWithStock, StorageLocation, StorageLocationType } from '@/types/database';

export async function fetchStorageLocations(): Promise<StorageLocation[]> {
  const { data, error } = await supabase.from('storage_locations').select('id, name, type');
  if (error) throw error;
  const order: Record<StorageLocationType, number> = { fridge: 0, freezer: 1, pantry: 2 };
  return [...data].sort((a, b) => order[a.type as StorageLocationType] - order[b.type as StorageLocationType]);
}

export async function fetchIngredients(): Promise<IngredientWithStock[]> {
  const [{ data: ingredients, error: ingredientsError }, locations] = await Promise.all([
    supabase.from('ingredients').select('*').order('name'),
    fetchStorageLocations(),
  ]);
  if (ingredientsError) throw ingredientsError;

  const { data: stockRows, error: stockError } = await supabase
    .from('ingredient_stock')
    .select('ingredient_id, location_id, quantity, min_threshold');
  if (stockError) throw stockError;

  const locationById = new Map(locations.map((l) => [l.id, l]));

  return (ingredients ?? []).map((ingredient: Ingredient) => {
    const stock: IngredientWithStock['stock'] = { fridge: undefined, freezer: undefined, pantry: undefined };
    for (const row of stockRows ?? []) {
      if (row.ingredient_id !== ingredient.id) continue;
      const location = locationById.get(row.location_id);
      if (!location) continue;
      stock[location.type] = { quantity: row.quantity, min_threshold: row.min_threshold };
    }
    return { ...ingredient, stock };
  });
}

export interface IngredientFormValues {
  id?: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier: string | null;
  stock: Partial<Record<StorageLocationType, { quantity: number; min_threshold: number }>>;
}

export async function upsertIngredient(owner_id: string, values: IngredientFormValues, locations: StorageLocation[]) {
  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .upsert({
      id: values.id,
      owner_id,
      name: values.name,
      unit: values.unit,
      cost_per_unit: values.cost_per_unit,
      supplier: values.supplier,
    })
    .select()
    .single();
  if (error) throw error;

  const stockRows = locations
    .map((location) => {
      const entry = values.stock[location.type];
      if (!entry) return null;
      return {
        ingredient_id: ingredient.id,
        location_id: location.id,
        quantity: entry.quantity,
        min_threshold: entry.min_threshold,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (stockRows.length > 0) {
    const { error: stockError } = await supabase
      .from('ingredient_stock')
      .upsert(stockRows, { onConflict: 'ingredient_id,location_id' });
    if (stockError) throw stockError;
  }

  return ingredient as Ingredient;
}

export async function deleteIngredient(id: string) {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw error;
}

export async function moveStock(params: {
  ingredientId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
}) {
  const { error } = await supabase.rpc('move_stock', {
    p_ingredient_id: params.ingredientId,
    p_from_location: params.fromLocationId,
    p_to_location: params.toLocationId,
    p_quantity: params.quantity,
  });
  if (error) throw error;
}
