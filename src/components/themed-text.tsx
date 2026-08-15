import { Text, type TextProps, useWindowDimensions } from 'react-native';

import { Fonts, TabletBreakpoint, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'pageTitle'
    | 'sectionTitle'
    | 'subtitle'
    | 'small'
    | 'smallBold'
    | 'label'
    | 'link'
    | 'code';
  themeColor?: ThemeColor;
};

/** Riduce leggermente il testo sotto la soglia tablet, dove lo spazio è più stretto. */
const MOBILE_FONT_SCALE = 0.92;

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < TabletBreakpoint;

  const base = styles[type];

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        base,
        isMobile && { fontSize: base.fontSize * MOBILE_FONT_SCALE, lineHeight: base.lineHeight * MOBILE_FONT_SCALE },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = {
  default: { fontSize: 15, lineHeight: 21 },
  pageTitle: { fontFamily: Fonts?.serif, fontSize: 30, lineHeight: 36, fontWeight: '600' as const },
  sectionTitle: { fontFamily: Fonts?.serif, fontSize: 19, lineHeight: 24, fontWeight: '600' as const },
  subtitle: { fontSize: 15, lineHeight: 21, opacity: 0.75 },
  small: { fontSize: 13, lineHeight: 18 },
  smallBold: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.3 },
  link: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  code: { fontFamily: Fonts?.mono, fontSize: 12, lineHeight: 16 },
};
