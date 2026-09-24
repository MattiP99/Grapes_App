import { Slot } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MaxContentWidth, Spacing, TabletBreakpoint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Decide come inquadrare le pagine dell'app in base alla larghezza dello
 * schermo — è il punto in cui l'intera app diventa "responsive":
 * - Largo (tablet/desktop): sidebar fissa a sinistra + contenuto centrato
 *   con una larghezza massima (`MaxContentWidth`, per non avere righe di
 *   testo troppo lunghe su schermi molto larghi).
 * - Stretto (telefono): niente sidebar, si usa invece `BottomTabBar` in
 *   fondo, e il contenuto occupa tutto lo schermo disponibile.
 * `<Slot />` è il segnaposto di Expo Router dove viene inserita la pagina
 * effettivamente attiva (Dashboard, Ordini, ecc.) — questo componente non sa
 * né gli importa QUALE pagina sia, si occupa solo dell'impalcatura attorno.
 * Nota: questo componente NON avvolge le pagine in uno scroll — ogni singola
 * pagina deve gestire il proprio scorrimento (di solito con `ScrollView`) se
 * il suo contenuto rischia di non entrare tutto sullo schermo.
 */
export function AppShell() {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const isWide = width >= TabletBreakpoint;

  if (isWide) {
    return (
      <View style={[styles.row, { backgroundColor: theme.background }]}>
        <Sidebar />
        <View style={styles.contentArea}>
          <View style={styles.contentInner}>
            <Slot />
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.column, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.contentInnerMobile}>
        <Slot />
      </View>
      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  column: { flex: 1 },
  contentArea: { flex: 1, alignItems: 'center' },
  contentInner: { flex: 1, width: '100%', maxWidth: MaxContentWidth, padding: Spacing.five },
  contentInnerMobile: { flex: 1, padding: Spacing.three },
});
