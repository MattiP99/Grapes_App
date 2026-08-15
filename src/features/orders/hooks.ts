import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { deleteOrder, fetchOrders, upsertOrder, type OrderFormValues } from './api';

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders,
    enabled: !!user,
    queryFn: fetchOrders,
  });
}

function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.orders });
}

export function useUpsertOrder() {
  const { user } = useAuth();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (values: OrderFormValues) => upsertOrder(user!.id, values),
    onSuccess: invalidate,
  });
}

export function useDeleteOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: invalidate,
  });
}
