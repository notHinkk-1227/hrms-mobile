import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Kalau true + secureTextEntry, render tombol eye untuk toggle visibility */
  toggleSecure?: boolean;
}

export function TextField({
  label,
  error,
  hint,
  style,
  editable = true,
  secureTextEntry,
  toggleSecure,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const [revealed, setRevealed] = useState(false);
  const showToggle = Boolean(toggleSecure && secureTextEntry);
  const effectiveSecure = secureTextEntry && !(showToggle && revealed);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
        ]}
      >
        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={effectiveSecure}
          placeholderTextColor={tokens.color.ink300}
          style={[styles.input, showToggle && styles.inputWithToggle, style]}
        />
        {showToggle ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Sembunyikan password' : 'Tampilkan password'}
            style={styles.toggleBtn}
          >
            {revealed ? (
              <EyeOff size={20} color={tokens.semantic.fg3} />
            ) : (
              <Eye size={20} color={tokens.semantic.fg3} />
            )}
          </Pressable>
        ) : null}
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
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: tokens.spacing.sp3,
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg1,
  },
  inputWithToggle: { paddingRight: 0 },
  inputError: { borderColor: tokens.color.error },
  inputDisabled: { backgroundColor: tokens.semantic.surface2 },
  toggleBtn: {
    paddingHorizontal: tokens.spacing.sp3,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  hint: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
