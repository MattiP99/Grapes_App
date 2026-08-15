import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useTranslation } from '@/i18n';

export default function LoginScreen() {
  const t = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError(t.auth.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout>
      <ThemedText type="sectionTitle">{t.auth.signIn}</ThemedText>

      <View style={styles.fields}>
        <TextField
          label={t.auth.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField label={t.auth.password} value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}

      <Button label={t.auth.signIn} onPress={handleSubmit} loading={loading} disabled={!email || !password} />

      <Link href="/register" style={styles.link}>
        <ThemedText type="link" themeColor="accent">
          {t.auth.noAccount}
        </ThemedText>
      </Link>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Spacing.three },
  link: { alignSelf: 'center', marginTop: Spacing.one },
});
