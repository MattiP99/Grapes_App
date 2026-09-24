import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Selettore "a tab" orizzontale (es. Ricette/Componenti, Tutti/Frigo/Freezer/Dispensa,
 * Mese/Settimana/Giorno) — solo una opzione selezionabile alla volta,
 * evidenziata con sfondo e bordo diversi. Racchiuso in uno ScrollView
 * orizzontale nel caso le opzioni non entrino tutte nella larghezza disponibile.
 * `style={styles.scroll}` con `flexGrow: 0` impedisce a questo componente di
 * "allargarsi" oltre il necessario e schiacciare altri elementi nella stessa
 * riga (es. `SearchInput` quando compaiono affiancati).
 */
export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.tab,
              { borderColor: theme.border },
              active && { backgroundColor: theme.surface, borderColor: theme.text },
            ]}>
            <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  container: { flexDirection: 'row', gap: Spacing.one },
  tab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.medium,
    borderWidth: 1,
  },
});
