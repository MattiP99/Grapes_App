import { supabase } from '@/lib/supabase';

/** Uno "scatto" storico del costo di un ingrediente in un momento preciso. */
export interface CostHistoryRow {
  ingredient_id: string;
  ingredient_name: string;
  cost: number;
  recorded_at: string;
}

/**
 * Legge tutto lo storico dei costi (tabella "cost_history"), popolata nel
 * tempo — ogni volta che il costo di un ingrediente viene registrato/aggiornato
 * (es. quando arriva un acquisto) se ne salva uno snapshot qui, invece di
 * sovrascrivere il valore precedente. Questo storico alimenta i grafici della
 * pagina Analisi costi.
 */
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
