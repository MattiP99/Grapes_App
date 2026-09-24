import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/constants/theme';

/** Un pulsante che è solo un'icona (Feather), usato ovunque nell'app per azioni compatte (modifica, elimina, sposta, aggiungi riga...). */
export function IconButton({
  icon,
  onPress,
  color,
  size = 18,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  color?: ThemeColor;
  size?: number;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // Area toccabile più grande dell'icona visibile, per essere comodo da premere anche su schermi piccoli.
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && { backgroundColor: theme.surfaceMuted }]}>
      <Feather name={icon} size={size} color={theme[color ?? 'text']} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: Radii.small,
  },
});
