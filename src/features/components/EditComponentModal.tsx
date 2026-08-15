import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { INGREDIENT_UNITS } from '@/constants/units';
import { useIngredients } from '@/features/ingredients/hooks';
import { useTranslation } from '@/i18n';
import type { ComponentWithCost } from '@/types/database';

import { useUpsertComponent } from './hooks';

let tempIdCounter = 0;
function tempId() {
  tempIdCounter += 1;
  return `tmp-${Date.now()}-${tempIdCounter}`;
}

interface IngredientLine {
  key: string;
  ingredient_id: string | null;
  quantity: string;
}

export function EditComponentModal({
  visible,
  onClose,
  component,
}: {
  visible: boolean;
  onClose: () => void;
  component: ComponentWithCost | null;
}) {
  const t = useTranslation();
  const { data: ingredients = [] } = useIngredients();
  const upsert = useUpsertComponent();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<string>('kg');
  const [batchYield, setBatchYield] = useState('');
  const [lines, setLines] = useState<IngredientLine[]>([]);

  useEffect(() => {
    if (!visible) return;
    if (component) {
      setName(component.name);
      setUnit(component.unit);
      setBatchYield(String(component.batch_yield));
      setLines(
        component.ingredients.map((i) => ({ key: i.id, ingredient_id: i.ingredient_id, quantity: String(i.quantity) }))
      );
    } else {
      setName('');
      setUnit('kg');
      setBatchYield('');
      setLines([]);
    }
  }, [visible, component]);

  const ingredientOptions = ingredients.map((i) => ({ label: `${i.name} (${i.unit})`, value: i.id }));

  const addLine = () => setLines((ls) => [...ls, { key: tempId(), ingredient_id: ingredients[0]?.id ?? null, quantity: '' }]);
  const updateLine = (key: string, patch: Partial<IngredientLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const preview = useMemo(() => {
    const totalCost = lines.reduce((sum, l) => {
      const ingredient = ingredients.find((i) => i.id === l.ingredient_id);
      const quantity = Number(l.quantity.replace(',', '.')) || 0;
      return sum + quantity * (ingredient?.cost_per_unit ?? 0);
    }, 0);
    const yieldValue = Number(batchYield.replace(',', '.')) || 0;
    const costPerUnit = yieldValue > 0 ? totalCost / yieldValue : 0;
    return { totalCost, costPerUnit };
  }, [lines, ingredients, batchYield]);

  const canSave = name.trim().length > 0 && Number(batchYield) > 0 && lines.length > 0;

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: component?.id,
      name: name.trim(),
      unit,
      batch_yield: Number(batchYield.replace(',', '.')) || 0,
      ingredients: lines
        .filter((l) => l.ingredient_id && Number(l.quantity) > 0)
        .map((l) => ({ ingredient_id: l.ingredient_id!, quantity: Number(l.quantity.replace(',', '.')) })),
    });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={component ? t.components.edit : t.components.add}
      footer={
        <>
          <Button label={t.recipes.cancel} variant="ghost" onPress={onClose} />
          <Button label={t.recipes.save} onPress={handleSave} loading={upsert.isPending} disabled={!canSave} />
        </>
      }>
      <TextField label={t.components.name} value={name} onChangeText={setName} placeholder={t.components.namePlaceholder} />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Select
            label={t.ingredients.unit}
            value={unit as any}
            options={INGREDIENT_UNITS.map((u) => ({ label: u, value: u }))}
            onChange={setUnit}
          />
        </View>
        <View style={styles.flex1}>
          <TextField
            label={t.components.batchYield}
            value={batchYield}
            onChangeText={setBatchYield}
            keyboardType="decimal-pad"
            hint={t.components.batchYieldHint}
          />
        </View>
      </View>

      <View style={styles.ingredientsHeader}>
        <ThemedText type="label" themeColor="textSecondary">
          {t.recipes.ingredients}
        </ThemedText>
        <IconButton icon="plus" onPress={addLine} />
      </View>

      {lines.map((line) => (
        <View key={line.key} style={styles.ingredientRow}>
          <View style={styles.flex2}>
            <Select
              value={line.ingredient_id}
              options={ingredientOptions}
              onChange={(v) => updateLine(line.key, { ingredient_id: v })}
              placeholder={t.recipes.ingredients}
            />
          </View>
          <TextField
            value={line.quantity}
            onChangeText={(v) => updateLine(line.key, { quantity: v })}
            keyboardType="decimal-pad"
            style={styles.quantityInput}
          />
          <IconButton icon="trash-2" onPress={() => removeLine(line.key)} />
        </View>
      ))}

      <View style={styles.previewRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {t.components.costPreview}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="accent">
          €{preview.totalCost.toFixed(2)} → €{preview.costPerUnit.toFixed(2)} / {unit}
        </ThemedText>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  ingredientsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  quantityInput: { width: 80, textAlign: 'center' },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
