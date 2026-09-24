import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Spacing, TabletBreakpoint } from '@/constants/theme';
import { EditOrderModal } from '@/features/orders/EditOrderModal';
import { OrderCalendarGrid, type CalendarViewMode } from '@/features/orders/OrderCalendarGrid';
import type { OrderWithRecipe } from '@/features/orders/api';
import { useDeleteOrder, useOrders } from '@/features/orders/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type { OrderStatus } from '@/types/database';

/** Colori dei puntini del calendario per stato ordine, derivati dal tema corrente. */
function getStatusColors(theme: ReturnType<typeof useTheme>): Record<OrderStatus, string> {
  return {
    pending: theme.warning,
    confirmed: theme.info,
    ready: theme.primary,
    delivered: theme.success,
    cancelled: theme.textSecondary,
  };
}

// Colore del badge di stato per ogni possibile stato di un ordine.
const STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'info',
  ready: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * PAGINA: Ordini (rotta "/orders").
 *
 * Il cuore della gestione ordini: un calendario (mese/settimana/giorno, vedi
 * `OrderCalendarGrid`) più due liste laterali — "gli ordini del giorno
 * selezionato" e "i prossimi 6 ordini in arrivo". Cliccando su un giorno o su
 * un ordine nel calendario si apre `EditOrderModal` per aggiungere/modificare.
 *
 * Layout responsive: su schermi larghi (tablet/desktop) calendario e liste
 * stanno affiancati (calendario più largo, 2/3 dello spazio), su mobile sono
 * impilati in verticale e si scorre con la pagina intera.
 */
