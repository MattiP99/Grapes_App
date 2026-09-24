import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * La finestra di dialogo standard usata da TUTTE le modali di
 * creazione/modifica dell'app (ordini, ricette, ingredienti, ecc.):
 * titolo + pulsante "x" in alto, contenuto scorrevole al centro (`children`,
 * per form lunghi che non ci stanno tutti in uno schermo), pulsanti di azione
 * in fondo (`footer`, tipicamente "Annulla" + "Salva"). `maxWidth` permette a
 * modali particolarmente ricche di contenuto (es. l'ordine) di essere più larghe del default.
 */
export function AppModal({
  visible,
  onClose,
  title,
  children,
  footer,
  maxWidth = 480,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Toccare lo sfondo scuro chiude la modale; toccare la card stessa non deve
          propagare il tocco al backdrop (altrimenti si chiuderebbe cliccando qualsiasi campo). */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centerWrap}
          pointerEvents="box-none">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.card, { backgroundColor: theme.surface, maxWidth, borderColor: theme.border }]}>
            <View style={styles.header}>
              <ThemedText type="sectionTitle">{title}</ThemedText>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>

            {footer && <View style={[styles.footer, { borderTopColor: theme.border }]}>{footer}</View>}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 25, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  centerWrap: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: Radii.large,
    borderWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
});
