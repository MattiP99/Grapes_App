import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useStorageLocations } from '@/features/ingredients/hooks';
import { useTranslation } from '@/i18n';

import type { WorkPlanTaskWithDetails } from './api';
import { useCompleteWorkPlanTask } from './hooks';

export function CompleteTaskModal({
  visible,
  onClose,
  task,
  date,
}: {
  visible: boolean;
  onClose: () => void;
  task: WorkPlanTaskWithDetails | null;
  date: string;
}) {
  const t = useTranslation();
  const { data: locations = [] } = useStorageLocations();
  const complete = useCompleteWorkPlanTask(date);
  const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setSourceLocationId(locations[0]?.id ?? null);
  }, [visible, locations]);

  if (!task) return null;

  const handleConfirm = async () => {
    if (!sourceLocationId) return;
    try {
      await complete.mutateAsync({ taskId: task.id, sourceLocationId });
      onClose();
    } catch (err: any) {
      Alert.alert(t.workPlan.completeError, err?.message ?? t.common.error);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={t.workPlan.completeTask}
      footer={
        <>
          <Button label={t.recipes.cancel} variant="ghost" onPress={onClose} />
          <Button
            label={t.workPlan.confirmComplete}
            onPress={handleConfirm}
            loading={complete.isPending}
            disabled={!sourceLocationId}
          />
        </>
      }>
      <ThemedText>{t.workPlan.completeHint.replace('{title}', task.title)}</ThemedText>

      <Select
        label={t.workPlan.sourceLocation}
        value={sourceLocationId}
        options={locations.map((l) => ({ label: l.name, value: l.id }))}
        onChange={setSourceLocationId}
      />
    </AppModal>
  );
}
