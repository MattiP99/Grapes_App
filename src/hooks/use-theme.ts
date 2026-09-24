/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference } from '@/features/settings/ThemePreferenceProvider';

/**
 * Hook usato ovunque nell'app per ottenere i colori del tema attivo (es.
 * `theme.primary`, `theme.background`...). Combina due cose:
 * - `scheme`: il tema del SISTEMA OPERATIVO (chiaro/scuro), letto in automatico.
 * - `preference`: la preferenza scelta dall'utente in Impostazioni (chiaro/scuro/"segui il sistema").
 * Se la preferenza è "system" si usa lo schema del sistema; altrimenti la
 * preferenza dell'utente vince sempre, anche se in contrasto con il sistema.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const { preference } = useThemePreference();

  const resolved = preference === 'system' ? (scheme === 'unspecified' ? 'light' : scheme) : preference;

  return Colors[resolved];
}
