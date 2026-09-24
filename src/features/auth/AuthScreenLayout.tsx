import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Cornice grafica comune alle pagine di Login e Registrazione: logo "GRAPES",
 * sottotitolo "Santa Margherita Ligure", e una card centrata che contiene il
 * form passato come `children`. Gestisce anche lo spostamento del contenuto
 * quando appare la tastiera (KeyboardAvoidingView, solo su iOS: su Android il
 * comportamento di default del sistema è già sufficiente).
 */
export function AuthScreenLayout({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="pageTitle" themeColor="accent" style={styles.brand}>
          GRAPES
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.tagline}>
          Santa Margherita Ligure
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.one,
  },
  brand: { letterSpacing: 3 },
  tagline: { marginBottom: Spacing.five },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.five,
    gap: Spacing.three,
  },
});
