import { Slot } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MaxContentWidth, Spacing, TabletBreakpoint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
