import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Spacing } from '@/constants/theme';
import { CompleteTaskModal } from '@/features/work-plan/CompleteTaskModal';
import { EditWorkPlanTaskModal } from '@/features/work-plan/EditWorkPlanTaskModal';
import type { WorkPlanTaskWithDetails } from '@/features/work-plan/api';
import { useCompleteWorkPlanTask, useDeleteWorkPlanTask, useWorkPlanTasks } from '@/features/work-plan/hooks';
import { useStorageLocations } from '@/features/ingredients/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, useTranslation } from '@/i18n';

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Es. "lunedì 18 agosto" nella lingua attiva, per l'intestazione del giorno mostrato. */
function formatDisplayDate(iso: string, language: 'en' | 'it') {
  const date = new Date(`${iso}T00:00:00`);
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * PAGINA: Piano di lavoro (rotta "/work-plan").
 *
 * Lista delle attività ("task") da fare in un giorno specifico, con freccine
 * avanti/indietro per cambiare giorno (nessun calendario, solo giorno per
 * giorno). Ogni task può essere:
 * - Un task "semplice" (solo un titolo/nota da spuntare).
 * - Un task legato a una PRODUZIONE (preparare un componente/semilavorato o
 *   una variante di ricetta): completandolo si apre `CompleteTaskModal`, che
 *   scala gli ingredienti usati dal magazzino e aggiunge il prodotto finito
 *   alle scorte — un task semplice invece si completa con un tocco, usando il
 *   primo magazzino disponibile come riferimento.
 * I task completati restano in lista (in fondo, con testo depennato) invece
 * di essere nascosti, per avere sotto controllo cosa è stato fatto in giornata.
 */
export default function WorkPlanScreen() {
  const { t, language } = useI18n();
  const theme = useTheme();
  // Giorno attualmente mostrato (sempre uno solo, si cambia con le freccine).
  const [date, setDate] = useState(() => toIso(new Date()));
  const { data: tasks = [], isLoading } = useWorkPlanTasks(date);
  const deleteTask = useDeleteWorkPlanTask(date);
  const completeTask = useCompleteWorkPlanTask(date);
  const { data: locations = [] } = useStorageLocations();

  const [editing, setEditing] = useState<WorkPlanTaskWithDetails | null | 'new'>(null);
  // Task per cui è aperta la modale "completa produzione" (solo per task legati a una produzione).
  const [completing, setCompleting] = useState<WorkPlanTaskWithDetails | null>(null);

  /**
   * Tocco sul cerchietto di un task per completarlo:
   * - se è già completato non fa nulla;
   * - se è legato a una produzione, apre la modale di dettaglio (serve scegliere
   *   da quale magazzino prendere gli ingredienti);
   * - altrimenti (task semplice) lo completa subito usando il primo magazzino
   *   disponibile come "sorgente" di default.
   */
  const handleToggle = (task: WorkPlanTaskWithDetails) => {
    if (task.status === 'completed') return;
    if (task.production_type) {
      setCompleting(task);
    } else if (locations[0]) {
      completeTask.mutate({ taskId: task.id, sourceLocationId: locations[0].id });
    }
  };

  /**
   * Sposta il giorno mostrato avanti/indietro di `days` giorni (-1 = ieri, +1 = domani).
   * Fatto interamente in UTC (parsing con "Z" + `setUTCDate` + `toISOString`, che è
   * già UTC): mischiare un orario locale con `toISOString` sfaserebbe la data di un
   * giorno nei fusi orari avanti rispetto a UTC (es. l'Italia), rendendo "avanti" un
   * no-op e "indietro" un salto di due giorni invece di uno.
   */
  const shiftDate = (days: number) => {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    setDate(next.toISOString().slice(0, 10));
  };

  const handleDelete = (task: WorkPlanTaskWithDetails) => {
    Alert.alert(t.workPlan.deleteTask, t.workPlan.deleteConfirm, [
      { text: t.recipes.cancel, style: 'cancel' },
      { text: t.workPlan.deleteTask, style: 'destructive', onPress: () => deleteTask.mutate(task.id) },
    ]);
  };

  // I task da fare prima, quelli già fatti dopo (stesso giorno, solo riordinati).
  const pending = tasks.filter((task) => task.status === 'pending');
  const completed = tasks.filter((task) => task.status === 'completed');

  return (
    <View style={styles.flex}>
      <PageHeader
        title={t.workPlan.title}
        subtitle={t.workPlan.subtitle}
        action={
          <Button
            label={t.workPlan.addTask}
            icon={<Feather name="plus" size={16} color={theme.primaryText} />}
            onPress={() => setEditing('new')}
          />
        }
      />

      {/* Navigazione giorno per giorno: freccia sinistra/destra, e toccando la data si torna a oggi */}
      <View style={styles.dateNav}>
        <IconButton icon="chevron-left" onPress={() => shiftDate(-1)} />
        <Pressable onPress={() => setDate(toIso(new Date()))} style={styles.dateLabel}>
          <ThemedText type="sectionTitle" style={styles.capitalize}>
            {formatDisplayDate(date, language)}
          </ThemedText>
        </Pressable>
        <IconButton icon="chevron-right" onPress={() => shiftDate(1)} />
      </View>

      {isLoading ? (
        <ThemedText themeColor="textSecondary">{t.common.loading}</ThemedText>
      ) : tasks.length === 0 ? (
        <EmptyState icon="check-square" message={t.workPlan.empty} />
      ) : (
        <FlatList
          data={[...pending, ...completed]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onToggle={() => handleToggle(item)}
              onEdit={() => setEditing(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <EditWorkPlanTaskModal
        visible={!!editing}
        onClose={() => setEditing(null)}
        task={editing === 'new' ? null : editing}
        date={date}
      />
      <CompleteTaskModal visible={!!completing} onClose={() => setCompleting(null)} task={completing} date={date} />
    </View>
  );
}

/**
 * Una riga task: cerchietto da toccare per completare, titolo (depennato se
 * fatto), note opzionali, e — solo se il task è legato a una produzione — un
 * badge con il riepilogo "produci X pezzi di Y → magazzino Z".
 */
function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: WorkPlanTaskWithDetails;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const done = task.status === 'completed';

  // Etichetta di cosa va prodotto: nome del componente, oppure "Ricetta — Variante".
  const productionLabel = task.production_type === 'component'
    ? task.component?.name
    : task.production_type === 'recipe_variant'
      ? `${task.variant?.recipe?.name ?? ''} — ${task.variant?.label ?? ''}`
      : null;
  // Unità di misura da mostrare accanto alla quantità: quella del componente, o "pezzi" per le varianti di ricetta.
  const productionUnit = task.production_type === 'component' ? task.component?.unit ?? '' : t.workPlan.unitPieces;

  return (
    <Card style={done ? styles.doneCard : undefined}>
      <View style={styles.taskRow}>
        <Pressable onPress={onToggle} disabled={done} hitSlop={8}>
          <Feather
            name={done ? 'check-circle' : 'circle'}
            size={22}
            color={done ? theme.success : theme.textSecondary}
          />
        </Pressable>

        <View style={styles.taskInfo}>
          <ThemedText type="smallBold" style={done ? styles.strikethrough : undefined}>
            {task.title}
          </ThemedText>
          {task.notes && (
            <ThemedText type="small" themeColor="textSecondary">
              {task.notes}
            </ThemedText>
          )}
          {productionLabel && (
            <View style={styles.badgeRow}>
              <Badge
                tone={done ? 'success' : 'primary'}
                label={`${t.workPlan.produce} ${task.quantity} ${productionUnit} ${productionLabel} → ${
                  task.target_location ? t.ingredients[task.target_location.type] : ''
                }`}
              />
            </View>
          )}
        </View>

        <IconButton icon="edit-2" onPress={onEdit} />
        <IconButton icon="trash-2" color="danger" onPress={onDelete} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three, marginBottom: Spacing.four },
  dateLabel: { minWidth: 200, alignItems: 'center' },
  capitalize: { textTransform: 'capitalize' },
  list: { gap: Spacing.three },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  taskInfo: { flex: 1, gap: 2 },
  badgeRow: { marginTop: Spacing.one },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.6 },
  doneCard: { opacity: 0.7 },
});
