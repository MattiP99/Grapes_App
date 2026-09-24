import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Riquadro statistico usato nella Dashboard: etichetta + icona in alto, valore grande sotto. */
export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <Feather name={icon} size={16} color={theme.textSecondary} />
      </View>
      <ThemedText type="pageTitle" style={styles.value}>
        {value}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: {
    fontSize: 26,
    lineHeight: 32,
  },
});
