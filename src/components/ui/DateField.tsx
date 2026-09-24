import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Selettore di data per iOS/Android: un pulsante che mostra la data scelta
 * (o "—" se vuota) e apre il date picker NATIVO del sistema operativo al
 * tocco. Esiste una versione parallela `DateField.web.tsx` che usa un
 * `<input type="date">` HTML invece del picker nativo (che su web non
 * esiste) — Expo scegue automaticamente il file giusto in base alla
 * piattaforma grazie all'estensione ".web.tsx".
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  /** Data in formato ISO (yyyy-mm-dd). */
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();

  return (
    <View style={styles.container}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <ThemedText>{value || '—'}</ThemedText>
        <Feather name="calendar" size={16} color={theme.textSecondary} />
      </Pressable>

      {open && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          // Su iOS il picker "inline" resta visibile finché non si chiude a
          // mano; su Android è già un dialogo che si chiude da solo alla scelta.
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            // Su iOS il picker resta apert fino a tocco esplicito, quindi
            // `setOpen` va aggiornato in base alla piattaforma; su Android
            // il dialogo si chiude comunque da solo dopo questo evento.
            setOpen(Platform.OS === 'ios');
            if (event.type === 'dismissed') return;
            if (selected) onChange(toIsoDate(selected));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
});
