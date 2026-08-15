import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { StorageLocation } from '@/types/database';

import {
  deleteIngredient,
  fetchIngredients,
  fetchStorageLocations,
  moveStock,
  upsertIngredient,
  type IngredientFormValues,
} from './api';

export function useStorageLocations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.storageLocations,
    enabled: !!user,
    queryFn: fetchStorageLocations,
  });
}

export function useIngredients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.ingredients,
    enabled: !!user,
    queryFn: fetchIngredients,
  });
}

function useInvalidateIngredients() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
}

export function useUpsertIngredient() {
  const { user } = useAuth();
  const invalidate = useInvalidateIngredients();
  const { data: locations = [] } = useStorageLocations();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: IngredientFormValues) => upsertIngredient(user!.id, values, locations as StorageLocation[]),
    onSuccess: () => {
      invalidate();
      // il costo/unità di un ingrediente incide sul costo di componenti e ricette che lo usano
      queryClient.invalidateQueries({ queryKey: queryKeys.components });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    },
  });
}

export function useDeleteIngredient() {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: (id: string) => deleteIngredient(id),
    onSuccess: invalidate,
  });
}

export function useMoveStock() {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: moveStock,
    onSuccess: invalidate,
  });
}
