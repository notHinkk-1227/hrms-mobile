import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, style, editable = true, ...rest }: TextFieldProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        editable={editable}
        placeholderTextColor={tokens.color.ink300}
        style={[
          styles.input,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
          style,
        ]}
      />
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
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sp3,
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg1,
    backgroundColor: tokens.semantic.surface,
  },
  inputError: { borderColor: tokens.color.error },
  inputDisabled: { backgroundColor: tokens.semantic.surface2, color: tokens.semantic.fg3 },
  error: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  hint: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
