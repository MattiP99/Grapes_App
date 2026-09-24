import type { StockByLocation, StorageLocation } from '@/types/database';

/**
 * Funzione di utilità condivisa da ingredienti, componenti e varianti di
 * ricetta: tutti e tre hanno lo stesso identico problema (righe di stock
 * separate per ogni magazzino nel database, da "affiancare" in un unico
 * oggetto {fridge, freezer, pantry} comodo da usare nell'interfaccia),
 * quindi la logica di raggruppamento vive qui una volta sola invece di
 * essere ripetuta 3 volte.
 */
export function buildStockByLocation<Row extends { location_id: string; quantity: number; min_threshold: number }>(
  rows: Row[],
  locations: StorageLocation[]
): StockByLocation {
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const stock: StockByLocation = { fridge: undefined, freezer: undefined, pantry: undefined };
  for (const row of rows) {
    const location = locationById.get(row.location_id);
    if (!location) continue;
    stock[location.type] = { quantity: row.quantity, min_threshold: row.min_threshold };
  }
  return stock;
}
