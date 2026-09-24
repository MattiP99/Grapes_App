import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

/**
 * Come `ThemedText` ma per gli sfondi: una `View` che colora il proprio
 * `backgroundColor` in base al tema attivo. `type` sceglie QUALE colore del
 * tema usare (default "background"); usata raramente nel resto dell'app,
 * che di solito preferisce `Card` per i blocchi con sfondo.
 */
export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}
