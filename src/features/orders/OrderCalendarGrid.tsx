import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/IconButton';
import { Radii, Spacing, TabletBreakpoint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { OrderStatus } from '@/types/database';

import type { OrderWithRecipe } from './api';

export type CalendarViewMode = 'month' | 'week' | 'day';

/** Converte una Date in stringa "YYYY-MM-DD" (formato usato ovunque nel database per le date). */
function toIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (d.getDay() + 6) % 7; // 0 = lunedì
  d.setDate(d.getDate() - weekday);
  return d;
}

/** Griglia di 6 settimane (lun-dom) che copre l'intero mese, sconfinando nei mesi adiacenti. */
function buildMonthGrid(viewDate: Date) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = startOfWeek(first);

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

/** I 7 giorni (lun→dom) della settimana che contiene `viewDate`. */
function buildWeekDays(viewDate: Date) {
  const start = startOfWeek(viewDate);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

/**
 * Componente calendario usato dalla pagina Ordini, con 3 modalità scelte da
 * `mode`:
 * - "month": griglia classica 7×6 (un mese intero), celle piccole con al
 *   massimo 2 ordini visibili + contatore "+N" — pensata per una vista
 *   d'insieme, non per leggere ogni dettaglio.
 * - "week": 7 giorni. Su schermi larghi (tablet/desktop) mostrati come 7
 *   colonne affiancate (`WeekGridColumn`, più spazio per riga = testo leggibile);
 *   su mobile come un elenco verticale di righe (`AgendaDayRow`, ogni giorno
 *   occupa tutta la larghezza per restare leggibile anche su schermo piccolo).
 * - "day": un solo giorno, stessa resa grafica della riga "week" mobile ma con
 *   un solo elemento.
 * La navigazione avanti/indietro (freccine in alto) sposta `viewDate` di un
 * mese/settimana/giorno secondo la modalità attiva.
 */
export function OrderCalendarGrid({
  mode,
  viewDate,
  onViewDateChange,
  ordersByDate,
  selectedDate,
  onDayPress,
  onOrderPress,
  onAddPress,
  statusColors,
}: {
  mode: CalendarViewMode;
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
  ordersByDate: Map<string, OrderWithRecipe[]>;
  selectedDate: string | null;
  onDayPress: (dateIso: string) => void;
  onOrderPress: (order: OrderWithRecipe) => void;
  onAddPress: (dateIso: string) => void;
  statusColors: Record<OrderStatus, string>;
}) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const { width } = useWindowDimensions();
  const isWide = width >= TabletBreakpoint;

  const todayIso = useMemo(() => toIso(new Date()), []);

  /** Sposta `viewDate` avanti (amount=1) o indietro (amount=-1) di un mese/settimana/giorno. */
  const goBy = (unit: 'month' | 'week' | 'day', amount: number) => {
    const next = new Date(viewDate);
    if (unit === 'month') next.setMonth(next.getMonth() + amount);
    else next.setDate(next.getDate() + amount * (unit === 'week' ? 7 : 1));
    onViewDateChange(next);
  };

  // Etichetta mostrata al centro dell'intestazione: "Agosto 2026" in modalità
  // mese, "Sabato 15 agosto 2026" in modalità giorno, oppure un intervallo
  // "11 – 17 agosto 2026" (o "28 lug – 3 ago 2026" se la settimana attraversa due mesi) in modalità settimana.
  const headerLabel = useMemo(() => {
    if (mode === 'month') {
      const label = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(viewDate);
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    if (mode === 'day') {
      const label = new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
        viewDate
      );
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    const start = startOfWeek(viewDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = new Intl.DateTimeFormat(language, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' }).format(
      start
    );
    const endLabel = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(end);
    return `${startLabel} – ${endLabel}`;
  }, [mode, viewDate, language]);

  const weekdayLabels = useMemo(() => {
    // 4 gennaio 2021 è un lunedì: usiamo quella settimana come riferimento per le etichette lun→dom.
    const formatter = new Intl.DateTimeFormat(language, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2021, 0, 4 + i)));
  }, [language]);

  return (
    <View>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => goBy(mode, -1)} />
        <ThemedText type="sectionTitle" style={styles.monthLabel}>
          {headerLabel}
        </ThemedText>
        <IconButton icon="chevron-right" onPress={() => goBy(mode, 1)} />
      </View>

      {mode === 'month' ? (
        <MonthGrid
          viewDate={viewDate}
          ordersByDate={ordersByDate}
          selectedDate={selectedDate}
          todayIso={todayIso}
          weekdayLabels={weekdayLabels}
          onDayPress={onDayPress}
          statusColors={statusColors}
          theme={theme}
        />
      ) : mode === 'week' && isWide ? (
        <View style={styles.weekGrid}>
          {buildWeekDays(viewDate).map((day) => (
            <WeekGridColumn
              key={toIso(day)}
              day={day}
              orders={ordersByDate.get(toIso(day)) ?? []}
              isToday={toIso(day) === todayIso}
              language={language}
              emptyLabel={t.orders.noOrdersShort}
              onOrderPress={onOrderPress}
              onAddPress={onAddPress}
              statusColors={statusColors}
              theme={theme}
            />
          ))}
        </View>
      ) : (
        <View style={styles.agenda}>
          {(mode === 'day' ? [viewDate] : buildWeekDays(viewDate)).map((day) => (
            <AgendaDayRow
              key={toIso(day)}
              day={day}
              orders={ordersByDate.get(toIso(day)) ?? []}
              isToday={toIso(day) === todayIso}
              language={language}
              emptyLabel={t.orders.noOrdersShort}
              onOrderPress={onOrderPress}
              onAddPress={onAddPress}
              statusColors={statusColors}
              theme={theme}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Vista "Mese": griglia 7×6 con puntini/etichette compatte per ogni giorno (usata da tutte le larghezze di schermo). */
function MonthGrid({
  viewDate,
  ordersByDate,
  selectedDate,
  todayIso,
  weekdayLabels,
  onDayPress,
  statusColors,
  theme,
}: {
  viewDate: Date;
  ordersByDate: Map<string, OrderWithRecipe[]>;
  selectedDate: string | null;
  todayIso: string;
  weekdayLabels: string[];
  onDayPress: (dateIso: string) => void;
  statusColors: Record<OrderStatus, string>;
  theme: ReturnType<typeof useTheme>;
}) {
  const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  return (
    <>
      <View style={styles.weekRow}>
        {weekdayLabels.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.weekdayCell}>
            <ThemedText type="label" themeColor="textSecondary">
              {label.toUpperCase()}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dateIso = toIso(day);
          const dayOrders = ordersByDate.get(dateIso) ?? [];
          const isCurrentMonth = day.getMonth() === viewDate.getMonth();
          const isToday = dateIso === todayIso;
          const isSelected = dateIso === selectedDate;
          const visibleOrders = dayOrders.slice(0, 2);
          const hiddenCount = dayOrders.length - visibleOrders.length;

          return (
            <Pressable
              key={dateIso}
              onPress={() => onDayPress(dateIso)}
              style={[
                styles.dayCell,
                {
                  borderColor: isSelected ? theme.primary : theme.border,
                  borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: isCurrentMonth ? theme.surface : theme.surfaceMuted,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={isToday ? 'primary' : isCurrentMonth ? 'text' : 'textSecondary'}>
                {day.getDate()}
              </ThemedText>

              <View style={styles.dayOrders}>
                {visibleOrders.map((order) => (
                  <View
                    key={order.id}
                    style={[styles.orderChip, { backgroundColor: theme.surfaceMuted, borderLeftColor: statusColors[order.status] }]}>
                    <ThemedText type="small" numberOfLines={1} style={styles.orderChipText}>
                      {order.customer_name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.orderChipText}>
                      {order.cake_name}
                    </ThemedText>
                  </View>
                ))}
                {hiddenCount > 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    +{hiddenCount}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

/**
 * Una riga "a piena larghezza" per un giorno: data + pulsante "+" per
 * aggiungere un ordine, e sotto l'elenco degli ordini di quel giorno (ognuno
 * cliccabile per aprirne subito la modifica). Usata per la vista "Giorno" e
 * per la vista "Settimana" quando lo schermo è troppo stretto per le colonne affiancate.
 */
function AgendaDayRow({
  day,
  orders,
  isToday,
  language,
  emptyLabel,
  onOrderPress,
  onAddPress,
  statusColors,
  theme,
}: {
  day: Date;
  orders: OrderWithRecipe[];
  isToday: boolean;
  language: string;
  emptyLabel: string;
  onOrderPress: (order: OrderWithRecipe) => void;
  onAddPress: (dateIso: string) => void;
  statusColors: Record<OrderStatus, string>;
  theme: ReturnType<typeof useTheme>;
}) {
  const dateIso = toIso(day);
  const label = new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short' }).format(day);

  return (
    <View style={[styles.agendaRow, { borderColor: isToday ? theme.primary : theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.agendaRowHeader}>
        <ThemedText type="smallBold" themeColor={isToday ? 'primary' : 'text'} style={styles.capitalize}>
          {label}
        </ThemedText>
        <IconButton icon="plus" size={16} onPress={() => onAddPress(dateIso)} />
      </View>

      {orders.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      ) : (
        <View style={styles.agendaOrders}>
          {orders.map((order) => (
            <Pressable key={order.id} onPress={() => onOrderPress(order)} style={styles.agendaOrderRow}>
              <View style={[styles.agendaDot, { backgroundColor: statusColors[order.status] }]} />
              <ThemedText type="smallBold" numberOfLines={1} style={styles.flexShrink}>
                {order.customer_name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flexShrink}>
                {order.cake_name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Come AgendaDayRow, ma pensata per stare AFFIANCATA ad altre 6 colonne
 * uguali (una per ogni giorno della settimana) invece che impilata — usata
 * per la vista "Settimana" su schermi larghi, dove c'è spazio per mostrarle tutte in riga.
 */
function WeekGridColumn({
  day,
  orders,
  isToday,
  language,
  emptyLabel,
  onOrderPress,
  onAddPress,
  statusColors,
  theme,
}: {
  day: Date;
  orders: OrderWithRecipe[];
  isToday: boolean;
  language: string;
  emptyLabel: string;
  onOrderPress: (order: OrderWithRecipe) => void;
  onAddPress: (dateIso: string) => void;
  statusColors: Record<OrderStatus, string>;
  theme: ReturnType<typeof useTheme>;
}) {
  const dateIso = toIso(day);
  const label = new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric' }).format(day);

  return (
    <View
      style={[
        styles.weekGridColumn,
        { borderColor: isToday ? theme.primary : theme.border, backgroundColor: theme.surface },
      ]}>
      <View style={styles.agendaRowHeader}>
        <ThemedText type="smallBold" themeColor={isToday ? 'primary' : 'text'} style={styles.capitalize}>
          {label}
        </ThemedText>
        <IconButton icon="plus" size={14} onPress={() => onAddPress(dateIso)} />
      </View>

      {orders.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      ) : (
        <View style={styles.dayOrders}>
          {orders.map((order) => (
            <Pressable
              key={order.id}
              onPress={() => onOrderPress(order)}
              style={[styles.orderChip, { backgroundColor: theme.surfaceMuted, borderLeftColor: statusColors[order.status] }]}>
              <ThemedText type="small" numberOfLines={1} style={styles.orderChipText}>
                {order.customer_name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.orderChipText}>
                {order.cake_name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  monthLabel: { minWidth: 170, textAlign: 'center' },
  weekRow: { flexDirection: 'row' },
  weekdayCell: { flex: 1, alignItems: 'center', paddingBottom: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    borderRadius: Radii.medium,
    padding: Spacing.one,
    gap: 3,
  },
  dayOrders: { gap: 3 },
  orderChip: {
    borderLeftWidth: 3,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  orderChipText: { flexShrink: 1 },
  weekGrid: { flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' },
  weekGridColumn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.two,
    gap: Spacing.two,
    minHeight: 180,
  },
  agenda: { gap: Spacing.two },
  agendaRow: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  agendaRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agendaOrders: { gap: Spacing.two },
  agendaOrderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  agendaDot: { width: 8, height: 8, borderRadius: 4 },
  flexShrink: { flexShrink: 1 },
  capitalize: { textTransform: 'capitalize' },
});
