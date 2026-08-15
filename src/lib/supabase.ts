import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase non configurato: imposta EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (vedi .env.example).'
  );
}

// Expo Router pre-renderizza le pagine web in Node (SSR), dove `window` non esiste:
// su web usiamo localStorage solo lato browser e un no-op durante il render server-side.
const storage: SupportedStorage =
  Platform.OS === 'web'
    ? {
        getItem: async (key) => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
        setItem: async (key, value) => {
          if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        },
        removeItem: async (key) => {
          if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        },
      }
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Ferma/riavvia il refresh automatico del token in base allo stato dell'app,
// come raccomandato dai docs Supabase per React Native.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
