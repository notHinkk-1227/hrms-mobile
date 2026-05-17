import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface DateFieldProps {
  label?: string;
  value: string | null; // YYYY-MM-DD
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDisplay(iso: string | null, placeholder: string): string {
  if (!iso) return placeholder;
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
  minDate,
  maxDate,
  placeholder = 'Pilih tanggal',
}: DateFieldProps): React.JSX.Element {
  const [show, setShow] = useState(false);

  const onPickerChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selected) {
      onChange(toIsoDate(selected));
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.input, error ? styles.inputError : null]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {formatDisplay(value, placeholder)}
        </Text>
        <Calendar size={18} color={tokens.semantic.fg3} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {show ? (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={onPickerChange}
        />
      ) : null}
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
  value: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1 },
  placeholder: { color: tokens.color.ink300 },
  error: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  hint: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
