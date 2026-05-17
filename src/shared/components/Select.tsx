import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

const Separator = () => <View style={separatorStyles.sep} />;
const EmptyState = () => <Text style={separatorStyles.empty}>Tidak ada pilihan</Text>;

const separatorStyles = StyleSheet.create({
  sep: { height: 1, backgroundColor: tokens.semantic.line, marginLeft: tokens.spacing.sp4 },
  empty: { padding: tokens.spacing.sp4, textAlign: 'center', color: tokens.semantic.fg3 },
});

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface SelectProps<T extends string = string> {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  loading?: boolean;
}

export function Select<T extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Pilih',
  error,
  hint,
  loading,
}: SelectProps<T>): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => !loading && setOpen(true)}
        style={[styles.input, error ? styles.inputError : null, loading && styles.inputDisabled]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {loading ? 'Memuat…' : selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={18} color={tokens.semantic.fg3} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label ?? 'Pilih'}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <X size={20} color={tokens.semantic.fg2} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    {item.description ? (
                      <Text style={styles.rowDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  {value === item.value ? (
                    <Check size={20} color={tokens.semantic.brand} />
                  ) : null}
                </Pressable>
              )}
              ItemSeparatorComponent={Separator}
              ListEmptyComponent={EmptyState}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.spacing.sp1_5, width: '100%' },
  label: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg2,
    fontWeight: '600',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
  },
  inputError: { borderColor: tokens.color.error },
  inputDisabled: { backgroundColor: tokens.semantic.surface2 },
  value: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, flex: 1 },
  placeholder: { color: tokens.color.ink300 },
  error: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  hint: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: tokens.semantic.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '80%',
    paddingBottom: tokens.spacing.sp4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.ink200,
    alignSelf: 'center',
    marginTop: tokens.spacing.sp2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.sp4,
    paddingVertical: tokens.spacing.sp3,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  sheetTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sp4,
    paddingVertical: tokens.spacing.sp3,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1 },
  rowDesc: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3, marginTop: 2 },
});
