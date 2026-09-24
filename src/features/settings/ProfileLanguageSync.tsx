import { useEffect } from 'react';

import { useI18n } from '@/i18n';

import { useProfile } from './useProfile';

/**
 * Componente "invisibile" (non renderizza nulla, `return null`): montato in
 * `src/app/(app)/_layout.tsx` per tutta la durata della sessione loggata.
 * Il suo unico scopo è: appena arriva il profilo utente da Supabase, se la
 * lingua salvata lì (`preferred_language`) è diversa da quella attualmente
 * mostrata nell'app, aggiorna l'app per usare quella salvata — così chi ha
 * cambiato lingua da un altro dispositivo la ritrova anche qui.
 */
export function ProfileLanguageSync() {
  const { data: profile } = useProfile();
  const { language, setLanguage } = useI18n();

  useEffect(() => {
    if (profile && profile.preferred_language !== language) {
      setLanguage(profile.preferred_language);
    }
    // Si osserva di proposito solo `profile?.preferred_language` (non anche
    // `language`): altrimenti ogni cambio di lingua fatto dall'utente nella
    // pagina Impostazioni finirebbe subito "sovrascritto" da questo stesso effetto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.preferred_language]);

  return null;
}
