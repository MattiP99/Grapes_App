import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type { IngredientWithStock } from '@/types/database';

import { useMoveStock, useStorageLocations } from './hooks';

/**
 * Modale per spostare una quantità di un ingrediente da un magazzino a un
 * altro (es. scongelare qualcosa dal freezer alla dispensa). Aperta dal
 * pulsante "repeat" nella pagina Ingredienti.
 */
export function MoveStockModal({
  visible,
  onClose,
  ingredient,
}: {
  visible: boolean;
  onClose: () => void;
  /** null quando la modale è chiusa. */
  ingredient: IngredientWithStock | null;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const { data: locations = [] } = useStorageLocations();
  const moveStock = useMoveStock();

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');

  /**
   * Ogni volta che si apre, sceglie come default: "da" il primo magazzino che
   * ha effettivamente scorta di questo ingrediente (altrimenti non avrebbe
   * senso spostarne da lì), "a" il primo magazzino diverso da quello.
   */
  useEffect(() => {
    if (!visible || !ingredient || locations.length === 0) return;
    const withStock = locations.find((l) => (ingredient.stock[l.type]?.quantity ?? 0) > 0);
    const defaultFrom = withStock ?? locations[0];
    const defaultTo = locations.find((l) => l.id !== defaultFrom.id) ?? locations[0];
    setFromId(defaultFrom.id);
    setToId(defaultTo.id);
    setQuantity('');
  }, [visible, ingredient, locations]);

  if (!ingredient) return null;

  const fromLocation = locations.find((l) => l.id === fromId);
  // Non si può spostare più di quanto sia effettivamente disponibile nel magazzino di partenza.
  const maxQuantity = fromLocation ? ingredient.stock[fromLocation.type]?.quantity ?? 0 : 0;
  const parsedQuantity = Number(quantity.replace(',', '.')) || 0;
  const canMove = !!fromId && !!toId && fromId !== toId && parsedQuantity > 0 && parsedQuantity <= maxQuantity;

  const handleMove = async () => {
    if (!fromId || !toId) return;
    await moveStock.mutateAsync({ ingredientId: ingredient.id, fromLocationId: fromId, toLocationId: toId, quantity: parsedQuantity });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={`${t.ingredients.moveStock} — ${ingredient.name}`}
      footer={
        <>
          <Button label={t.ingredients.cancel} variant="ghost" onPress={onClose} />
          <Button label={t.ingredients.moveStock} onPress={handleMove} loading={moveStock.isPending} disabled={!canMove} />
        </>
      }>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Select
            label={t.ingredients.from}
            value={fromId}
            options={locations.map((l) => ({
              label: `${l.name} (${ingredient.stock[l.type]?.quantity ?? 0} ${ingredient.unit})`,
              value: l.id,
            }))}
            onChange={setFromId}
          />
        </View>
        <Feather name="arrow-right" size={16} color={theme.textSecondary} style={styles.arrow} />
        <View style={styles.flex1}>
          <Select
            label={t.ingredients.to}
            // Il magazzino di destinazione non può essere lo stesso di partenza, quindi viene escluso dalle opzioni.
            value={toId}
            options={locations.filter((l) => l.id !== fromId).map((l) => ({ label: l.name, value: l.id }))}
            onChange={setToId}
          />
        </View>
      </View>

      <TextField
        label={`${t.ingredients.quantityToMove} (${t.ingredients.max} ${maxQuantity} ${ingredient.unit})`}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
      />

      {parsedQuantity > maxQuantity && (
        <ThemedText type="small" themeColor="danger">
          {t.ingredients.quantityToMove} &gt; {maxQuantity}
        </ThemedText>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex1: { flex: 1 },
  arrow: { marginBottom: 12 },
});
