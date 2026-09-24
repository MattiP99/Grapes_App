import { Stack } from 'expo-router';

/**
 * Layout del gruppo "(auth)" (login + registrazione).
 * Definisce solo quali schermate esistono in questo gruppo e nasconde
 * l'intestazione di navigazione automatica di Expo Router (`headerShown: false`),
 * perché login/registrazione hanno un loro layout personalizzato (AuthScreenLayout).
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
