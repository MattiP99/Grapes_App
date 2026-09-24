import type { Feather } from '@expo/vector-icons';

/**
 * Definisce QUALI sezioni esistono e con quale icona/etichetta, per i 3 menu
 * di navigazione dell'app (sidebar desktop, barra in basso mobile, pagina
 * "Altro" mobile). Cambiare l'ordine o il contenuto di questi array è
 * l'unico posto da toccare per aggiungere/rimuovere una voce di menu, senza
 * bisogno di modificare i componenti Sidebar/BottomTabBar/MoreScreen stessi.
 */
export interface NavItem {
  key: string;
  href:
    | '/'
    | '/ingredients'
    | '/low-stock'
    | '/recipes'
    | '/work-plan'
    | '/orders'
    | '/purchases'
    | '/cost-analysis'
    | '/settings'
    | '/more';
  icon: keyof typeof Feather.glyphMap;
  labelKey:
    | 'dashboard'
    | 'ingredients'
    | 'lowStock'
    | 'recipes'
    | 'workPlan'
    | 'orders'
    | 'purchases'
    | 'costAnalysis'
    | 'settings'
    | 'more';
}

/** Voci mostrate nella sidebar (tablet/desktop): tutte le sezioni. */
export const sidebarNavItems: NavItem[] = [
  { key: 'dashboard', href: '/', icon: 'grid', labelKey: 'dashboard' },
  { key: 'ingredients', href: '/ingredients', icon: 'box', labelKey: 'ingredients' },
  { key: 'low-stock', href: '/low-stock', icon: 'alert-triangle', labelKey: 'lowStock' },
  { key: 'recipes', href: '/recipes', icon: 'coffee', labelKey: 'recipes' },
  { key: 'work-plan', href: '/work-plan', icon: 'check-square', labelKey: 'workPlan' },
  { key: 'orders', href: '/orders', icon: 'clipboard', labelKey: 'orders' },
  { key: 'purchases', href: '/purchases', icon: 'truck', labelKey: 'purchases' },
  { key: 'cost-analysis', href: '/cost-analysis', icon: 'trending-up', labelKey: 'costAnalysis' },
];

/** Voci mostrate nella bottom tab bar (telefono): le 4 più usate + "More". */
export const mobileTabItems: NavItem[] = [
  { key: 'dashboard', href: '/', icon: 'grid', labelKey: 'dashboard' },
  { key: 'work-plan', href: '/work-plan', icon: 'check-square', labelKey: 'workPlan' },
  { key: 'recipes', href: '/recipes', icon: 'coffee', labelKey: 'recipes' },
  { key: 'orders', href: '/orders', icon: 'clipboard', labelKey: 'orders' },
  { key: 'more', href: '/more', icon: 'more-horizontal', labelKey: 'more' },
];

/** Su mobile, le sezioni meno frequenti finiscono nella schermata "More". */
export const moreScreenItems: NavItem[] = [
  { key: 'ingredients', href: '/ingredients', icon: 'box', labelKey: 'ingredients' },
  { key: 'low-stock', href: '/low-stock', icon: 'alert-triangle', labelKey: 'lowStock' },
  { key: 'purchases', href: '/purchases', icon: 'truck', labelKey: 'purchases' },
  { key: 'cost-analysis', href: '/cost-analysis', icon: 'trending-up', labelKey: 'costAnalysis' },
];
