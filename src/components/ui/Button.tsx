import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style }: ButtonProps) {
  const theme = useTheme();

  const backgroundColor = {
    primary: theme.primary,
    secondary: theme.surfaceMuted,
    ghost: 'transparent',
    danger: theme.dangerBg,
  }[variant];

  const textColor = {
    primary: theme.primaryText,
    secondary: theme.text,
    ghost: theme.text,
    danger: theme.danger,
  }[variant] as any;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: theme.border },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <ThemedText
            type="smallBold"
            themeColor={variant === 'primary' ? 'primaryText' : variant === 'danger' ? 'danger' : 'text'}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderRadius: Radii.medium,
  },
});
