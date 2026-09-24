import { Feather } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { mobileTabItems } from '@/constants/navigation';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/**
 * Barra di navigazione in basso, mostrata solo su schermi stretti (telefono
 * — vedi `AppShell`). A differenza della `Sidebar` (che mostra tutte le
 * sezioni), qui c'è spazio solo per le 4-5 voci più usate (`mobileTabItems`);
 * le altre finiscono nella pagina "Altro".
 */
export function BottomTabBar() {
  const theme = useTheme();
  const t = useTranslation();
  const pathname = usePathname();
  // Spazio in fondo pari alla "safe area" del dispositivo (evita che la barra
  // finisca sotto la Home Indicator/i pulsanti di sistema del telefono).
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom || Spacing.two },
      ]}>
      {mobileTabItems.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link key={item.key} href={item.href} asChild>
            <Pressable style={styles.tab}>
              <Feather name={item.icon} size={20} color={active ? theme.primary : theme.textSecondary} />
              <ThemedText type="small" themeColor={active ? 'primary' : 'textSecondary'} style={styles.label}>
                {t.nav[item.labelKey]}
              </ThemedText>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  // Con 5 tab in riga, l'etichetta più lunga ("Piano di lavoro") va a capo su
  // due righe: senza `textAlign: 'center'` le due righe (di lunghezza diversa)
  // risultavano allineate a sinistra, apparendo visivamente decentrate sotto l'icona.
  label: {
    textAlign: 'center',
  },
});
