import { Feather } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { mobileTabItems } from '@/constants/navigation';
import { Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export function BottomTabBar() {
  const theme = useTheme();
  const t = useTranslation();
  const pathname = usePathname();
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
              <ThemedText type="small" themeColor={active ? 'primary' : 'textSecondary'}>
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
});
