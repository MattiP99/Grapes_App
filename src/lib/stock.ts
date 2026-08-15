import type { StockByLocation, StorageLocation } from '@/types/database';

/** Raggruppa righe di stock (ingrediente/componente/variante) per tipo di location. */
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
