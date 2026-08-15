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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CostAnalysisScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { data: costHistory = [] } = useCostHistory();

  const [ingredientId, setIngredientId] = useState<string>('all');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const ingredientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of costHistory) map.set(row.ingredient_id, row.ingredient_name);
    return [{ label: t.costAnalysis.allIngredients, value: 'all' }, ...[...map.entries()].map(([value, label]) => ({ label, value }))];
  }, [costHistory, t.costAnalysis.allIngredients]);

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const row of costHistory) set.add(new Date(row.recorded_at).getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [costHistory, currentYear]);

  const filteredRows = useMemo(
    () => (ingredientId === 'all' ? costHistory : costHistory.filter((r) => r.ingredient_id === ingredientId)),
    [costHistory, ingredientId]
  );

  const monthlyTrend = useMemo(() => {
    const monthlyAverages: (number | null)[] = Array(12).fill(null);
    for (let m = 0; m < 12; m++) {
      const rows = filteredRows.filter((r) => {
        const d = new Date(r.recorded_at);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      if (rows.length > 0) monthlyAverages[m] = rows.reduce((sum, r) => sum + r.cost, 0) / rows.length;
    }

    let carry: number | null = null;
    for (let m = 0; m < 12; m++) {
      if (monthlyAverages[m] === null) monthlyAverages[m] = carry;
      else carry = monthlyAverages[m];
    }
    if (monthlyAverages.every((v) => v === null)) return monthlyAverages.map(() => 0);
    let lastKnown = monthlyAverages.find((v) => v !== null) ?? 0;
    return monthlyAverages.map((v) => {
      if (v !== null) lastKnown = v;
      return lastKnown;
    });
  }, [filteredRows, year]);

  const startOfYear = monthlyTrend[0] ?? 0;
  const latest = monthlyTrend[monthlyTrend.length - 1] ?? 0;
  const variation = startOfYear > 0 ? ((latest - startOfYear) / startOfYear) * 100 : 0;

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
