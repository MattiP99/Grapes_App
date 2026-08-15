import { Platform } from 'react-native';

/**
 * Palette Grapes (Santa Margherita Ligure): sfondo crema/panna dominante,
 * viola tenuto solo come colore d'accento (bottoni, badge, evidenziazioni).
 */
export const Colors = {
  light: {
    text: '#241629',
    textSecondary: '#7A6F84',
    background: '#F7F3EA',
    surface: '#FFFFFF',
    surfaceMuted: '#F1EBDD',
    border: '#E6DFCF',

    sidebar: '#FFFFFF',
    sidebarText: '#241629',
    sidebarTextMuted: '#7A6F84',
    sidebarActiveBg: '#EDE4FB',
    sidebarActiveText: '#6D28D9',

    primary: '#7C3AED',
    primaryText: '#FFFFFF',
    accent: '#6D28D9',

    danger: '#DC2626',
    dangerBg: '#FBE4E4',
    warning: '#B45309',
    warningBg: '#FEF3C7',
    success: '#15803D',
    successBg: '#DCFCE7',
    info: '#1D4ED8',
    infoBg: '#DBEAFE',

    backgroundElement: '#F1EBDD',
    backgroundSelected: '#E6DFCF',
  },
  dark: {
    text: '#F3EEF7',
    textSecondary: '#B7ACC4',
    background: '#180F1D',
    surface: '#241732',
    surfaceMuted: '#2E2039',
    border: '#3A2C46',

    sidebar: '#150C1A',
    sidebarText: '#D9CEE0',
    sidebarTextMuted: '#8C7C9C',
    sidebarActiveBg: '#3B2454',
    sidebarActiveText: '#A78BFA',

    primary: '#9061F9',
    primaryText: '#FFFFFF',
    accent: '#A78BFA',

    danger: '#F87171',
    dangerBg: '#3B1919',
    warning: '#FBBF24',
    warningBg: '#3A2E10',
    success: '#4ADE80',
    successBg: '#123420',
    info: '#60A5FA',
    infoBg: '#132A4A',

    backgroundElement: '#2E2039',
    backgroundSelected: '#3A2C46',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    rounded: 'normal',
    mono: 'ui-monospace, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

/** Sotto questa larghezza usiamo la bottom tab bar invece della sidebar. */
export const TabletBreakpoint = 820;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1200;
export const SidebarWidth = 240;
