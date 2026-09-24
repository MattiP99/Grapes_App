import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import {
  deletePurchaseOrder,
  fetchPurchaseOrders,
  receivePurchaseOrder,
  upsertPurchaseOrder,
  type PurchaseOrderFormValues,
} from './api';

export function usePurchaseOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.purchaseOrders,
    enabled: !!user,
    queryFn: fetchPurchaseOrders,
  });
}

function useInvalidatePurchaseOrders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders });
}

export function useUpsertPurchaseOrder() {
  const { user } = useAuth();
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (values: PurchaseOrderFormValues) => upsertPurchaseOrder(user!.id, values),
    onSuccess: invalidate,
  });
}

export function useDeletePurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  return useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: invalidate,
  });
}

/** Segna un ordine come arrivato: oltre agli ordini, invalida anche ingredienti (le scorte sono cambiate) e lo storico costi. */
export function useReceivePurchaseOrder() {
  const invalidate = useInvalidatePurchaseOrders();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => receivePurchaseOrder(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      queryClient.invalidateQueries({ queryKey: queryKeys.costHistory });
    },
  });
}
