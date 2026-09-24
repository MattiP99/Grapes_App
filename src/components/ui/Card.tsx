import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Il "riquadro" base usato ovunque nell'app per raggruppare contenuti: bordo
 * arrotondato, sfondo colorato secondo il tema. `muted` usa un grigio/panna
 * leggermente più scuro (usato per distinguere blocchi annidati, es. le
 * varianti dentro EditRecipeModal, da quelli allo stesso "livello" della card esterna).
 */
export function Card({ style, muted, ...rest }: ViewProps & { muted?: boolean }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: muted ? theme.surfaceMuted : theme.surface, borderColor: theme.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.four,
  },
});
