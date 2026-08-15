import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export const queryKeys = {
  ingredients: ['ingredients'] as const,
  ingredientStock: ['ingredient-stock'] as const,
  storageLocations: ['storage-locations'] as const,
  recipes: ['recipes'] as const,
  components: ['components'] as const,
  orders: ['orders'] as const,
  costHistory: ['cost-history'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  workPlanTasks: (date: string) => ['work-plan-tasks', date] as const,
  purchaseOrders: ['purchase-orders'] as const,
  componentStock: ['component-stock'] as const,
  recipeVariantStock: ['recipe-variant-stock'] as const,
};
