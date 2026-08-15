import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Spacing, TabletBreakpoint } from '@/constants/theme';
import { useIngredients, useStorageLocations } from '@/features/ingredients/hooks';
import { useRecipes } from '@/features/recipes/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type { StorageLocationType } from '@/types/database';

export default function DashboardScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= TabletBreakpoint;

  const { data: ingredients = [] } = useIngredients();
  const { data: locations = [] } = useStorageLocations();
  const { data: recipes = [] } = useRecipes();

  const stats = useMemo(() => {
    const lowStockAlerts = locations.flatMap((location) =>
      ingredients
        .filter((ing) => {
          const entry = ing.stock[location.type as StorageLocationType];
          return !!entry && entry.min_threshold > 0 && entry.quantity <= entry.min_threshold;
        })
        .map((ing) => ({
          ingredient: ing,
          location,
          quantity: ing.stock[location.type as StorageLocationType]!.quantity,
          minThreshold: ing.stock[location.type as StorageLocationType]!.min_threshold,
        }))
    );

    const marginPcts = recipes.filter((r) => r.sell_price > 0).map((r) => r.marginPct);
    const avgMargin = marginPcts.length > 0 ? marginPcts.reduce((a, b) => a + b, 0) / marginPcts.length : 0;

    const stockByStorage = locations.map((location) => {
      const type = location.type as StorageLocationType;
      const withStock = ingredients.filter((ing) => (ing.stock[type]?.quantity ?? 0) > 0);
      const totalQuantity = withStock.reduce((sum, ing) => sum + (ing.stock[type]?.quantity ?? 0), 0);
      return { location, itemsCount: withStock.length, totalQuantity };
    });

    const topRecipes = [...recipes].sort((a, b) => b.margin - a.margin).slice(0, 5);

    return { lowStockAlerts, avgMargin, stockByStorage, topRecipes };
  }, [ingredients, locations, recipes]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} />

      <View style={styles.statsRow}>
        <StatCard label={t.dashboard.ingredients} value={String(ingredients.length)} icon="box" />
        <StatCard label={t.dashboard.recipes} value={String(recipes.length)} icon="coffee" />
        <StatCard label={t.dashboard.lowStockAlerts} value={String(stats.lowStockAlerts.length)} icon="alert-triangle" />
        <StatCard label={t.dashboard.avgMargin} value={`${stats.avgMargin.toFixed(1)}%`} icon="trending-up" />
      </View>

      <View style={[styles.twoColumn, !isWide && styles.oneColumn]}>
        <Card style={styles.flex1}>
          <ThemedText type="sectionTitle" style={styles.cardTitle}>
            {t.dashboard.stockByStorage}
          </ThemedText>
          <View style={styles.list}>
            {stats.stockByStorage.map(({ location, itemsCount, totalQuantity }) => (
              <View key={location.id} style={[styles.storageRow, { backgroundColor: theme.surfaceMuted }]}>
                <ThemedText>{location.name}</ThemedText>
                <View style={styles.storageRowRight}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {itemsCount} {t.dashboard.items}
                  </ThemedText>
                  <ThemedText type="smallBold">{totalQuantity}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.flex1}>
          <ThemedText type="sectionTitle" style={styles.cardTitle}>
            {t.dashboard.lowStockAlerts}
          </ThemedText>
          {stats.lowStockAlerts.length === 0 ? (
            <EmptyState icon="check-circle" message={t.dashboard.noAlerts} />
          ) : (
            <View style={styles.list}>
              {stats.lowStockAlerts.slice(0, 5).map((alert) => (
                <View key={`${alert.ingredient.id}-${alert.location.id}`}>
                  <ThemedText type="label" themeColor="textSecondary">
                    {alert.location.name.toUpperCase()}
                  </ThemedText>
                  <View style={[styles.alertRow, { backgroundColor: theme.dangerBg }]}>
                    <View style={styles.alertLeft}>
                      <Feather name="alert-triangle" size={14} color={theme.danger} />
                      <ThemedText themeColor="danger">{alert.ingredient.name}</ThemedText>
                    </View>
                    <ThemedText themeColor="danger" type="smallBold">
                      {alert.quantity} / {alert.minThreshold} {alert.ingredient.unit}
                    </ThemedText>
                  </View>
                </View>
              ))}
              {stats.lowStockAlerts.length > 5 && (
                <Link href="/low-stock">
                  <ThemedText type="link" themeColor="accent">
                    {t.lowStock.title} ({stats.lowStockAlerts.length}) →
                  </ThemedText>
                </Link>
              )}
            </View>
          )}
        </Card>
      </View>

      <Card>
        <ThemedText type="sectionTitle" style={styles.cardTitle}>
          {t.dashboard.topRecipesByMargin}
        </ThemedText>
        {stats.topRecipes.length === 0 ? (
          <EmptyState icon="coffee" message={t.recipes.empty} />
        ) : (
          <View style={styles.list}>
            {stats.topRecipes.map((recipe) => (
              <View key={recipe.id} style={styles.recipeRow}>
                <View style={styles.recipeLeft}>
                  <Badge label={recipe.category} />
                  <ThemedText>{recipe.name}</ThemedText>
                </View>
                <View style={styles.recipeRight}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.recipes.cost}: €{recipe.cost.toFixed(2)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.recipes.price}: €{recipe.sell_price.toFixed(2)}
                  </ThemedText>
                  <ThemedText type="smallBold" themeColor="accent">
                    €{recipe.margin.toFixed(2)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Spacing.four, paddingBottom: Spacing.six },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  twoColumn: { flexDirection: 'row', gap: Spacing.three },
  oneColumn: { flexDirection: 'column' },
  flex1: { flex: 1 },
  cardTitle: { marginBottom: Spacing.three },
  list: { gap: Spacing.two },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  storageRowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: 4,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  recipeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.two },
  recipeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  recipeRight: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
});
