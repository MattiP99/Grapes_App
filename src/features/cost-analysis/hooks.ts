import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { fetchCostHistory } from './api';

/** Storico dei costi ingredienti, usato dai grafici della pagina Analisi costi. */
export function useCostHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.costHistory,
    enabled: !!user,
    queryFn: fetchCostHistory,
  });
}
