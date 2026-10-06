import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { useComponents } from '@/features/components/hooks';
import { useStorageLocations } from '@/features/ingredients/hooks';
import { useRecipes } from '@/features/recipes/hooks';
import { useTranslation } from '@/i18n';
import type { ProductionType } from '@/types/database';

import type { WorkPlanTaskWithDetails } from './api';
import { useUpsertWorkPlanTask } from './hooks';

// 'none' in più rispetto a ProductionType: rappresenta "task semplice, non è una produzione".
type ProductionChoice = 'none' | ProductionType;

/**
 * Modale di creazione/modifica di un task del Piano di lavoro. Il pezzo
 * centrale del form è la scelta "Legato a una produzione?":
 * - "No, task semplice": basta un titolo (e note opzionali).
 * - "Componente": bisogna scegliere quale componente/semilavorato produrre.
 * - "Variante di ricetta": bisogna scegliere quale variante produrre.
 * Per queste ultime due si aggiungono anche quantità da produrre e magazzino
 * di destinazione, obbligatori per poter salvare.
 */
export function EditWorkPlanTaskModal({
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
  const { data: components = [] } = useComponents();
  const { data: recipes = [] } = useRecipes();
  const { data: locations = [] } = useStorageLocations();
  const upsert = useUpsertWorkPlanTask(date);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [productionChoice, setProductionChoice] = useState<ProductionChoice>('none');
  const [componentId, setComponentId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [targetLocationId, setTargetLocationId] = useState<string | null>(null);

  // "Appiattisce" tutte le varianti di tutte le ricette in un'unica lista per
  // il menu a tendina, con etichetta "NomeRicetta — NomeVariante" per distinguerle.
  const variantOptions = useMemo(
    () => recipes.flatMap((r) => r.variants.map((v) => ({ label: `${r.name} — ${v.label}`, value: v.id }))),
    [recipes]
  );

  useEffect(() => {
    if (!visible) return;
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? '');
      setProductionChoice(task.production_type ?? 'none');
      setComponentId(task.component_id);
      setVariantId(task.variant_id);
      setQuantity(task.quantity ? String(task.quantity) : '');
      setTargetLocationId(task.target_location_id);
    } else {
      setTitle('');
      setNotes('');
      setProductionChoice('none');
      setComponentId(null);
      setVariantId(null);
      setQuantity('');
      setTargetLocationId(locations[0]?.id ?? null);
    }
  }, [visible, task, locations]);

  const isProduction = productionChoice !== 'none';
  // Un task semplice richiede solo il titolo; un task di produzione richiede
  // anche componente/variante scelti, una quantità positiva e un magazzino di destinazione.
  const canSave =
    title.trim().length > 0 &&
    (!isProduction ||
      (productionChoice === 'component' ? !!componentId : !!variantId) &&
        Number(quantity) > 0 &&
        !!targetLocationId);

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: task?.id,
      task_date: date,
      title: title.trim(),
      notes: notes.trim() || null,
      production_type: isProduction ? (productionChoice as ProductionType) : null,
      component_id: productionChoice === 'component' ? componentId : null,
      variant_id: productionChoice === 'recipe_variant' ? variantId : null,
      quantity: isProduction ? Number(quantity.replace(',', '.')) || 0 : null,
      target_location_id: isProduction ? targetLocationId : null,
    });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={task ? t.workPlan.editTask : t.workPlan.addTask}
      footer={
        <>
          <Button label={t.recipes.cancel} variant="ghost" onPress={onClose} />
          <Button label={t.recipes.save} onPress={handleSave} loading={upsert.isPending} disabled={!canSave} />
        </>
      }>
      <TextField label={t.workPlan.taskTitle} value={title} onChangeText={setTitle} />
      <TextField label={t.orders.notes} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />

      <Select
        label={t.workPlan.productionType}
        value={productionChoice}
        options={[
          { label: t.workPlan.noProduction, value: 'none' },
          { label: t.recipes.componentSource, value: 'component' },
          { label: t.workPlan.recipeVariant, value: 'recipe_variant' },
        ]}
        onChange={(v) => setProductionChoice(v as ProductionChoice)}
      />

      {/* Il secondo selettore compare solo dopo aver scelto il TIPO di produzione, mai entrambi insieme */}
      {productionChoice === 'component' && (
        <Select
          label={t.recipes.componentSource}
          value={componentId}
          options={components.map((c) => ({ label: c.name, value: c.id }))}
          onChange={setComponentId}
        />
      )}

      {productionChoice === 'recipe_variant' && (
        <Select label={t.workPlan.recipeVariant} value={variantId} options={variantOptions} onChange={setVariantId} />
      )}

      {isProduction && (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <View style={{ flex: 1 }}>
            <TextField
              label={t.workPlan.quantityToProduce}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Select
              label={t.workPlan.targetLocation}
              value={targetLocationId}
              options={locations.map((l) => ({ label: t.ingredients[l.type], value: l.id }))}
              onChange={setTargetLocationId}
            />
          </View>
        </View>
      )}
    </AppModal>
  );
}
