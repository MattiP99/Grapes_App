import { AppShell } from '@/components/layout/AppShell';
import { ProfileLanguageSync } from '@/features/settings/ProfileLanguageSync';

/**
 * Layout del gruppo "(app)" — tutte le pagine dopo il login.
 * Non definisce lui stesso la navigazione (quella è dentro `AppShell`, che
 * sceglie sidebar o barra in basso in base alla larghezza schermo): qui si
 * monta solo `ProfileLanguageSync`, che sincronizza la lingua salvata sul
 * profilo Supabase con quella mostrata nell'interfaccia appena l'utente ha fatto login.
 */
export default function AppLayout() {
  return (
    <>
      <ProfileLanguageSync />
      <AppShell />
    </>
  );
}
