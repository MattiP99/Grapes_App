import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'primary' | 'danger' | 'warning' | 'success' | 'info';

// Ogni "tono" del badge sceglie una coppia colore-di-sfondo/colore-testo dal tema corrente.
const toneColors: Record<BadgeTone, { bg: 'surfaceMuted' | 'dangerBg' | 'warningBg' | 'successBg' | 'infoBg'; text: 'text' | 'danger' | 'warning' | 'success' | 'info' }> = {
  neutral: { bg: 'surfaceMuted', text: 'text' },
  primary: { bg: 'infoBg', text: 'info' },
  danger: { bg: 'dangerBg', text: 'danger' },
  warning: { bg: 'warningBg', text: 'warning' },
  success: { bg: 'successBg', text: 'success' },
  info: { bg: 'infoBg', text: 'info' },
};

/** Etichetta colorata "a pillola", usata per stati (es. "In attesa"/"Consegnato") e categorie in tutta l'app. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const colors = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: theme[colors.bg] }]}>
      <ThemedText type="label" themeColor={colors.text}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
});
