import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { ThemePreferenceProvider } from '@/features/settings/ThemePreferenceProvider';
import { I18nProvider } from '@/i18n';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <AuthProvider>
          <I18nProvider>
            <RootNavigator />
          </I18nProvider>
        </AuthProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { loading, session } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
