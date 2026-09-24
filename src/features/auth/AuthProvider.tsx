import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** true finché non abbiamo ancora controllato se esiste una sessione salvata. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, bakeryName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Fornisce a tutta l'app lo stato di autenticazione (chi è loggato, se qualcuno)
 * tramite React Context, e le funzioni per login/registrazione/logout.
 * Montato una sola volta, nel layout radice (`src/app/_layout.tsx`).
 *
 * `RootLayout` legge `session`/`loading` da qui per decidere se mostrare le
 * pagine dell'app o quelle di login (vedi `RootNavigator` in quel file).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al primo avvio: controlla se Supabase ha già una sessione salvata sul
    // dispositivo (login precedente non scaduto) e finisce il caricamento.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Da qui in poi, ogni cambiamento di sessione (login, logout, refresh del
    // token) aggiorna automaticamente lo stato React — nessun altro punto del
    // codice deve preoccuparsi di tenere `session` sincronizzata.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      // `bakery_name` viene salvato nei metadati dell'utente Supabase; è il
      // trigger lato database (vedi supabase/schema.sql) a creare da qui la
      // riga corrispondente nella tabella "profiles" alla creazione dell'utente.
      signUp: async (email, password, bakeryName) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { bakery_name: bakeryName } },
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook per leggere sessione/utente o chiamare signIn/signUp/signOut da qualsiasi componente. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
