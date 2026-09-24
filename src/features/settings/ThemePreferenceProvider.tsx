import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** 'system' segue il tema del sistema operativo, gli altri due lo forzano. */
export type ThemePreference = 'light' | 'dark' | 'system';

// Chiave usata per salvare la preferenza in AsyncStorage (memoria locale del dispositivo).
const STORAGE_KEY = 'grapes-theme-preference';

interface ThemePreferenceContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

/**
 * Tiene traccia della preferenza tema (chiaro/scuro/di sistema) scelta
 * dall'utente in Impostazioni, salvandola in locale con AsyncStorage così
 * resta impostata anche dopo aver chiuso e riaperto l'app.
 * Nota: questa è la preferenza scelta (light/dark/system); il tema EFFETTIVO
 * da applicare (chiaro o scuro) viene calcolato altrove — vedi `useTheme` in
 * `src/hooks/use-theme.ts`, che combina questa preferenza con il tema di sistema.
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Al primo avvio, recupera l'eventuale preferenza salvata in precedenza.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored);
    });
  }, []);

  /** Aggiorna lo stato in memoria e lo salva subito su disco per la prossima apertura dell'app. */
  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(() => ({ preference, setPreference }), [preference]);

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  return ctx;
}