export default function OrdersScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= TabletBreakpoint;

  const { data: orders = [], isLoading } = useOrders();
  const deleteOrder = useDeleteOrder();

  // Giorno evidenziato/selezionato nel calendario (guida cosa mostrare nel pannello "Seleziona un giorno").
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 'new' = si sta creando un nuovo ordine, un oggetto = si sta modificando quell'ordine, null = modale chiusa.
  const [editing, setEditing] = useState<OrderWithRecipe | null | 'new'>(null);
  // Data "di riferimento" del calendario: per la vista Mese è il mese mostrato,
  // per Settimana la settimana, per Giorno il giorno esatto (vedi OrderCalendarGrid).
  const [viewDate, setViewDate] = useState(() => new Date());
  // Su mobile si parte dalla vista Settimana (più leggibile sullo schermo piccolo),
  // su schermi larghi dalla vista Mese (più informazioni visibili in un colpo d'occhio).
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => (isWide ? 'month' : 'week'));

  /** Raggruppa tutti gli ordini per data di ritiro, per un accesso rapido "che ordini ci sono in questo giorno?". */
  const ordersByDate = useMemo(() => {
    const map = new Map<string, OrderWithRecipe[]>();
    for (const order of orders) {
      const list = map.get(order.pickup_date) ?? [];
      list.push(order);
      map.set(order.pickup_date, list);
    }
    return map;
  }, [orders]);

  const statusColors = useMemo(() => getStatusColors(theme), [theme]);

  // I prossimi 6 ordini non ancora consegnati/annullati, in ordine di data di ritiro.
  const upcoming = useMemo(
    () =>
      [...orders]
        .filter((o) => o.pickup_date >= todayIso() && o.status !== 'cancelled')
        .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
        .slice(0, 6),
    [orders]
  );

  const selectedDayOrders = selectedDate ? ordersByDate.get(selectedDate) ?? [] : [];

  /**
   * Gestisce il click su una CELLA del calendario (usato dalla vista Mese):
   * seleziona sempre il giorno, e in più apre subito la modale se il giorno
   * ha esattamente un ordine (modifica diretta) o nessuno (crea subito un nuovo
   * ordine per quella data). Se ce ne sono più di uno, si sceglie dal pannello
   * laterale "Seleziona un giorno" invece di indovinare quale aprire.
   */
  const handleDayPress = (dateIso: string) => {
    setSelectedDate(dateIso);
    const dayOrders = ordersByDate.get(dateIso) ?? [];
    if (dayOrders.length === 1) {
      setEditing(dayOrders[0]);
    } else if (dayOrders.length === 0) {
      setEditing('new');
    }
  };

  /** Click su un ordine specifico (usato dalle viste Settimana/Giorno, dove ogni ordine è già visibile per nome): apre direttamente la modifica. */
  const handleOrderPress = (order: OrderWithRecipe) => {
    setSelectedDate(order.pickup_date);
    setEditing(order);
  };

  /** Click sul pulsante "+" di un giorno (viste Settimana/Giorno): apre la modale per creare un nuovo ordine su quella data. */
  const handleAddForDate = (dateIso: string) => {
    setSelectedDate(dateIso);
    setEditing('new');
  };

  const handleDelete = (order: OrderWithRecipe) => {
    Alert.alert(t.orders.delete, t.orders.deleteConfirm, [
      { text: t.orders.cancel, style: 'cancel' },
      { text: t.orders.delete, style: 'destructive', onPress: () => deleteOrder.mutate(order.id) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <PageHeader
        title={t.orders.title}
        subtitle={t.orders.subtitle}
        action={
          <Button
            label={t.orders.add}
            icon={<Feather name="plus" size={16} color={theme.primaryText} />}
            onPress={() => setEditing('new')}
          />
        }
      />

      <View style={[styles.body, !isWide && styles.bodyNarrow]}>
        {/* Blocco calendario: tab Mese/Settimana/Giorno + la griglia/agenda vera e propria */}
        <Card style={[styles.calendarCard, isWide && styles.calendarCardWide]}>
          <SegmentedTabs
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: t.orders.viewMonth, value: 'month' },
              { label: t.orders.viewWeek, value: 'week' },
              { label: t.orders.viewDay, value: 'day' },
            ]}
          />
          <View style={styles.calendarSpacer} />
          <OrderCalendarGrid
            mode={viewMode}
            viewDate={viewDate}
            onViewDateChange={setViewDate}
            ordersByDate={ordersByDate}
            selectedDate={selectedDate}
            onDayPress={handleDayPress}
            onOrderPress={handleOrderPress}
            onAddPress={handleAddForDate}
            statusColors={statusColors}
          />
        </Card>

        {/* Pannello laterale: ordini del giorno selezionato + prossimi ordini in arrivo */}
        <View style={[styles.sidePanel, isWide && styles.sidePanelWide]}>
          <Card>
            <ThemedText type="sectionTitle" style={styles.sectionTitle}>
              {t.orders.selectDay}
            </ThemedText>
            {!selectedDate ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t.orders.selectDayHint}
              </ThemedText>
            ) : selectedDayOrders.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t.orders.empty}
              </ThemedText>
            ) : (
              <View style={styles.orderList}>
                {selectedDayOrders.map((order) => (
                  <OrderListItem key={order.id} order={order} onEdit={() => setEditing(order)} onDelete={() => handleDelete(order)} />
                ))}
              </View>
            )}
          </Card>

          <Card>
            <View style={styles.upcomingHeader}>
              <Feather name="calendar" size={16} color={theme.text} />
              <ThemedText type="sectionTitle">{t.orders.upcoming}</ThemedText>
            </View>
            {isLoading ? (
              <ThemedText themeColor="textSecondary">{t.common.loading}</ThemedText>
            ) : upcoming.length === 0 ? (
              <EmptyState icon="calendar" message={t.orders.empty} />
            ) : (
              <View style={styles.orderList}>
                {upcoming.map((item) => (
                  <OrderListItem key={item.id} order={item} onEdit={() => setEditing(item)} onDelete={() => handleDelete(item)} />
                ))}
              </View>
            )}
          </Card>
        </View>
      </View>

      <EditOrderModal
        visible={!!editing}
        onClose={() => setEditing(null)}
        order={editing === 'new' ? null : editing}
        defaultDate={selectedDate ?? undefined}
      />
    </ScrollView>
  );
}

/** Una riga ordine (usata sia nel pannello "giorno selezionato" che in "in arrivo"): torta, cliente, data, ricetta collegata, stato, azioni. */
function OrderListItem({ order, onEdit, onDelete }: { order: OrderWithRecipe; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslation();

  return (
    <View style={styles.orderItem}>
      <View style={styles.flex1}>
        <ThemedText type="smallBold">{order.cake_name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {order.customer_name} · {order.pickup_date}
          {order.recipe ? ` · ${order.recipe.name}` : ''}
        </ThemedText>
      </View>
      <Badge tone={STATUS_TONES[order.status]} label={t.orders.statusValues[order.status]} />
      <IconButton icon="edit-2" onPress={onEdit} />
      <IconButton icon="trash-2" color="danger" onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Spacing.four, paddingBottom: Spacing.six },
  body: { flexDirection: 'row', gap: Spacing.four },
  bodyNarrow: { flexDirection: 'column' },
  calendarCard: { padding: Spacing.two },
  calendarCardWide: { flex: 2 },
  calendarSpacer: { height: Spacing.three },
  sidePanel: { gap: Spacing.four },
  sidePanelWide: { flex: 1 },
  sectionTitle: { marginBottom: Spacing.two },
  orderList: { gap: Spacing.three },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex1: { flex: 1 },
  upcomingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
});
