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

/**
 * PAGINA: Dashboard (rotta "/", prima schermata dopo il login).
 *
 * È una vista di riepilogo "a colpo d'occhio": non permette di modificare nulla,
 * mostra solo numeri e liste calcolati a partire dai dati già caricati da altre
 * sezioni (ingredienti, ricette, magazzini). Contiene 4 blocchi:
 * 1. Le 4 statistiche in alto (StatCard): totale ingredienti, totale ricette,
 *    quanti allarmi di scorte basse ci sono, margine medio delle ricette.
 * 2. Riepilogo scorte per magazzino (frigo/freezer/dispensa).
 * 3. Le prime 5 scorte in allarme (sotto la soglia minima impostata).
 * 4. Le 5 ricette col margine più alto.
 */
export default function DashboardScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // Sotto la soglia "tablet" la pagina passa da due colonne a una sola (vedi styles.oneColumn).
  const isWide = width >= TabletBreakpoint;

  const { data: ingredients = [] } = useIngredients();
  const { data: locations = [] } = useStorageLocations();
  const { data: recipes = [] } = useRecipes();

  /**
   * Ricalcola tutte le statistiche della dashboard ogni volta che cambiano gli
   * ingredienti, i magazzini o le ricette (useMemo evita di rifare i calcoli ad
   * ogni render se i dati non sono cambiati).
   */
  const stats = useMemo(() => {
    // Per ogni magazzino, trova gli ingredienti la cui quantità è scesa sotto
    // (o uguale) alla soglia minima impostata per quel magazzino specifico.
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

    // Margine medio (%) calcolato solo sulle ricette che hanno un prezzo di vendita impostato.
    const marginPcts = recipes.filter((r) => r.sell_price > 0).map((r) => r.marginPct);
    const avgMargin = marginPcts.length > 0 ? marginPcts.reduce((a, b) => a + b, 0) / marginPcts.length : 0;

    // Per ogni magazzino: quanti ingredienti diversi contiene e la quantità totale.
    const stockByStorage = locations.map((location) => {
      const type = location.type as StorageLocationType;
      const withStock = ingredients.filter((ing) => (ing.stock[type]?.quantity ?? 0) > 0);
      const totalQuantity = withStock.reduce((sum, ing) => sum + (ing.stock[type]?.quantity ?? 0), 0);
      return { location, itemsCount: withStock.length, totalQuantity };
    });

    // Le 5 ricette più profittevoli (margine in valore assoluto, non percentuale).
    const topRecipes = [...recipes].sort((a, b) => b.margin - a.margin).slice(0, 5);

    return { lowStockAlerts, avgMargin, stockByStorage, topRecipes };
  }, [ingredients, locations, recipes]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} />

      {/* Riga delle 4 statistiche principali */}
      <View style={styles.statsRow}>
        <StatCard label={t.dashboard.ingredients} value={String(ingredients.length)} icon="box" />
        <StatCard label={t.dashboard.recipes} value={String(recipes.length)} icon="coffee" />
        <StatCard label={t.dashboard.lowStockAlerts} value={String(stats.lowStockAlerts.length)} icon="alert-triangle" />
        <StatCard label={t.dashboard.avgMargin} value={`${stats.avgMargin.toFixed(1)}%`} icon="trending-up" />
      </View>

      <View style={[styles.twoColumn, !isWide && styles.oneColumn]}>
        {/* Colonna sinistra: quantità totale per ogni magazzino */}
        <Card style={styles.flex1}>
          <ThemedText type="sectionTitle" style={styles.cardTitle}>
            {t.dashboard.stockByStorage}
          </ThemedText>
          <View style={styles.list}>
            {stats.stockByStorage.map(({ location, itemsCount, totalQuantity }) => (
              <View key={location.id} style={[styles.storageRow, { backgroundColor: theme.surfaceMuted }]}>
                <ThemedText>{t.ingredients[location.type as StorageLocationType]}</ThemedText>
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

        {/* Colonna destra: le prime 5 scorte sotto soglia minima, con link alla pagina completa se ce ne sono di più */}
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
                    {t.ingredients[alert.location.type as StorageLocationType].toUpperCase()}
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

      {/* Classifica delle ricette più profittevoli */}
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
                  <Badge label={t.recipes.categories[recipe.category as keyof typeof t.recipes.categories] ?? recipe.category} />
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
