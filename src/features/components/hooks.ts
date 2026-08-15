import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { deleteComponent, fetchComponents, fetchComponentsWithStock, upsertComponent, type ComponentFormValues } from './api';

export function useComponents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.components,
    enabled: !!user,
    queryFn: fetchComponents,
  });
}

export function useComponentsWithStock() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.componentStock,
    enabled: !!user,
    queryFn: fetchComponentsWithStock,
  });
}

export function useUpsertComponent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ComponentFormValues) => upsertComponent(user!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components });
      // il costo/unità di un componente incide sul costo delle ricette che lo usano
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    },
  });
}

export function useDeleteComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComponent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    },
  });
}
