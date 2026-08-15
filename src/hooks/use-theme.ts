/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference } from '@/features/settings/ThemePreferenceProvider';

export function useTheme() {
  const scheme = useColorScheme();
  const { preference } = useThemePreference();

  const resolved = preference === 'system' ? (scheme === 'unspecified' ? 'light' : scheme) : preference;

  return Colors[resolved];
}
