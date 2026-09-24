import { Feather } from '@expo/vector-icons';
import { SectionList, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spacing } from '@/constants/theme';
import { useIngredients, useStorageLocations } from '@/features/ingredients/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type { IngredientWithStock, StorageLocationType } from '@/types/database';

/** Una riga della lista: un ingrediente sotto soglia in un magazzino specifico. */
interface LowStockRow {
  ingredient: IngredientWithStock;
  quantity: number;
  minThreshold: number;
}

/**
 * PAGINA: Scorte basse (rotta "/low-stock").
 *
 * Versione "espansa" dell'allarme che si vede in anteprima nella Dashboard:
 * qui si vedono TUTTI gli ingredienti sotto la soglia minima impostata, non
 * solo i primi 5. Sono raggruppati per magazzino (una sezione per Frigo,
 * Freezer, Dispensa — solo se quel magazzino ha effettivamente qualcosa in
 * allarme). Pagina di sola lettura: da qui non si modifica nulla, per farlo
 * bisogna andare nella pagina Ingredienti.
 */
export default function LowStockScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { data: ingredients = [], isLoading } = useIngredients();
  const { data: locations = [] } = useStorageLocations();

  // Costruisce le "sezioni" per la SectionList: una per magazzino, con dentro
  // solo gli ingredienti che in QUEL magazzino sono scesi sotto la soglia minima.
  // I magazzini senza nessun allarme vengono scartati (niente sezioni vuote).
  const sections = locations
    .map((location) => {
      const rows: LowStockRow[] = ingredients
        .filter((ing) => {
          const entry = ing.stock[location.type as StorageLocationType];
          return !!entry && entry.min_threshold > 0 && entry.quantity <= entry.min_threshold;
        })
        .map((ing) => {
          const entry = ing.stock[location.type as StorageLocationType]!;
          return { ingredient: ing, quantity: entry.quantity, minThreshold: entry.min_threshold };
        });
      return { title: location.name, data: rows };
    })
    .filter((section) => section.data.length > 0);

  return (
    <View style={styles.flex}>
      <PageHeader title={t.lowStock.title} subtitle={t.lowStock.subtitle} />

      {!isLoading && sections.length === 0 ? (
        <EmptyState icon="check-circle" message={t.lowStock.empty} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.ingredient.id}
          renderSectionHeader={({ section }) => (
            <ThemedText type="label" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title.toUpperCase()}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <Card style={[styles.row, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBg }]}>
              <View style={styles.rowLeft}>
                <Feather name="alert-triangle" size={16} color={theme.danger} />
                <ThemedText themeColor="danger">{item.ingredient.name}</ThemedText>
              </View>
              <ThemedText themeColor="danger" type="smallBold">
                {item.quantity} / {item.minThreshold} {item.ingredient.unit}
              </ThemedText>
            </Card>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Spacing.two },
  sectionHeader: { marginTop: Spacing.three, marginBottom: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
