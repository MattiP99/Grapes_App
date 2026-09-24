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

/**
 * Questo file adatta le funzioni "grezze" di `api.ts` (chiamate dirette a
 * Supabase) al mondo di React Query: ogni `useQuery` gestisce da solo cache,
 * stato di caricamento ed errori; ogni `useMutation` esegue una scrittura e
 * poi invalida le query che potrebbero essere diventate "vecchie" a causa di
 * quella scrittura, così la UI si aggiorna da sola senza bisogno di ricaricare
 * manualmente la pagina.
 */

export function useStorageLocations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.storageLocations,
    // `enabled: !!user` evita di interrogare Supabase prima che ci sia un utente loggato.
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

/** Scorciatoia per invalidare (= "segna come da ricaricare") la lista ingredienti. */
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
      // Il costo/unità di un ingrediente incide sul costo dei componenti e delle
      // ricette che lo usano, quindi vanno ricalcolati anche loro.
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
