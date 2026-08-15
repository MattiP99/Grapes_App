import { supabase } from '@/lib/supabase';

export interface CostHistoryRow {
  ingredient_id: string;
  ingredient_name: string;
  cost: number;
  recorded_at: string;
}

export async function fetchCostHistory(): Promise<CostHistoryRow[]> {
  const { data, error } = await supabase
    .from('cost_history')
    .select('ingredient_id, cost, recorded_at, ingredient:ingredients(name)')
    .order('recorded_at');
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ingredient_id: row.ingredient_id,
    ingredient_name: row.ingredient?.name ?? '—',
    cost: row.cost,
    recorded_at: row.recorded_at,
  }));
}
