import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/constants/theme';

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
