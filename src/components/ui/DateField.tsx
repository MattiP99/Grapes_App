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
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
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
