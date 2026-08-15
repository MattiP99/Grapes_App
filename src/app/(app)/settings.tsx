import { ScrollView, StyleSheet } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile, useUpdateLanguage } from '@/features/settings/useProfile';
import { useThemePreference, type ThemePreference } from '@/features/settings/ThemePreferenceProvider';
import { useI18n } from '@/i18n';
import type { Language } from '@/types/database';

export default function SettingsScreen() {
  const { language, setLanguage, t } = useI18n();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateLanguage = useUpdateLanguage();
  const { preference, setPreference } = useThemePreference();

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    updateLanguage.mutate(next);
  };

  return (
    <ScrollView contentContainerStyle={styles.flex}>
      <PageHeader title={t.settings.title} />

      <Card style={styles.card}>
        <Select
          label={t.settings.language}
          value={profile?.preferred_language ?? language}
          options={[
            { label: t.settings.english, value: 'en' },
            { label: t.settings.italian, value: 'it' },
          ]}
          onChange={handleLanguageChange}
        />
      </Card>

      <Card style={styles.card}>
        <Select
          label={t.settings.theme}
          value={preference}
          options={[
            { label: t.settings.themeSystem, value: 'system' },
            { label: t.settings.themeLight, value: 'light' },
            { label: t.settings.themeDark, value: 'dark' },
          ]}
          onChange={(v) => setPreference(v as ThemePreference)}
        />
      </Card>

      <Button label={t.auth.signOut} variant="danger" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { gap: Spacing.four, paddingBottom: Spacing.six },
  card: { gap: Spacing.two },
});
