import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { deleteRecipe, fetchRecipeVariantsWithStock, fetchRecipes, upsertRecipe, type RecipeFormValues } from './api';

export function useRecipes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.recipes,
    enabled: !!user,
    queryFn: fetchRecipes,
  });
}

export function useRecipeVariantsWithStock() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.recipeVariantStock,
    enabled: !!user,
    queryFn: fetchRecipeVariantsWithStock,
  });
}

function useInvalidateRecipes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
}

export function useUpsertRecipe() {
  const { user } = useAuth();
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (values: RecipeFormValues) => upsertRecipe(user!.id, values),
    onSuccess: invalidate,
  });
}

export function useDeleteRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: invalidate,
  });
}
