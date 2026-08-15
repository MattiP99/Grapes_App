import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState({ icon = 'inbox', message }: { icon?: keyof typeof Feather.glyphMap; message: string }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Feather name={icon} size={28} color={theme.textSecondary} />
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
