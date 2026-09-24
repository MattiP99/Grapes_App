import { Feather } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { sidebarNavItems } from '@/constants/navigation';
import { Radii, SidebarWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/**
 * Barra di navigazione laterale, mostrata solo su schermi larghi
 * (tablet/desktop — vedi `AppShell`, che sceglie fra questa e la
 * `BottomTabBar` mobile in base alla larghezza dello schermo). Elenca TUTTE
 * le sezioni dell'app (`sidebarNavItems`, a differenza della bottom bar che
 * ne mostra solo 4-5), più Impostazioni e logout in fondo.
 */
export function Sidebar() {
  const theme = useTheme();
  const t = useTranslation();
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.sidebar, borderRightColor: theme.border, width: SidebarWidth },
      ]}>
      <View style={styles.brand}>
        <ThemedText type="sectionTitle" themeColor="accent" style={styles.brandText}>
          GRAPES
        </ThemedText>
        <ThemedText type="small" themeColor="sidebarTextMuted">
          Santa Margherita Ligure
        </ThemedText>
      </View>

      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
        {sidebarNavItems.map((item) => {
          // La voce "Dashboard" (href "/") è attiva solo sulla home esatta;
          // le altre sono attive anche su eventuali sotto-pagine (startsWith).
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.key} href={item.href} asChild>
              <Pressable
                style={StyleSheet.flatten([styles.navItem, active && { backgroundColor: theme.sidebarActiveBg }])}>
                <Feather
                  name={item.icon}
                  size={17}
                  color={active ? theme.sidebarActiveText : theme.sidebarText}
                />
                <ThemedText
                  type="smallBold"
                  themeColor={active ? 'sidebarActiveText' : 'sidebarText'}>
                  {t.nav[item.labelKey]}
                </ThemedText>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Link href="/settings" asChild>
          <Pressable style={styles.footerItem}>
            <Feather name="settings" size={16} color={theme.sidebarText} />
            <ThemedText type="small" themeColor="sidebarText">
              {t.nav.settings}
            </ThemedText>
          </Pressable>
        </Link>
        <Pressable style={styles.footerItem} onPress={signOut}>
          <Feather name="log-out" size={16} color={theme.sidebarText} />
          <ThemedText type="small" themeColor="sidebarText">
            {t.auth.signOut}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    justifyContent: 'flex-start',
    gap: Spacing.five,
    borderRightWidth: 1,
  },
  brand: {
    paddingHorizontal: Spacing.two,
    gap: 2,
  },
  brandText: {
    letterSpacing: 2,
  },
  nav: {
    flex: 1,
  },
  navContent: {
    gap: Spacing.one,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Radii.medium,
  },
  footer: {
    gap: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
