import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { INGREDIENT_UNITS } from '@/constants/units';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import type { IngredientWithStock, StorageLocation, StorageLocationType } from '@/types/database';

import { useStorageLocations, useUpsertIngredient } from './hooks';

type StockDraft = Record<StorageLocationType, { quantity: string; min_threshold: string }>;

const emptyStock: StockDraft = {
  fridge: { quantity: '0', min_threshold: '0' },
  freezer: { quantity: '0', min_threshold: '0' },
  pantry: { quantity: '0', min_threshold: '0' },
};

export function EditIngredientModal({
  visible,
  onClose,
  ingredient,
}: {
  visible: boolean;
  onClose: () => void;
  ingredient: IngredientWithStock | null;
}) {
  const t = useTranslation();
  const { data: locations = [] } = useStorageLocations();
  const upsert = useUpsertIngredient();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<string>(INGREDIENT_UNITS[0]);
  const [costPerUnit, setCostPerUnit] = useState('0');
  const [supplier, setSupplier] = useState('');
  const [stock, setStock] = useState<StockDraft>(emptyStock);

  useEffect(() => {
    if (!visible) return;
    if (ingredient) {
      setName(ingredient.name);
      setUnit(ingredient.unit);
      setCostPerUnit(String(ingredient.cost_per_unit));
      setSupplier(ingredient.supplier ?? '');
      setStock({
        fridge: {
          quantity: String(ingredient.stock.fridge?.quantity ?? 0),
          min_threshold: String(ingredient.stock.fridge?.min_threshold ?? 0),
        },
        freezer: {
          quantity: String(ingredient.stock.freezer?.quantity ?? 0),
          min_threshold: String(ingredient.stock.freezer?.min_threshold ?? 0),
        },
        pantry: {
          quantity: String(ingredient.stock.pantry?.quantity ?? 0),
          min_threshold: String(ingredient.stock.pantry?.min_threshold ?? 0),
        },
      });
    } else {
      setName('');
      setUnit(INGREDIENT_UNITS[0]);
      setCostPerUnit('0');
      setSupplier('');
      setStock(emptyStock);
    }
  }, [visible, ingredient]);

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: ingredient?.id,
      name: name.trim(),
      unit,
      cost_per_unit: Number(costPerUnit.replace(',', '.')) || 0,
      supplier: supplier.trim() || null,
      stock: {
        fridge: { quantity: Number(stock.fridge.quantity) || 0, min_threshold: Number(stock.fridge.min_threshold) || 0 },
        freezer: { quantity: Number(stock.freezer.quantity) || 0, min_threshold: Number(stock.freezer.min_threshold) || 0 },
        pantry: { quantity: Number(stock.pantry.quantity) || 0, min_threshold: Number(stock.pantry.min_threshold) || 0 },
      },
    });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={t.ingredients.edit}
      footer={
        <>
          <Button label={t.ingredients.cancel} variant="ghost" onPress={onClose} />
          <Button label={t.ingredients.save} onPress={handleSave} loading={upsert.isPending} disabled={!name.trim()} />
        </>
      }>
      <TextField label={t.ingredients.name} value={name} onChangeText={setName} />

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
            label={t.ingredients.unitCost + ' (€)'}
            value={costPerUnit}
            onChangeText={setCostPerUnit}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="label" themeColor="textSecondary">
          {t.ingredients.stockByStorage}
        </ThemedText>
        {locations.map((location: StorageLocation) => (
          <View key={location.id} style={styles.stockRow}>
            <ThemedText style={styles.stockLabel}>{location.name}</ThemedText>
            <TextField
              value={stock[location.type].quantity}
              onChangeText={(v) => setStock((s) => ({ ...s, [location.type]: { ...s[location.type], quantity: v } }))}
              keyboardType="decimal-pad"
              style={styles.stockInput}
            />
            <TextField
              value={stock[location.type].min_threshold}
              onChangeText={(v) =>
                setStock((s) => ({ ...s, [location.type]: { ...s[location.type], min_threshold: v } }))
              }
              keyboardType="decimal-pad"
              style={styles.stockInput}
            />
          </View>
        ))}
        <ThemedText type="small" themeColor="textSecondary">
          {t.ingredients.minThresholdHint}
        </ThemedText>
      </View>

      <TextField label={t.ingredients.supplier} value={supplier} onChangeText={setSupplier} />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three },
  flex1: { flex: 1 },
  section: { gap: Spacing.two },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stockLabel: { flex: 1 },
  stockInput: { width: 72, textAlign: 'center' },
});
