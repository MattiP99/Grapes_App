import { supabase } from '@/lib/supabase';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, StorageLocationType } from '@/types/database';

export interface PurchaseOrderItemWithIngredient extends PurchaseOrderItem {
  ingredient: { name: string; unit: string } | null;
  location: { name: string; type: StorageLocationType } | null;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItemWithIngredient[];
}

/** Tutti gli ordini fornitore, dal più recente al più vecchio, ciascuno con le sue righe prodotto. */
export async function fetchPurchaseOrders(): Promise<PurchaseOrderWithItems[]> {
  const { data: orders, error } = await supabase.from('purchase_orders').select('*').order('order_date', { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from('purchase_order_items')
    .select('*, ingredient:ingredients(name, unit), location:storage_locations(name, type)')
    .in('purchase_order_id', orders.map((o) => o.id));
  if (itemsError) throw itemsError;

  return orders.map((order: PurchaseOrder) => ({
    ...order,
    items: (items ?? []).filter((i) => i.purchase_order_id === order.id) as unknown as PurchaseOrderItemWithIngredient[],
  }));
}

export interface PurchaseOrderItemDraft {
  ingredient_id: string;
  quantity: number;
  location_id: string;
  unit_cost: number | null;
}

/** Dati del form di creazione/modifica ordine fornitore (vedi EditPurchaseOrderModal). */
export interface PurchaseOrderFormValues {
  id?: string;
  supplier: string;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItemDraft[];
}

/** Crea o aggiorna un ordine fornitore e riscrive da zero le sue righe prodotto. */
export async function upsertPurchaseOrder(owner_id: string, values: PurchaseOrderFormValues) {
  const { data: order, error } = await supabase
    .from('purchase_orders')
    .upsert({
      id: values.id,
      owner_id,
      supplier: values.supplier,
      order_date: values.order_date,
      expected_date: values.expected_date,
      notes: values.notes,
      status: values.status,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
  if (values.items.length > 0) {
    const { error: itemsError } = await supabase.from('purchase_order_items').insert(
      values.items.map((item) => ({ purchase_order_id: order.id, ...item }))
    );
    if (itemsError) throw itemsError;
  }

  return order as PurchaseOrder;
}

export async function deletePurchaseOrder(id: string) {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Segna l'ordine come "arrivato". Come per `moveStock`, questa operazione
 * chiama una funzione del database ("receive_purchase_order", vedi
 * supabase/schema.sql) che in un colpo solo cambia lo stato dell'ordine E
 * aggiunge le quantità acquistate alle scorte dei magazzini di destinazione —
 * tutto o niente, per non rischiare di aggiornare solo una delle due cose.
 */
export async function receivePurchaseOrder(id: string) {
  const { error } = await supabase.rpc('receive_purchase_order', { p_order_id: id });
  if (error) throw error;
}
