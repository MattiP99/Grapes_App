import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference } from '@/features/settings/ThemePreferenceProvider';

/**
 * @react-native-community/datetimepicker non ha un'implementazione web (rende
 * solo un warning). Su web usiamo un <input type="date"> nativo del browser,
 * che offre lo stesso risultato (selezione data in formato ISO yyyy-mm-dd).
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const theme = useTheme();
  const systemScheme = useColorScheme();
  const { preference } = useThemePreference();
  const resolvedScheme = preference === 'system' ? (systemScheme === 'unspecified' ? 'light' : systemScheme) : preference;

  return (
    <View style={styles.container}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      {createElement('input', {
        type: 'date',
        value,
        onChange: (e: any) => onChange(e.target.value),
        style: {
          border: `1px solid ${theme.border}`,
          borderRadius: Radii.medium,
          paddingLeft: Spacing.three,
          paddingRight: Spacing.three,
          paddingTop: 10,
          paddingBottom: 10,
          fontSize: 15,
          fontFamily: 'inherit',
          color: theme.text,
          backgroundColor: theme.surface,
          colorScheme: resolvedScheme,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
});
