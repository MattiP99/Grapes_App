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
import { SearchInput } from '@/components/ui/SearchInput';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Spacing } from '@/constants/theme';
import { EditComponentModal } from '@/features/components/EditComponentModal';
import { useComponents, useDeleteComponent } from '@/features/components/hooks';
import { EditRecipeModal } from '@/features/recipes/EditRecipeModal';
import { useDeleteRecipe, useRecipes } from '@/features/recipes/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type { ComponentWithCost, RecipeWithVariants } from '@/types/database';

type Tab = 'recipes' | 'components';

export default function RecipesScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('recipes');
  const [search, setSearch] = useState('');
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithVariants | null | 'new'>(null);
  const [editingComponent, setEditingComponent] = useState<ComponentWithCost | null | 'new'>(null);

  return (
    <View style={styles.flex}>
      <PageHeader
        title={tab === 'recipes' ? t.recipes.title : t.components.title}
        subtitle={tab === 'recipes' ? t.recipes.subtitle : t.components.subtitle}
        action={
          <Button
            label={tab === 'recipes' ? t.recipes.add : t.components.add}
            icon={<Feather name="plus" size={16} color={theme.primaryText} />}
            onPress={() => (tab === 'recipes' ? setEditingRecipe('new') : setEditingComponent('new'))}
          />
        }
      />

      <View style={styles.controlsRow}>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { label: t.recipes.tabRecipes, value: 'recipes' },
            { label: t.recipes.tabComponents, value: 'components' },
          ]}
        />
        <SearchInput value={search} onChangeText={setSearch} placeholder={t.recipes.search} />
      </View>

      <View style={styles.spacer} />

      {tab === 'recipes' ? (
        <RecipesTab search={search} editing={editingRecipe} setEditing={setEditingRecipe} />
      ) : (
        <ComponentsTab search={search} editing={editingComponent} setEditing={setEditingComponent} />
      )}
    </View>
  );
}

function RecipesTab({
  search,
  editing,
  setEditing,
}: {
  search: string;
  editing: RecipeWithVariants | null | 'new';
  setEditing: (value: RecipeWithVariants | null | 'new') => void;
}) {
  const t = useTranslation();
  const { data: recipes = [], isLoading } = useRecipes();
  const deleteRecipe = useDeleteRecipe();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = (recipe: RecipeWithVariants) => {
    Alert.alert(t.recipes.delete, t.recipes.deleteConfirm, [
      { text: t.recipes.cancel, style: 'cancel' },
      { text: t.recipes.delete, style: 'destructive', onPress: () => deleteRecipe.mutate(recipe.id) },
    ]);
  };

  return (
    <>
      {isLoading ? (
        <ThemedText themeColor="textSecondary">{t.common.loading}</ThemedText>
      ) : filtered.length === 0 ? (
        <EmptyState icon="coffee" message={t.recipes.empty} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RecipeRow
              recipe={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
              onEdit={() => setEditing(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <EditRecipeModal visible={!!editing} onClose={() => setEditing(null)} recipe={editing === 'new' ? null : editing} />
    </>
  );
}

function ComponentsTab({
  search,
  editing,
  setEditing,
}: {
  search: string;
  editing: ComponentWithCost | null | 'new';
  setEditing: (value: ComponentWithCost | null | 'new') => void;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const { data: components = [], isLoading } = useComponents();
  const deleteComponent = useDeleteComponent();

  const filtered = components.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = (component: ComponentWithCost) => {
    Alert.alert(t.components.delete, t.components.deleteConfirm, [
      { text: t.recipes.cancel, style: 'cancel' },
      { text: t.components.delete, style: 'destructive', onPress: () => deleteComponent.mutate(component.id) },
    ]);
  };

  return (
    <>
      {isLoading ? (
        <ThemedText themeColor="textSecondary">{t.common.loading}</ThemedText>
      ) : filtered.length === 0 ? (
        <EmptyState icon="layers" message={t.components.empty} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <ThemedText type="sectionTitle">{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.batch_yield} {item.unit}
                  </ThemedText>
                </View>
                <View style={styles.headerRight}>
                  <ThemedText type="smallBold" themeColor="accent">
                    €{item.costPerUnit.toFixed(2)} / {item.unit}
                  </ThemedText>
                  <IconButton icon="edit-2" onPress={() => setEditing(item)} />
                  <IconButton icon="trash-2" color="danger" onPress={() => handleDelete(item)} />
                </View>
              </View>
              {item.ingredients.length > 0 && (
                <View style={[styles.details, { borderTopColor: theme.border }]}>
                  {item.ingredients.map((ci) => (
                    <ThemedText key={ci.id} type="small" themeColor="textSecondary">
                      · {ci.ingredient.name}: {ci.quantity} {ci.ingredient.unit}
                    </ThemedText>
                  ))}
                </View>
              )}
            </Card>
          )}
        />
      )}

      <EditComponentModal visible={!!editing} onClose={() => setEditing(null)} component={editing === 'new' ? null : editing} />
    </>
  );
}

function RecipeRow({
  recipe,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  recipe: RecipeWithVariants;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslation();
  const theme = useTheme();

  return (
    <Card>
      <Pressable onPress={onToggle} style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather
            name="chevron-right"
            size={16}
            color={theme.textSecondary}
            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          />
          <Badge label={recipe.category} />
          <ThemedText type="sectionTitle">{recipe.name}</ThemedText>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.priceCol}>
            <ThemedText type="small" themeColor="textSecondary">
              {t.recipes.cost}
            </ThemedText>
            <ThemedText type="smallBold">€{recipe.cost.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.priceCol}>
            <ThemedText type="small" themeColor="textSecondary">
              {t.recipes.price}
            </ThemedText>
            <ThemedText type="smallBold">€{recipe.sell_price.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.priceCol}>
            <ThemedText type="small" themeColor="textSecondary">
              {t.recipes.margin}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="accent">
              €{recipe.margin.toFixed(2)} ({recipe.marginPct.toFixed(0)}%)
            </ThemedText>
          </View>
          <IconButton icon="edit-2" onPress={onEdit} />
          <IconButton icon="trash-2" color="danger" onPress={onDelete} />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.details, { borderTopColor: theme.border }]}>
          {recipe.description && (
            <ThemedText type="small" themeColor="textSecondary">
              {recipe.description}
            </ThemedText>
          )}
          {recipe.variants.map((variant) => (
            <View key={variant.id} style={styles.variantBlock}>
              <ThemedText type="smallBold">
                {variant.label} — {variant.total_weight}g · {variant.portions} {t.recipes.portions.toLowerCase()} · €{variant.cost.toFixed(2)}
              </ThemedText>
              {variant.ingredients.map((line) => {
                const source = line.ingredient ?? line.component;
                if (!source) return null;
                return (
                  <ThemedText key={line.id} type="small" themeColor="textSecondary">
                    · {source.name}: {line.quantity} {line.ingredient ? line.ingredient.unit : line.component?.unit}
                  </ThemedText>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spacer: { height: Spacing.four },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'space-between' },
  list: { gap: Spacing.three },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  priceCol: { alignItems: 'flex-end' },
  details: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  variantBlock: { gap: 2 },
});
