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

/**
 * PAGINA: Registrazione (rotta "/register").
 *
 * Crea un nuovo account: nome pasticceria + email + password. La creazione
 * vera e propria (utente Supabase Auth + riga nel profilo con il nome della
 * pasticceria) è gestita da `signUp` in AuthProvider — qui c'è solo il form.
 */
export default function RegisterScreen() {
  const t = useTranslation();
  const { signUp } = useAuth();
  const [bakeryName, setBakeryName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, bakeryName.trim());
    } catch {
      setError(t.auth.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout>
      <ThemedText type="sectionTitle">{t.auth.signUp}</ThemedText>

      <View style={styles.fields}>
        <TextField label={t.auth.bakeryName} value={bakeryName} onChangeText={setBakeryName} />
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

      <Button label={t.auth.signUp} onPress={handleSubmit} loading={loading} disabled={!email || !password} />

      <Link href="/login" style={styles.link}>
        <ThemedText type="link" themeColor="accent">
          {t.auth.hasAccount}
        </ThemedText>
      </Link>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Spacing.three },
  link: { alignSelf: 'center', marginTop: Spacing.one },
});
