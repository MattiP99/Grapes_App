import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types/database';

/** Un ordine con anche il nome della ricetta/variante collegata già "appiattiti" (join fatto dal database). */
export interface OrderWithRecipe extends Order {
  recipe: { id: string; name: string } | null;
  variant: { id: string; label: string } | null;
}

/** Tutti gli ordini, ordinati per data di ritiro (dal più vecchio/vicino al più lontano). */
export async function fetchOrders(): Promise<OrderWithRecipe[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, recipe:recipes(id, name), variant:recipe_variants(id, label)')
    .order('pickup_date');
  if (error) throw error;
  return (data ?? []) as unknown as OrderWithRecipe[];
}

/** Dati del form di creazione/modifica ordine (vedi EditOrderModal). */
export interface OrderFormValues {
  id?: string;
  customer_name: string;
  cake_name: string;
  // La ricetta/variante collegata sono opzionali: un ordine può anche essere "libero"
  // (una torta non presente a catalogo, descritta solo dal nome in `cake_name`).
  recipe_id: string | null;
  variant_id: string | null;
  quantity: number;
  pickup_date: string;
  status: OrderStatus;
  total_price: number;
  notes: string | null;
}

export async function upsertOrder(owner_id: string, values: OrderFormValues): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .upsert({ ...values, owner_id })
    .select()
    .single();
  if (error) throw error;
  return data as Order;
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
}
