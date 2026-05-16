import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export interface CurrencyInputProps {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  prefix?: string;
  placeholder?: string;
}

function formatRp(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseDigits(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
}

export function CurrencyInput({
  label,
  value,
  onChange,
  error,
  hint,
  prefix = 'Rp',
  placeholder = '0',
}: CurrencyInputProps): React.JSX.Element {
  const display = value === null || value === 0 ? '' : formatRp(value);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <Text style={styles.prefix}>{prefix}</Text>
        <TextInput
          value={display}
          onChangeText={(t) => onChange(parseDigits(t))}
          placeholder={placeholder}
          placeholderTextColor={tokens.color.ink300}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, width: '100%' },
  label: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg2,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.semantic.surface,
    paddingHorizontal: tokens.spacing.sp3,
  },
  inputError: { borderColor: tokens.color.error },
  prefix: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg3,
    fontWeight: '600',
    marginRight: tokens.spacing.sp2,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg1,
    fontFamily: tokens.font.mono,
  },
  error: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  hint: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
