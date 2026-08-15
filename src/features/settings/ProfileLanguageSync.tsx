import { useEffect } from 'react';

import { useI18n } from '@/i18n';

import { useProfile } from './useProfile';

/** Allinea la lingua dell'app a quella salvata sul profilo, al primo caricamento. */
export function ProfileLanguageSync() {
  const { data: profile } = useProfile();
  const { language, setLanguage } = useI18n();

  useEffect(() => {
    if (profile && profile.preferred_language !== language) {
      setLanguage(profile.preferred_language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.preferred_language]);

  return null;
}
