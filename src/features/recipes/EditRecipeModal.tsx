import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { AppModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { RECIPE_CATEGORIES } from '@/constants/units';
import { Spacing } from '@/constants/theme';
import { useComponents } from '@/features/components/hooks';
import { useIngredients } from '@/features/ingredients/hooks';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeWithVariants } from '@/types/database';

import { useUpsertRecipe } from './hooks';

// Genera identificatori temporanei univoci per varianti/righe non ancora
// salvate (servono solo come `key` di React, mai inviati al database).
let tempIdCounter = 0;
function tempId() {
  tempIdCounter += 1;
  return `tmp-${Date.now()}-${tempIdCounter}`;
}

/** Una riga ingrediente di una variante può puntare a un ingrediente "semplice" oppure a un componente/semilavorato. */
type IngredientSource = 'ingredient' | 'component';

interface IngredientLine {
  key: string;
  source: IngredientSource;
  ref_id: string | null;
  quantity: string;
}

/** Una variante ancora "in bozza" nel form (numeri come stringhe perché sono testo digitato). */
interface VariantForm {
  key: string;
  /** Presente solo se questa variante esiste già sul database (si sta modificando, non creando). */
  id?: string;
  label: string;
  total_weight: string;
  portions: string;
  ingredients: IngredientLine[];
}

/** Una variante vuota di partenza, usata sia per una ricetta nuova sia quando si clicca "Aggiungi variante". */
function emptyVariant(label: string): VariantForm {
  return { key: tempId(), label, total_weight: '', portions: '1', ingredients: [] };
}

/**
 * Modale di creazione/modifica di una ricetta — il form più complesso
 * dell'app, perché una ricetta può avere PIÙ varianti (es. "Piccola"/"Grande"),
 * e ognuna ha una sua lista di ingredienti indipendente. Ogni riga ingrediente
 * di una variante può puntare a un ingrediente semplice OPPURE a un
 * componente/semilavorato (selettore "source" a sinistra di ogni riga),
 * quindi lo stato del form è annidato: lista di varianti → lista di righe
 * ingrediente per ciascuna.
 */
