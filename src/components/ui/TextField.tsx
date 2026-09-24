import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Testo informativo mostrato sotto il campo (es. "quante unità produce un'infornata"). */
  hint?: string;
}

/**
 * Campo di testo standard dell'app: etichetta opzionale sopra, input
 * stilizzato secondo il tema, suggerimento opzionale sotto. Accetta tutte le
 * altre proprietà di un TextInput normale di React Native (keyboardType,
 * multiline, secureTextEntry, ecc.), passate direttamente con `...rest`.
 */
export function TextField({ label, hint, style, ...rest }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface },
          style,
        ]}
        {...rest}
      />
      {hint && (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
  },
});
