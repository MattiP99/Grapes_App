import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Versione web di `useColorScheme` (Expo sceglie questo file automaticamente
 * su web grazie all'estensione ".web.ts"). Il motivo per cui esiste una
 * versione separata: Expo Router pre-renderizza le pagine sul server (Node),
 * dove non esiste alcun tema di sistema da leggere — se si restituisse subito
 * il valore reale, il primo render lato server e il primo render lato
 * browser potrebbero non corrispondere, causando un errore di "idratazione".
 * Per evitarlo si restituisce sempre 'light' finché il componente non è
 * effettivamente montato nel browser (`hasHydrated`), e solo dopo si passa al vero valore.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
