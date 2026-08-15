import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { fetchCostHistory } from './api';

export function useCostHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.costHistory,
    enabled: !!user,
    queryFn: fetchCostHistory,
  });
}
