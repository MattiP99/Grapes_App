import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { useRecipes } from '@/features/recipes/hooks';
import { useTranslation } from '@/i18n';
import type { OrderStatus } from '@/types/database';

import type { OrderWithRecipe } from './api';
import { useUpsertOrder } from './hooks';

const STATUS_VALUES: OrderStatus[] = ['pending', 'confirmed', 'ready', 'delivered', 'cancelled'];
// Valore usato nel menu a tendina "Ricetta collegata" per indicare "nessuna" (l'ordine non è a catalogo).
const NO_RECIPE = '';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Modale di creazione/modifica di un ordine, apribile da più punti della
 * pagina Ordini (click su un giorno del calendario, su un ordine, sul
 * pulsante "+"). Se `order` è `null` si sta creando un ordine nuovo
 * (precompilato con `defaultDate` se fornita), altrimenti si stanno
 * modificando i valori di un ordine esistente.
 */
export function EditOrderModal({
  visible,
  onClose,
  order,
  defaultDate,
}: {
  visible: boolean;
  onClose: () => void;
  /** null = si sta creando un ordine nuovo. */
  order: OrderWithRecipe | null;
  /** Data di ritiro da precompilare quando si crea un ordine nuovo (es. il giorno cliccato nel calendario). */
  defaultDate?: string;
}) {
  const t = useTranslation();
  const { data: recipes = [] } = useRecipes();
  const upsert = useUpsertOrder();

  // Uno stato locale per ogni campo del form (il form non è "controllato" da
  // `order` direttamente: viene copiato in questi stati quando la modale si apre, vedi sotto).
  const [customerName, setCustomerName] = useState('');
  const [cakeName, setCakeName] = useState('');
  const [recipeId, setRecipeId] = useState<string>(NO_RECIPE);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [pickupDate, setPickupDate] = useState(todayIso());
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [totalPrice, setTotalPrice] = useState('0');
  const [notes, setNotes] = useState('');

  /**
   * Ogni volta che la modale si apre (o cambia l'ordine passato), riporta il
   * form ai valori corretti: quelli dell'ordine se lo si sta modificando,
   * altrimenti tutti i campi vuoti/di default per crearne uno nuovo.
   */
  useEffect(() => {
    if (!visible) return;
    if (order) {
      setCustomerName(order.customer_name);
      setCakeName(order.cake_name);
      setRecipeId(order.recipe_id ?? NO_RECIPE);
      setVariantId(order.variant_id);
      setQuantity(String(order.quantity));
      setPickupDate(order.pickup_date);
      setStatus(order.status);
      setTotalPrice(String(order.total_price));
      setNotes(order.notes ?? '');
    } else {
      setCustomerName('');
      setCakeName('');
      setRecipeId(NO_RECIPE);
      setVariantId(null);
      setQuantity('1');
      setPickupDate(defaultDate ?? todayIso());
      setStatus('pending');
      setTotalPrice('0');
      setNotes('');
    }
  }, [visible, order, defaultDate]);

  const selectedRecipe = recipes.find((r) => r.id === recipeId);
  // Pulsante "Salva" attivo solo se i campi obbligatori sono compilati.
  const canSave = customerName.trim().length > 0 && cakeName.trim().length > 0 && Number(quantity) > 0;

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: order?.id,
      customer_name: customerName.trim(),
      cake_name: cakeName.trim(),
      recipe_id: recipeId || null,
      variant_id: recipeId ? variantId : null,
      quantity: Number(quantity) || 1,
      pickup_date: pickupDate,
      status,
      // Il prezzo si digita con la virgola (formato italiano) ma va salvato come numero con il punto.
      total_price: Number(totalPrice.replace(',', '.')) || 0,
      notes: notes.trim() || null,
    });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={order ? t.orders.edit : t.orders.add}
      maxWidth={680}
      footer={
        <>
          <Button label={t.orders.cancel} variant="ghost" onPress={onClose} />
          <Button label={t.orders.save} onPress={handleSave} loading={upsert.isPending} disabled={!canSave} />
        </>
      }>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <TextField label={t.orders.customerName} value={customerName} onChangeText={setCustomerName} />
        </View>
        <View style={styles.flex1}>
          <TextField label={t.orders.cakeName} value={cakeName} onChangeText={setCakeName} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Select
            label={t.orders.recipe}
            value={recipeId}
            options={[{ label: t.orders.noRecipe, value: NO_RECIPE }, ...recipes.map((r) => ({ label: r.name, value: r.id }))]}
            onChange={(v) => {
              setRecipeId(v);
              // Cambiando ricetta, la variante scelta prima non ha più senso: si resetta.
              setVariantId(null);
            }}
          />
        </View>
        <View style={styles.flex1}>
          <TextField label={t.orders.quantity} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
        </View>
      </View>

      {/* Il selettore di variante compare solo se la ricetta scelta ne ha più di una (altrimenti è scontata). */}
      {selectedRecipe && selectedRecipe.variants.length > 1 && (
        <Select
          label={t.orders.variant}
          value={variantId}
          options={selectedRecipe.variants.map((v) => ({ label: v.label, value: v.id }))}
          onChange={setVariantId}
        />
      )}

      <View style={styles.row}>
        <View style={styles.flex1}>
          <DateField label={t.orders.pickupDate} value={pickupDate} onChange={setPickupDate} />
        </View>
        <View style={styles.flex1}>
          <Select
            label={t.orders.status}
            value={status}
            options={STATUS_VALUES.map((s) => ({ label: t.orders.statusValues[s], value: s }))}
            onChange={(v) => setStatus(v as OrderStatus)}
          />
        </View>
      </View>

      <TextField label={t.orders.totalPrice} value={totalPrice} onChangeText={setTotalPrice} keyboardType="decimal-pad" />

      <TextField label={t.orders.notes} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
});
