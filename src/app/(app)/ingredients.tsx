import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Spacing, TabletBreakpoint } from '@/constants/theme';
import { EditIngredientModal } from '@/features/ingredients/EditIngredientModal';
import { useDeleteIngredient, useIngredients } from '@/features/ingredients/hooks';
import { MoveStockModal } from '@/features/ingredients/MoveStockModal';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { IngredientWithStock, StorageLocationType } from '@/types/database';

type FilterValue = 'all' | StorageLocationType;

export default function IngredientsScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= TabletBreakpoint;

  const { data: ingredients = [], isLoading } = useIngredients();
  const deleteIngredient = useDeleteIngredient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [editing, setEditing] = useState<IngredientWithStock | null | 'new'>(null);
  const [moving, setMoving] = useState<IngredientWithStock | null>(null);

  const filtered = useMemo(() => {
    return ingredients.filter((ing) => {
      if (search && !ing.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter !== 'all' && !((ing.stock[filter]?.quantity ?? 0) > 0)) return false;
      return true;
    });
  }, [ingredients, search, filter]);

  const handleDelete = (ingredient: IngredientWithStock) => {
    Alert.alert(t.ingredients.delete, t.ingredients.deleteConfirm, [
      { text: t.ingredients.cancel, style: 'cancel' },
      { text: t.ingredients.delete, style: 'destructive', onPress: () => deleteIngredient.mutate(ingredient.id) },
    ]);
  };

  return (
    <View style={styles.flex}>
      <PageHeader
        title={t.ingredients.title}
        subtitle={t.ingredients.subtitle}
        action={<Button label={t.ingredients.add} icon={<Feather name="plus" size={16} color={theme.primaryText} />} onPress={() => setEditing('new')} />}
      />

      <View style={styles.controls}>
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { label: t.ingredients.all, value: 'all' },
            { label: t.ingredients.fridge, value: 'fridge' },
            { label: t.ingredients.freezer, value: 'freezer' },
            { label: t.ingredients.pantry, value: 'pantry' },
          ]}
        />
        <SearchInput value={search} onChangeText={setSearch} placeholder={t.ingredients.search} />
      </View>

      {isLoading ? (
        <ThemedText themeColor="textSecondary">{t.common.loading}</ThemedText>
      ) : filtered.length === 0 ? (
        <EmptyState icon="box" message={t.ingredients.empty} />
      ) : isWide ? (
        <Card style={styles.tableCard}>
          <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
            <ThemedText type="label" themeColor="textSecondary" style={styles.colName}>
              {t.ingredients.name}
            </ThemedText>
            <ThemedText type="label" themeColor="textSecondary" style={styles.colStock}>
              {t.ingredients.fridge}
            </ThemedText>
            <ThemedText type="label" themeColor="textSecondary" style={styles.colStock}>
              {t.ingredients.freezer}
            </ThemedText>
            <ThemedText type="label" themeColor="textSecondary" style={styles.colStock}>
              {t.ingredients.pantry}
            </ThemedText>
            <ThemedText type="label" themeColor="textSecondary" style={styles.colCost}>
              {t.ingredients.unitCost}
            </ThemedText>
            <ThemedText type="label" themeColor="textSecondary" style={styles.colSupplier}>
              {t.ingredients.supplier}
            </ThemedText>
            <ThemedText type="label" themeColor="textSecondary" style={styles.colActions}>
              {t.ingredients.actions}
            </ThemedText>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <IngredientTableRow
                ingredient={item}
                onEdit={() => setEditing(item)}
                onMove={() => setMoving(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
          />
        </Card>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: Spacing.three }}
          renderItem={({ item }) => (
            <IngredientCardRow
              ingredient={item}
              onEdit={() => setEditing(item)}
              onMove={() => setMoving(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <EditIngredientModal
        visible={!!editing}
        onClose={() => setEditing(null)}
        ingredient={editing === 'new' ? null : editing}
      />
      <MoveStockModal visible={!!moving} onClose={() => setMoving(null)} ingredient={moving} />
    </View>
  );
}

function StockCell({ ingredient, type }: { ingredient: IngredientWithStock; type: StorageLocationType }) {
  const theme = useTheme();
  const entry = ingredient.stock[type];
  const isLow = !!entry && entry.min_threshold > 0 && entry.quantity <= entry.min_threshold;

  if (!entry || entry.quantity === 0) {
    return (
      <ThemedText themeColor="textSecondary" style={styles.colStock}>
        —
      </ThemedText>
    );
  }

  return (
    <View style={[styles.colStock, styles.stockCellContent]}>
      {isLow && <Feather name="alert-triangle" size={12} color={theme.danger} />}
      <ThemedText themeColor={isLow ? 'danger' : 'text'}>
        {entry.quantity} {ingredient.unit}
      </ThemedText>
    </View>
  );
}

function IngredientTableRow({
  ingredient,
  onEdit,
  onMove,
  onDelete,
}: {
  ingredient: IngredientWithStock;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
      <ThemedText style={styles.colName}>{ingredient.name}</ThemedText>
      <StockCell ingredient={ingredient} type="fridge" />
      <StockCell ingredient={ingredient} type="freezer" />
      <StockCell ingredient={ingredient} type="pantry" />
      <ThemedText style={styles.colCost}>€{ingredient.cost_per_unit.toFixed(2)}</ThemedText>
      <ThemedText themeColor="accent" style={styles.colSupplier}>
        {ingredient.supplier ?? '—'}
      </ThemedText>
      <View style={[styles.colActions, styles.actionsRow]}>
        <IconButton icon="repeat" onPress={onMove} />
        <IconButton icon="edit-2" onPress={onEdit} />
        <IconButton icon="trash-2" color="danger" onPress={onDelete} />
      </View>
    </View>
  );
}

function IngredientCardRow({
  ingredient,
  onEdit,
  onMove,
  onDelete,
}: {
  ingredient: IngredientWithStock;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const t = useTranslation();
  const types: StorageLocationType[] = ['fridge', 'freezer', 'pantry'];
  const labels = { fridge: t.ingredients.fridge, freezer: t.ingredients.freezer, pantry: t.ingredients.pantry };

  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="sectionTitle">{ingredient.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            €{ingredient.cost_per_unit.toFixed(2)} / {ingredient.unit}
            {ingredient.supplier ? ` · ${ingredient.supplier}` : ''}
          </ThemedText>
        </View>
        <View style={styles.actionsRow}>
          <IconButton icon="repeat" onPress={onMove} />
          <IconButton icon="edit-2" onPress={onEdit} />
          <IconButton icon="trash-2" color="danger" onPress={onDelete} />
        </View>
      </View>

      <View style={styles.badgeRow}>
        {types.map((type) => {
          const entry = ingredient.stock[type];
          const isLow = !!entry && entry.min_threshold > 0 && entry.quantity <= entry.min_threshold;
          if (!entry || entry.quantity === 0) return null;
          return (
            <Badge
              key={type}
              tone={isLow ? 'danger' : 'neutral'}
              label={`${labels[type]}: ${entry.quantity} ${ingredient.unit}`}
            />
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.four, justifyContent: 'space-between' },
  tableCard: { padding: 0, flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colName: { flex: 2 },
  colStock: { flex: 1 },
  colCost: { flex: 1 },
  colSupplier: { flex: 1.4 },
  colActions: { flex: 1.2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.one, justifyContent: 'flex-end' },
  stockCellContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.three },
});
