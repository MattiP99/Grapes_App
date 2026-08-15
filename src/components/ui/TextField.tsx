import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
}

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