export function EditRecipeModal({
  visible,
  onClose,
  recipe,
}: {
  visible: boolean;
  onClose: () => void;
  recipe: RecipeWithVariants | null;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const { data: ingredients = [] } = useIngredients();
  const { data: components = [] } = useComponents();
  const upsert = useUpsertRecipe();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(RECIPE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [sellPrice, setSellPrice] = useState('0');
  // Si parte sempre con almeno una variante ("Standard"): non ha senso una ricetta senza nessuna variante.
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant('Standard')]);

  useEffect(() => {
    if (!visible) return;
    if (recipe) {
      setName(recipe.name);
      setCategory(recipe.category);
      setDescription(recipe.description ?? '');
      setSellPrice(String(recipe.sell_price));
      setVariants(
        recipe.variants.length > 0
          ? recipe.variants.map((v) => ({
              key: v.id,
              id: v.id,
              label: v.label,
              total_weight: String(v.total_weight),
              portions: String(v.portions),
              ingredients: v.ingredients.map((i) => ({
                key: i.id,
                // Ogni riga salvata ha SOLO ingredient_id o SOLO component_id compilato: da quale dei
                // due non è null si deduce se questa riga era un ingrediente o un componente.
                source: i.component_id ? 'component' : 'ingredient',
                ref_id: i.ingredient_id ?? i.component_id,
                quantity: String(i.quantity),
              })),
            }))
          : [emptyVariant('Standard')]
      );
    } else {
      setName('');
      setCategory(RECIPE_CATEGORIES[0]);
      setDescription('');
      setSellPrice('0');
      setVariants([emptyVariant('Standard')]);
    }
  }, [visible, recipe]);

  const ingredientOptions = ingredients.map((i) => ({ label: `${i.name} (${i.unit})`, value: i.id }));
  const componentOptions = components.map((c) => ({ label: `${c.name} (€${c.costPerUnit.toFixed(2)}/${c.unit})`, value: c.id }));

  /** Aggiorna i campi di UNA variante specifica (identificata dalla sua `key`), lasciando le altre intatte. */
  const updateVariant = (key: string, patch: Partial<VariantForm>) => {
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  };

  const addVariant = () => setVariants((vs) => [...vs, emptyVariant(`Variant ${vs.length + 1}`)]);
  const removeVariant = (key: string) => setVariants((vs) => vs.filter((v) => v.key !== key));

  /** Aggiunge una riga ingrediente vuota alla variante `variantKey` (non alle altre). */
  const addIngredientLine = (variantKey: string) => {
    setVariants((vs) =>
      vs.map((v) =>
        v.key === variantKey
          ? { ...v, ingredients: [...v.ingredients, { key: tempId(), source: 'ingredient', ref_id: ingredients[0]?.id ?? null, quantity: '' }] }
          : v
      )
    );
  };
  /** Aggiorna una riga ingrediente specifica, individuata da variante + riga (doppia chiave, perché le righe sono annidate dentro le varianti). */
  const updateIngredientLine = (variantKey: string, lineKey: string, patch: Partial<IngredientLine>) => {
    setVariants((vs) =>
      vs.map((v) =>
        v.key === variantKey
          ? { ...v, ingredients: v.ingredients.map((i) => (i.key === lineKey ? { ...i, ...patch } : i)) }
          : v
      )
    );
  };
  const removeIngredientLine = (variantKey: string, lineKey: string) => {
    setVariants((vs) =>
      vs.map((v) => (v.key === variantKey ? { ...v, ingredients: v.ingredients.filter((i) => i.key !== lineKey) } : v))
    );
  };

  // Si può salvare solo se c'è un nome e OGNI variante ha un'etichetta e un peso totale positivo
  // (le righe ingrediente invece sono opzionali: una variante può anche non averne ancora).
  const canSave =
    name.trim().length > 0 &&
    variants.length > 0 &&
    variants.every((v) => v.label.trim().length > 0 && Number(v.total_weight) > 0);

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: recipe?.id,
      name: name.trim(),
      category,
      description: description.trim() || null,
      sell_price: Number(sellPrice.replace(',', '.')) || 0,
      variants: variants.map((v) => ({
        id: v.id,
        label: v.label.trim(),
        total_weight: Number(v.total_weight.replace(',', '.')) || 0,
        portions: Number(v.portions) || 1,
        // Righe senza riferimento scelto o senza quantità valida vengono scartate; qui si
        // "riespande" `source` + `ref_id` nel formato che l'API si aspetta (ingredient_id XOR component_id).
        ingredients: v.ingredients
          .filter((i) => i.ref_id && Number(i.quantity) > 0)
          .map((i) =>
            i.source === 'component'
              ? { component_id: i.ref_id!, quantity: Number(i.quantity.replace(',', '.')) }
              : { ingredient_id: i.ref_id!, quantity: Number(i.quantity.replace(',', '.')) }
          ),
      })),
    });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={recipe ? t.recipes.edit : t.recipes.add}
      maxWidth={620}
      footer={
        <>
          <Button label={t.recipes.cancel} variant="ghost" onPress={onClose} />
          <Button label={t.recipes.save} onPress={handleSave} loading={upsert.isPending} disabled={!canSave} />
        </>
      }>
      <TextField label={t.recipes.name} value={name} onChangeText={setName} />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Select
            label={t.recipes.category}
            value={category as any}
            options={RECIPE_CATEGORIES.map((c) => ({ label: t.recipes.categories[c], value: c }))}
            onChange={setCategory}
          />
        </View>
        <View style={styles.flex1}>
          <TextField label={t.recipes.sellingPrice} value={sellPrice} onChangeText={setSellPrice} keyboardType="decimal-pad" />
        </View>
      </View>

      <TextField label={t.recipes.description} value={description} onChangeText={setDescription} multiline numberOfLines={3} />

      <View style={styles.variantsHeader}>
        <ThemedText type="label" themeColor="textSecondary">
          {t.recipes.variants}
        </ThemedText>
        <Button label={t.recipes.addVariant} variant="secondary" onPress={addVariant} icon={<Feather name="plus" size={14} color={theme.text} />} />
      </View>

      {/* Una card per ogni variante: etichetta/peso/porzioni in alto, sotto le sue righe ingrediente */}
      {variants.map((variant) => (
        <Card key={variant.key} muted style={styles.variantCard}>
          <View style={styles.row}>
            <View style={styles.flex2}>
              <TextField label={t.recipes.variantLabel} value={variant.label} onChangeText={(v) => updateVariant(variant.key, { label: v })} />
            </View>
            <View style={styles.flex1}>
              <TextField
                label={t.recipes.totalWeight}
                value={variant.total_weight}
                onChangeText={(v) => updateVariant(variant.key, { total_weight: v })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex1}>
              <TextField
                label={t.recipes.portions}
                value={variant.portions}
                onChangeText={(v) => updateVariant(variant.key, { portions: v })}
                keyboardType="number-pad"
              />
            </View>
            {/* Non si può eliminare l'ultima variante rimasta: una ricetta deve averne sempre almeno una. */}
            {variants.length > 1 && <IconButton icon="trash-2" color="danger" onPress={() => removeVariant(variant.key)} />}
          </View>

          <View style={styles.ingredientsHeader}>
            <ThemedText type="label" themeColor="textSecondary">
              {t.recipes.ingredients}
            </ThemedText>
            <IconButton icon="plus" onPress={() => addIngredientLine(variant.key)} />
          </View>

          {variant.ingredients.map((line) => (
            <View key={line.key} style={styles.ingredientRow}>
              {/* Primo selettore: "è un ingrediente o un componente?" — cambia le opzioni del secondo selettore */}
              <View style={styles.flexSource}>
                <Select
                  value={line.source}
                  options={[
                    { label: t.recipes.ingredientSource, value: 'ingredient' },
                    { label: t.recipes.componentSource, value: 'component' },
                  ]}
                  onChange={(v) =>
                    updateIngredientLine(variant.key, line.key, {
                      source: v as IngredientSource,
                      // Cambiando tipo, il riferimento scelto prima non ha più senso: si sceglie il primo disponibile del nuovo tipo.
                      ref_id: v === 'component' ? components[0]?.id ?? null : ingredients[0]?.id ?? null,
                    })
                  }
                />
              </View>
              <View style={styles.flex2}>
                <Select
                  value={line.ref_id}
                  options={line.source === 'component' ? componentOptions : ingredientOptions}
                  onChange={(v) => updateIngredientLine(variant.key, line.key, { ref_id: v })}
                  placeholder={line.source === 'component' ? t.recipes.componentSource : t.recipes.ingredientSource}
                />
              </View>
              <TextField
                value={line.quantity}
                onChangeText={(v) => updateIngredientLine(variant.key, line.key, { quantity: v })}
                keyboardType="decimal-pad"
                style={styles.quantityInput}
              />
              <IconButton icon="trash-2" onPress={() => removeIngredientLine(variant.key, line.key)} />
            </View>
          ))}
        </Card>
      ))}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  flexSource: { flex: 1.2 },
  variantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  variantCard: { gap: Spacing.two },
  ingredientsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  quantityInput: { width: 80, textAlign: 'center' },
});
