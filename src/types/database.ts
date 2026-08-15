export type StorageLocationType = 'fridge' | 'freezer' | 'pantry';

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'delivered' | 'cancelled';

export type Language = 'en' | 'it';

export interface StorageLocation {
  id: string;
  name: string;
  type: StorageLocationType;
}

/** Scorte di un elemento (ingrediente/componente/variante) raggruppate per tipo di location. */
export type StockByLocation = Record<StorageLocationType, { quantity: number; min_threshold: number } | undefined>;

export interface Ingredient {
  id: string;
  owner_id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier: string | null;
  created_at: string;
}

export interface IngredientStock {
  ingredient_id: string;
  location_id: string;
  quantity: number;
  min_threshold: number;
}

/** Ingredient con lo stock aggregato per location, così com'è usato dalle schermate. */
export interface IngredientWithStock extends Ingredient {
  stock: StockByLocation;
}

export interface StockMovement {
  id: string;
  ingredient_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  moved_at: string;
}

export interface Recipe {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  description: string | null;
  sell_price: number;
  created_at: string;
}

export interface RecipeVariant {
  id: string;
  recipe_id: string;
  label: string;
  total_weight: number;
  portions: number;
}

export interface Component {
  id: string;
  owner_id: string;
  name: string;
  unit: string;
  /** Quantità totale prodotta dal batch (nella stessa unità), usata per calcolare il costo/unità. */
  batch_yield: number;
  created_at: string;
}

export interface ComponentIngredient {
  id: string;
  component_id: string;
  ingredient_id: string;
  quantity: number;
}

/** Componente con la lista ingredienti risolta e il costo/unità calcolato. */
export interface ComponentWithCost extends Component {
  ingredients: (ComponentIngredient & { ingredient: Ingredient })[];
  totalCost: number;
  costPerUnit: number;
}

/** Componente con anche lo stock prodotto/immagazzinato per location. */
export interface ComponentWithStock extends ComponentWithCost {
  stock: StockByLocation;
}

/** Ogni riga fa riferimento a un ingrediente grezzo OPPURE a un componente (mai entrambi). */
export interface RecipeVariantIngredient {
  id: string;
  variant_id: string;
  ingredient_id: string | null;
  component_id: string | null;
  quantity: number;
}

export type RecipeVariantLine = RecipeVariantIngredient & {
  ingredient: Ingredient | null;
  component: ComponentWithCost | null;
  cost: number;
};

/** Variante con la lista ingredienti/componenti risolta e i totali calcolati (costo/margine). */
export interface RecipeVariantWithIngredients extends RecipeVariant {
  ingredients: RecipeVariantLine[];
  cost: number;
}

export interface RecipeWithVariants extends Recipe {
  variants: RecipeVariantWithIngredients[];
  /** Costo/margine della variante di riferimento (la prima) per le viste elenco. */
  cost: number;
  margin: number;
  marginPct: number;
}

export interface Order {
  id: string;
  owner_id: string;
  customer_name: string;
  cake_name: string;
  recipe_id: string | null;
  variant_id: string | null;
  quantity: number;
  pickup_date: string;
  status: OrderStatus;
  total_price: number;
  notes: string | null;
  created_at: string;
}

/** Variante di ricetta con lo stock di prodotto finito per location (torte già pronte). */
export interface RecipeVariantWithStock extends RecipeVariant {
  recipe_name: string;
  stock: StockByLocation;
}

export type ProductionType = 'component' | 'recipe_variant';

export interface WorkPlanTask {
  id: string;
  owner_id: string;
  task_date: string;
  title: string;
  notes: string | null;
  production_type: ProductionType | null;
  component_id: string | null;
  variant_id: string | null;
  quantity: number | null;
  target_location_id: string | null;
  status: 'pending' | 'completed';
  completed_at: string | null;
  created_at: string;
}

export type PurchaseOrderStatus = 'ordered' | 'arrived' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  owner_id: string;
  supplier: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  ingredient_id: string;
  quantity: number;
  location_id: string;
  unit_cost: number | null;
}

export interface CostHistoryEntry {
  id: string;
  ingredient_id: string;
  cost: number;
  recorded_at: string;
}

export interface Profile {
  id: string;
  preferred_language: Language;
}
