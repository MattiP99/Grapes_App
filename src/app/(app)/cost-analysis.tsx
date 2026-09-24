import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { PageHeader } from '@/components/layout/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spacing } from '@/constants/theme';
import { useCostHistory } from '@/features/cost-analysis/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';

// Etichette fisse per l'asse X del grafico mensile (Gennaio→Dicembre, sempre in inglese
// abbreviato indipendentemente dalla lingua dell'app, solo per il grafico).
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * PAGINA: Analisi costi (rotta "/cost-analysis").
 *
 * Mostra come è variato nel tempo il costo di acquisto degli ingredienti,
 * usando lo storico dei prezzi salvato in `useCostHistory` (ogni volta che
 * arriva/si registra un acquisto, si salva uno "snapshot" del costo unitario).
 * Due filtri in alto: ingrediente specifico (o "tutti") e anno.
 * Due grafici:
 * 1. Andamento mensile del costo medio nell'anno selezionato (linea).
 * 2. Confronto del costo medio anno su anno, ultimi 4 anni (barre).
 */
export default function CostAnalysisScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { data: costHistory = [] } = useCostHistory();

  const [ingredientId, setIngredientId] = useState<string>('all');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  // Popola il menu a tendina "ingrediente" con tutti gli ingredienti che hanno
  // almeno una registrazione di costo, più la voce "Tutti gli ingredienti".
  const ingredientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of costHistory) map.set(row.ingredient_id, row.ingredient_name);
    return [{ label: t.costAnalysis.allIngredients, value: 'all' }, ...[...map.entries()].map(([value, label]) => ({ label, value }))];
  }, [costHistory, t.costAnalysis.allIngredients]);

  // Popola il menu a tendina "anno" con tutti gli anni presenti nello storico,
  // più l'anno corrente (nel caso non ci fossero ancora registrazioni quest'anno).
  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const row of costHistory) set.add(new Date(row.recorded_at).getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [costHistory, currentYear]);

  // Righe di storico limitate all'ingrediente selezionato (o tutte, se "all").
  const filteredRows = useMemo(
    () => (ingredientId === 'all' ? costHistory : costHistory.filter((r) => r.ingredient_id === ingredientId)),
    [costHistory, ingredientId]
  );

  /**
   * Calcola, per ciascuno dei 12 mesi dell'anno selezionato, il costo medio
   * registrato in quel mese. Se un mese non ha registrazioni, viene "riportato
   * avanti" il valore dell'ultimo mese noto (in questo modo il grafico non ha
   * buchi/valori a zero quando semplicemente non sono stati fatti acquisti).
   */
  const monthlyTrend = useMemo(() => {
    const monthlyAverages: (number | null)[] = Array(12).fill(null);
    for (let m = 0; m < 12; m++) {
      const rows = filteredRows.filter((r) => {
        const d = new Date(r.recorded_at);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      if (rows.length > 0) monthlyAverages[m] = rows.reduce((sum, r) => sum + r.cost, 0) / rows.length;
    }

    // Prima passata: riempi i mesi vuoti copiando il valore del mese precedente noto.
    let carry: number | null = null;
    for (let m = 0; m < 12; m++) {
      if (monthlyAverages[m] === null) monthlyAverages[m] = carry;
      else carry = monthlyAverages[m];
    }
    // Se non c'è NESSUN dato per l'intero anno, mostra una linea piatta a zero.
    if (monthlyAverages.every((v) => v === null)) return monthlyAverages.map(() => 0);
    // Seconda passata: i mesi che restano "null" (prima del primo dato disponibile)
    // vengono riempiti col primo valore noto, così il grafico parte comunque da un numero.
    let lastKnown = monthlyAverages.find((v) => v !== null) ?? 0;
    return monthlyAverages.map((v) => {
      if (v !== null) lastKnown = v;
      return lastKnown;
    });
  }, [filteredRows, year]);

  // Variazione percentuale tra inizio e fine dell'anno selezionato (mostrata nella terza statistica).
  const startOfYear = monthlyTrend[0] ?? 0;
  const latest = monthlyTrend[monthlyTrend.length - 1] ?? 0;
  const variation = startOfYear > 0 ? ((latest - startOfYear) / startOfYear) * 100 : 0;

  // Costo medio per ciascuno degli ultimi 4 anni presenti nello storico (grafico a barre).
  const yoyData = useMemo(() => {
    return years
      .slice(0, 4)
      .reverse()
      .map((y) => {
        const rows = filteredRows.filter((r) => new Date(r.recorded_at).getFullYear() === y);
        const avg = rows.length > 0 ? rows.reduce((sum, r) => sum + r.cost, 0) / rows.length : 0;
        return { value: Number(avg.toFixed(2)), label: String(y), frontColor: theme.accent };
      });
  }, [years, filteredRows, theme.accent]);

  const selectedIngredientName = ingredientOptions.find((o) => o.value === ingredientId)?.label ?? t.costAnalysis.allIngredients;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <PageHeader
        title={t.costAnalysis.title}
        subtitle={t.costAnalysis.subtitle}
        action={
          <View style={styles.filters}>
            <Select value={ingredientId} options={ingredientOptions} onChange={setIngredientId} />
            <Select
              value={String(year)}
              options={years.map((y) => ({ label: String(y), value: String(y) }))}
              onChange={(v) => setYear(Number(v))}
            />
          </View>
        }
      />

      {/* 3 numeri riassuntivi: costo a inizio anno, costo più recente, variazione % (verde se scende, rosso se sale) */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <ThemedText type="small" themeColor="textSecondary">
            {t.costAnalysis.startOfYear}
          </ThemedText>
          <ThemedText type="pageTitle" style={styles.statValue}>
            €{startOfYear.toFixed(2)}
          </ThemedText>
        </Card>
        <Card style={styles.statCard}>
          <ThemedText type="small" themeColor="textSecondary">
            {t.costAnalysis.latest}
          </ThemedText>
          <ThemedText type="pageTitle" style={styles.statValue}>
            €{latest.toFixed(2)}
          </ThemedText>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: variation >= 0 ? theme.dangerBg : theme.successBg }]}>
          <ThemedText type="small" themeColor={variation >= 0 ? 'danger' : 'success'}>
            {t.costAnalysis.variation}
          </ThemedText>
          <ThemedText type="pageTitle" themeColor={variation >= 0 ? 'danger' : 'success'} style={styles.statValue}>
            {variation >= 0 ? '+' : ''}
            {variation.toFixed(1)}%
          </ThemedText>
        </Card>
      </View>

      {/* Grafico a linea: costo medio mese per mese nell'anno selezionato */}
      <Card>
        <ThemedText type="sectionTitle">{t.costAnalysis.monthlyTrend}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.chartSubtitle}>
          {t.costAnalysis.perUnitAverage}
        </ThemedText>
        <View style={styles.chartWrap}>
          <LineChart
            data={monthlyTrend.map((value, i) => ({ value: value ?? 0, label: MONTH_LABELS[i] }))}
            color={theme.primary}
            thickness={2.5}
            curved
            spacing={44}
            initialSpacing={16}
            yAxisColor={theme.border}
            xAxisColor={theme.border}
            yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            dataPointsColor={theme.primary}
            noOfSections={4}
          />
        </View>
      </Card>

      {/* Grafico a barre: confronto del costo medio tra gli ultimi anni */}
      <Card>
        <ThemedText type="sectionTitle">{t.costAnalysis.yoyComparison}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.chartSubtitle}>
          {selectedIngredientName} — {t.costAnalysis.averageCostPerYear}
        </ThemedText>
        <View style={styles.chartWrap}>
          <BarChart
            data={yoyData}
            barWidth={40}
            spacing={28}
            roundedTop
            yAxisColor={theme.border}
            xAxisColor={theme.border}
            yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            noOfSections={4}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Spacing.four, paddingBottom: Spacing.six },
  filters: { flexDirection: 'row', gap: Spacing.two, minWidth: 260 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  statCard: { flex: 1, minWidth: 150, gap: Spacing.two },
  statValue: { fontSize: 24, lineHeight: 30 },
  chartSubtitle: { marginBottom: Spacing.three },
  chartWrap: { paddingVertical: Spacing.two },
});
