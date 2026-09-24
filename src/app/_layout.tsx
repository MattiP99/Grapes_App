import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { ThemePreferenceProvider } from '@/features/settings/ThemePreferenceProvider';
import { I18nProvider } from '@/i18n';
import { queryClient } from '@/lib/queryClient';

// Tiene visibile la splash screen nativa finché non sappiamo ancora se
// l'utente ha una sessione attiva (evita un lampo della schermata di login
// prima di scoprire che in realtà è già loggato, o viceversa).
SplashScreen.preventAutoHideAsync();

/**
 * Layout radice di TUTTA l'app (il primo file che viene eseguito).
 * Il suo unico scopo è annidare i "Provider" globali, ognuno responsabile di
 * un pezzo di stato condiviso da tutte le pagine:
 * - QueryClientProvider: cache/gestione delle chiamate a Supabase (React Query).
 * - ThemePreferenceProvider: preferenza tema chiaro/scuro/di sistema.
 * - AuthProvider: sessione utente Supabase (chi è loggato, se qualcuno).
 * - I18nProvider: lingua attiva e stringhe tradotte.
 * La navigazione vera e propria è delegata a RootNavigator qui sotto.
 */
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

/**
 * Decide QUALE gruppo di pagine mostrare in base alla sessione:
 * "(app)" (tutte le schermate della gestione pasticceria) se c'è una sessione
 * attiva, altrimenti "(auth)" (login/registrazione). `Stack.Protected` nasconde
 * l'altro gruppo del tutto, quindi non è possibile navigare manualmente verso
 * una pagina protetta senza essere loggati.
 */
function RootNavigator() {
  const { loading, session } = useAuth();

  // Appena sappiamo se c'è una sessione o no, si nasconde la splash screen nativa.
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
