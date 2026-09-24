import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import {
  completeWorkPlanTask,
  deleteWorkPlanTask,
  fetchWorkPlanTasks,
  upsertWorkPlanTask,
  type WorkPlanTaskFormValues,
} from './api';

/** Task del giorno `date`. Nota: la queryKey include la data, quindi ogni giorno ha la sua cache separata. */
export function useWorkPlanTasks(date: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.workPlanTasks(date),
    enabled: !!user,
    queryFn: () => fetchWorkPlanTasks(date),
  });
}

export function useUpsertWorkPlanTask(date: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: WorkPlanTaskFormValues) => upsertWorkPlanTask(user!.id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workPlanTasks(date) }),
  });
}

export function useDeleteWorkPlanTask(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkPlanTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workPlanTasks(date) }),
  });
}

/** Completa un task di produzione: invalida i task del giorno E tutte le scorte che possono essere cambiate (ingredienti, componenti, varianti). */
export function useCompleteWorkPlanTask(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, sourceLocationId }: { taskId: string; sourceLocationId: string }) =>
      completeWorkPlanTask(taskId, sourceLocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workPlanTasks(date) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      queryClient.invalidateQueries({ queryKey: queryKeys.componentStock });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipeVariantStock });
    },
  });
}
