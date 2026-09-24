import { Feather } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Campo di ricerca con icona a lente d'ingrandimento, usato nelle pagine con
 * elenchi lunghi (Ricette, Ingredienti) per filtrare per nome.
 *
 * `flexGrow`/`flexBasis`/`minWidth` nello stile del contenitore non sono
 * decorativi: senza di essi, quando questo componente stava in riga insieme
 * ai tab di `SegmentedTabs`, su schermi stretti collassava a larghezza zero
 * (il vero campo di testo diventava non toccabile, restava visibile solo
 * l'icona) — con queste regole si garantisce sempre uno spazio minimo utilizzabile.
 */
export function SearchInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Feather name="search" size={16} color={theme.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    height: 42,
    flexGrow: 1,
    flexBasis: 200,
    minWidth: 160,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
});
