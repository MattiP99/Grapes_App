import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { moreScreenItems } from '@/constants/navigation';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';

export default function MoreScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const { signOut } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.flex}>
      <PageHeader title={t.nav.more} />

      <Card style={styles.card}>
        {moreScreenItems.map((item) => (
          <Link key={item.key} href={item.href} asChild>
            <Pressable style={styles.row}>
              <View style={styles.rowLeft}>
                <Feather name={item.icon} size={18} color={theme.text} />
                <ThemedText>{t.nav[item.labelKey]}</ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>
          </Link>
        ))}

        <Link href="/settings" asChild>
          <Pressable style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="settings" size={18} color={theme.text} />
              <ThemedText>{t.nav.settings}</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>
        </Link>

        <Pressable style={styles.row} onPress={signOut}>
          <View style={styles.rowLeft}>
            <Feather name="log-out" size={18} color={theme.danger} />
            <ThemedText themeColor="danger">{t.auth.signOut}</ThemedText>
          </View>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { paddingBottom: Spacing.six },
  card: { padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
