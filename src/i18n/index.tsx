import * as Localization from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Language } from '@/types/database';

import { en, type TranslationSchema } from './en';
import { it } from './it';

const dictionaries: Record<Language, TranslationSchema> = { en, it };

function detectDeviceLanguage(): Language {
  const tag = Localization.getLocales()[0]?.languageCode;
  return tag === 'it' ? 'it' : 'en';
}

interface I18nContextValue {
  language: Language;
  t: TranslationSchema;
  setLanguage: (language: Language) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLanguage,
  onLanguageChange,
}: {
  children: ReactNode;
  initialLanguage?: Language | null;
  onLanguageChange?: (language: Language) => void;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? detectDeviceLanguage());

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      onLanguageChange?.(next);
    },
    [onLanguageChange]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, t: dictionaries[language], setLanguage }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

/** Scorciatoia per accedere solo alle stringhe tradotte. */
export function useTranslation() {
  return useI18n().t;
}
