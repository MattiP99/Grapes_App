import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Spacing } from '@/constants/theme';
import { EditPurchaseOrderModal } from '@/features/purchase-orders/EditPurchaseOrderModal';
import type { PurchaseOrderWithItems } from '@/features/purchase-orders/api';
import { useDeletePurchaseOrder, usePurchaseOrders, useReceivePurchaseOrder } from '@/features/purchase-orders/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type { PurchaseOrderStatus } from '@/types/database';

// Colore del badge di stato per ogni possibile stato di un ordine fornitore.
const STATUS_TONES: Record<PurchaseOrderStatus, BadgeTone> = {
  ordered: 'warning',
  arrived: 'success',
  cancelled: 'neutral',
};

/**
 * PAGINA: Acquisti (rotta "/purchases").
 *
 * Elenco degli ordini fatti ai fornitori. Ogni ordine ha uno stato:
 * "ordered" (ordinato, in attesa) → "arrived" (arrivato) oppure "cancelled".
 * Quando un ordine "ordered" viene segnato come arrivato (handleReceive), le
 * quantità acquistate vengono automaticamente aggiunte alle scorte di magazzino
 * (questa logica vive nel backend/hook `useReceivePurchaseOrder`, qui si gestisce
 * solo la conferma e l'eventuale messaggio di errore).
 * Un ordine "arrived" non può più essere modificato né segnato come ricevuto di
 * nuovo (i pulsanti relativi compaiono solo per gli ordini "ordered").
 */
export default function PurchasesScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const deleteOrder = useDeletePurchaseOrder();
  const receiveOrder = useReceivePurchaseOrder();

  const [editing, setEditing] = useState<PurchaseOrderWithItems | null | 'new'>(null);

  const handleDelete = (order: PurchaseOrderWithItems) => {
    Alert.alert(t.purchases.delete, t.purchases.deleteConfirm, [
      { text: t.recipes.cancel, style: 'cancel' },
      { text: t.purchases.delete, style: 'destructive', onPress: () => deleteOrder.mutate(order.id) },
    ]);
  };

  /** Segna l'ordine come "arrivato": chiede conferma, poi aggiorna lo stato e le scorte. */
  const handleReceive = (order: PurchaseOrderWithItems) => {
    Alert.alert(t.purchases.markArrived, t.purchases.markArrivedConfirm, [
      { text: t.recipes.cancel, style: 'cancel' },
      {
        text: t.purchases.markArrived,
        onPress: async () => {
          try {
            await receiveOrder.mutateAsync(order.id);
          } catch (err: any) {
            Alert.alert(t.purchases.receiveError, err?.message ?? t.common.error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.flex}>
      <PageHeader
        title={t.purchases.title}
        subtitle={t.purchases.subtitle}
        action={
          <Button
            label={t.purchases.add}
            icon={<Feather name="plus" size={16} color={theme.primaryText} />}
            onPress={() => setEditing('new')}
          />
        }
      />

      {isLoading ? (
        <ThemedText themeColor="textSecondary">{t.common.loading}</ThemedText>
      ) : orders.length === 0 ? (
        <EmptyState icon="truck" message={t.purchases.empty} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <ThemedText type="sectionTitle">{item.supplier}</ThemedText>
                  <Badge tone={STATUS_TONES[item.status]} label={t.purchases.statusValues[item.status]} />
                </View>
                <View style={styles.headerRight}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.order_date}
                  </ThemedText>
                  {/* "Segna arrivato" e "Modifica" sono disponibili solo mentre l'ordine è ancora "ordered" */}
                  {item.status === 'ordered' && (
                    <IconButton icon="check-circle" color="success" onPress={() => handleReceive(item)} />
                  )}
                  {item.status === 'ordered' && <IconButton icon="edit-2" onPress={() => setEditing(item)} />}
                  <IconButton icon="trash-2" color="danger" onPress={() => handleDelete(item)} />
                </View>
              </View>

              {/* Righe prodotto dell'ordine: ingrediente, quantità, magazzino di destinazione, costo unitario */}
              <View style={styles.itemsBlock}>
                {item.items.map((purchaseItem) => (
                  <ThemedText key={purchaseItem.id} type="small" themeColor="textSecondary">
                    · {purchaseItem.ingredient?.name}: {purchaseItem.quantity} {purchaseItem.ingredient?.unit} →{' '}
                    {purchaseItem.location ? t.ingredients[purchaseItem.location.type] : ''}
                    {purchaseItem.unit_cost != null ? ` (€${purchaseItem.unit_cost.toFixed(2)}/u)` : ''}
                  </ThemedText>
                ))}
              </View>
            </Card>
          )}
        />
      )}

      <EditPurchaseOrderModal visible={!!editing} onClose={() => setEditing(null)} order={editing === 'new' ? null : editing} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Spacing.three },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  itemsBlock: { marginTop: Spacing.two, gap: 2 },
});
