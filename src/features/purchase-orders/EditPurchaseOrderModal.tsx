import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { IconButton } from '@/components/ui/IconButton';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { useIngredients, useStorageLocations } from '@/features/ingredients/hooks';
import { useTranslation } from '@/i18n';

import type { PurchaseOrderWithItems } from './api';
import { useUpsertPurchaseOrder } from './hooks';

// Genera identificatori temporanei univoci per le righe prodotto non ancora
// salvate (servono solo come `key` di React nella lista, mai inviati al database).
let tempIdCounter = 0;
function tempId() {
  tempIdCounter += 1;
  return `tmp-${Date.now()}-${tempIdCounter}`;
}

/** Una riga prodotto dell'ordine, ancora "in bozza" nel form (i numeri sono stringhe perché sono testo digitato). */
interface ItemLine {
  key: string;
  ingredient_id: string | null;
  quantity: string;
  location_id: string | null;
  unit_cost: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Modale di creazione/modifica di un ordine fornitore: fornitore, data
 * ordine/consegna prevista, note, e un elenco di righe prodotto (ingrediente,
 * quantità, magazzino di destinazione, costo unitario) — righe aggiungibili e
 * rimuovibili liberamente con i pulsanti "+"/cestino.
 */
export function EditPurchaseOrderModal({
  visible,
  onClose,
  order,
}: {
  visible: boolean;
  onClose: () => void;
  order: PurchaseOrderWithItems | null;
}) {
  const t = useTranslation();
  const { data: ingredients = [] } = useIngredients();
  const { data: locations = [] } = useStorageLocations();
  const upsert = useUpsertPurchaseOrder();

  const [supplier, setSupplier] = useState('');
  const [orderDate, setOrderDate] = useState(todayIso());
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemLine[]>([]);

  /** Ripristina il form ai valori dell'ordine (modifica) o lo svuota (nuovo ordine) ogni volta che la modale si apre. */
  useEffect(() => {
    if (!visible) return;
    if (order) {
      setSupplier(order.supplier);
      setOrderDate(order.order_date);
      setExpectedDate(order.expected_date ?? '');
      setNotes(order.notes ?? '');
      setItems(
        order.items.map((i) => ({
          key: i.id,
          ingredient_id: i.ingredient_id,
          quantity: String(i.quantity),
          location_id: i.location_id,
          unit_cost: i.unit_cost != null ? String(i.unit_cost) : '',
        }))
      );
    } else {
      setSupplier('');
      setOrderDate(todayIso());
      setExpectedDate('');
      setNotes('');
      setItems([]);
    }
  }, [visible, order]);

  const ingredientOptions = ingredients.map((i) => ({ label: `${i.name} (${i.unit})`, value: i.id }));

  /** Aggiunge una riga prodotto vuota, precompilata col primo ingrediente/magazzino disponibile. */
  const addItem = () =>
    setItems((its) => [
      ...its,
      { key: tempId(), ingredient_id: ingredients[0]?.id ?? null, quantity: '', location_id: locations[0]?.id ?? null, unit_cost: '' },
    ]);
  const updateItem = (key: string, patch: Partial<ItemLine>) =>
    setItems((its) => its.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const removeItem = (key: string) => setItems((its) => its.filter((i) => i.key !== key));

  // Si può salvare solo se c'è un fornitore, almeno una riga, e ogni riga ha
  // ingrediente + magazzino scelti e una quantità positiva.
  const canSave =
    supplier.trim().length > 0 &&
    items.length > 0 &&
    items.every((i) => i.ingredient_id && i.location_id && Number(i.quantity) > 0);

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: order?.id,
      supplier: supplier.trim(),
      order_date: orderDate,
      expected_date: expectedDate || null,
      notes: notes.trim() || null,
      // Un nuovo ordine parte sempre come "ordered"; se si sta modificando uno
      // esistente si conserva lo stato attuale (qui non si può cambiarlo: si
      // passa a "arrivato" solo dal pulsante dedicato nella pagina Acquisti).
      status: order?.status ?? 'ordered',
      items: items.map((i) => ({
        ingredient_id: i.ingredient_id!,
        // I numeri si digitano con la virgola (formato italiano) ma vanno salvati con il punto.
        quantity: Number(i.quantity.replace(',', '.')),
        location_id: i.location_id!,
        unit_cost: i.unit_cost ? Number(i.unit_cost.replace(',', '.')) : null,
      })),
    });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={order ? t.purchases.edit : t.purchases.add}
      maxWidth={620}
      footer={
        <>
          <Button label={t.recipes.cancel} variant="ghost" onPress={onClose} />
          <Button label={t.recipes.save} onPress={handleSave} loading={upsert.isPending} disabled={!canSave} />
        </>
      }>
      <TextField label={t.purchases.supplier} value={supplier} onChangeText={setSupplier} />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <DateField label={t.purchases.orderDate} value={orderDate} onChange={setOrderDate} />
        </View>
        <View style={styles.flex1}>
          <DateField label={t.purchases.expectedDate} value={expectedDate} onChange={setExpectedDate} />
        </View>
      </View>

      <TextField label={t.orders.notes} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />

      <View style={styles.itemsHeader}>
        <ThemedText type="label" themeColor="textSecondary">
          {t.purchases.items}
        </ThemedText>
        <IconButton icon="plus" onPress={addItem} />
      </View>

      {/* Una riga per ogni prodotto ordinato: ingrediente, quantità, magazzino di destinazione, costo unitario opzionale */}
      {items.map((item) => (
        <View key={item.key} style={styles.itemRow}>
          <View style={styles.flex2}>
            <Select
              value={item.ingredient_id}
              options={ingredientOptions}
              onChange={(v) => updateItem(item.key, { ingredient_id: v })}
              placeholder={t.ingredients.name}
            />
          </View>
          <TextField
            value={item.quantity}
            onChangeText={(v) => updateItem(item.key, { quantity: v })}
            keyboardType="decimal-pad"
            style={styles.smallInput}
            placeholder={t.purchases.quantity}
          />
          <View style={styles.flex1}>
            <Select
              value={item.location_id}
              options={locations.map((l) => ({ label: t.ingredients[l.type], value: l.id }))}
              onChange={(v) => updateItem(item.key, { location_id: v })}
              placeholder={t.purchases.location}
            />
          </View>
          <TextField
            value={item.unit_cost}
            onChangeText={(v) => updateItem(item.key, { unit_cost: v })}
            keyboardType="decimal-pad"
            style={styles.smallInput}
            placeholder="€/u"
          />
          <IconButton icon="trash-2" onPress={() => removeItem(item.key)} />
        </View>
      ))}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  smallInput: { width: 70, textAlign: 'center' },
});
