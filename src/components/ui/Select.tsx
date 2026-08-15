import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
}: {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={16} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    (pressed || item.value === value) && { backgroundColor: theme.surfaceMuted },
                  ]}>
                  <ThemedText themeColor={item.value === value ? 'primary' : 'text'}>{item.label}</ThemedText>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 25, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  list: {
    width: '100%',
    maxWidth: 360,
    maxHeight: 320,
    borderRadius: Radii.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
