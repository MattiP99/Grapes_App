import { supabase } from '@/lib/supabase';
import type { ProductionType, WorkPlanTask } from '@/types/database';

export interface WorkPlanTaskWithDetails extends WorkPlanTask {
  component: { name: string; unit: string } | null;
  variant: { label: string; recipe: { name: string } | null } | null;
  target_location: { name: string } | null;
}

export async function fetchWorkPlanTasks(date: string): Promise<WorkPlanTaskWithDetails[]> {
  const { data, error } = await supabase
    .from('work_plan_tasks')
    .select('*, component:components(name, unit), variant:recipe_variants(label, recipe:recipes(name)), target_location:storage_locations(name)')
    .eq('task_date', date)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as unknown as WorkPlanTaskWithDetails[];
}

export interface WorkPlanTaskFormValues {
  id?: string;
  task_date: string;
  title: string;
  notes: string | null;
  production_type: ProductionType | null;
  component_id: string | null;
  variant_id: string | null;
  quantity: number | null;
  target_location_id: string | null;
}

export async function upsertWorkPlanTask(owner_id: string, values: WorkPlanTaskFormValues) {
  const { error } = await supabase.from('work_plan_tasks').upsert({ ...values, owner_id });
  if (error) throw error;
}

export async function deleteWorkPlanTask(id: string) {
  const { error } = await supabase.from('work_plan_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function completeWorkPlanTask(taskId: string, sourceLocationId: string) {
  const { error } = await supabase.rpc('complete_work_plan_task', {
    p_task_id: taskId,
    p_source_location_id: sourceLocationId,
  });
  if (error) throw error;
}
