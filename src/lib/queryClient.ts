import { QueryClient } from '@tanstack/react-query';

/**
 * Il client di React Query, condiviso da tutta l'app (montato una volta nel
 * layout radice). React Query è la libreria che gestisce cache, stato di
 * caricamento/errore e "invalidazione" (= "questo dato è vecchio, va
 * ricaricato") per tutte le chiamate a Supabase fatte dagli hook in
 * `src/features/*\/hooks.ts`.
 * `staleTime: 30_000`: un dato letto resta considerato "fresco" per 30
 * secondi, evitando ricariche di rete se si torna sulla stessa pagina a
 * breve distanza. `retry: 1`: se una richiesta fallisce viene ritentata una
 * sola volta prima di arrendersi e mostrare l'errore.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Elenco centralizzato delle "chiavi cache" usate da React Query. Ogni hook
 * `useXyz()` usa una di queste chiavi come identificatore dei propri dati;
 * usare chiavi definite qui (invece di stringhe sparse nel codice) evita
 * errori di battitura e rende facile capire, guardando questo file, quali
 * "tipi" di dati vengono tenuti in cache in tutta l'app.
 */
export const queryKeys = {
  ingredients: ['ingredients'] as const,
  ingredientStock: ['ingredient-stock'] as const,
  storageLocations: ['storage-locations'] as const,
  recipes: ['recipes'] as const,
  components: ['components'] as const,
  orders: ['orders'] as const,
  costHistory: ['cost-history'] as const,
  // Alcune chiavi sono funzioni: producono una chiave DIVERSA per ogni utente/data,
  // così ogni profilo o ogni giorno del Piano di lavoro ha la propria cache separata.
  profile: (userId: string) => ['profile', userId] as const,
  workPlanTasks: (date: string) => ['work-plan-tasks', date] as const,
  purchaseOrders: ['purchase-orders'] as const,
  componentStock: ['component-stock'] as const,
  recipeVariantStock: ['recipe-variant-stock'] as const,
};
