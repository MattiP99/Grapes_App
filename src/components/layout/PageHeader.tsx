import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * Intestazione standard usata in cima a QUASI TUTTE le pagine dell'app: un
 * titolo grande, un sottotitolo opzionale, e a destra uno slot libero
 * (`action`) dove ogni pagina metti il proprio pulsante principale (es. "+
 * Nuovo ordine") o i propri filtri.
 */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={styles.text}>
        <ThemedText type="pageTitle">{title}</ThemedText>
        {subtitle && (
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  text: { gap: 2, flexShrink: 1 },
  subtitle: { marginTop: 2 },
});
