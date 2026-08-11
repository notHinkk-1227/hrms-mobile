import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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

function parseValue(iso: string | null): Date {
  return iso ? new Date(iso + 'T00:00:00') : new Date();
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
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);
  // Temp value only used by the iOS modal; committed to onChange on "Selesai".
  const [tempDate, setTempDate] = useState<Date>(() => parseValue(value));

  const isIOS = Platform.OS === 'ios';

  const openPicker = () => {
    setTempDate(parseValue(value));
    setShow(true);
  };

  // Android: native dialog. Fires once with 'set' or 'dismissed'.
  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (event.type === 'set' && selected) {
      onChange(toIsoDate(selected));
    }
  };

  // iOS: inline picker inside the modal updates temp only; commit deferred.
  const onIOSChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  const confirmIOS = () => {
    onChange(toIsoDate(tempDate));
    setShow(false);
  };

  const cancelIOS = () => {
    setShow(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        style={[styles.input, error ? styles.inputError : null]}
      >
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {formatDisplay(value, placeholder)}
        </Text>
        <Calendar size={18} color={tokens.semantic.fg3} />
      </Pressable>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      {isIOS ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={cancelIOS}>
          <Pressable style={styles.backdrop} onPress={cancelIOS}>
            {/* Inner no-op onPress stops backdrop dismissal when tapping the sheet. */}
            <Pressable
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, tokens.spacing.sp2) }]}
              onPress={() => {}}
            >
              <View style={styles.headerBar}>
                <Pressable hitSlop={8} onPress={cancelIOS}>
                  <Text style={styles.headerCancel}>Batal</Text>
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {label ?? placeholder}
                </Text>
                <Pressable hitSlop={8} onPress={confirmIOS}>
                  <Text style={styles.headerDone}>Selesai</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={onIOSChange}
                locale="id-ID"
                themeVariant="light"
                accentColor={tokens.semantic.brand}
                style={styles.picker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : show ? (
        <DateTimePicker
          value={parseValue(value)}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={onAndroidChange}
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
  value: { flex: 1, fontSize: tokens.fontSize.body, color: tokens.semantic.fg1 },
  placeholder: { color: tokens.color.ink300 },
  error: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  hint: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },

  // iOS bottom-sheet modal
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: tokens.semantic.surface,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.sp4,
    paddingTop: tokens.spacing.sp2,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.sp2,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
    marginBottom: tokens.spacing.sp2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: tokens.fontSize.body,
    fontWeight: '600',
    color: tokens.semantic.fg2,
    paddingHorizontal: tokens.spacing.sp2,
  },
  headerCancel: {
    fontSize: tokens.fontSize.h4,
    color: tokens.semantic.fg3,
    minWidth: 56,
  },
  headerDone: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '600',
    color: tokens.semantic.brand,
    minWidth: 56,
    textAlign: 'right',
  },
  picker: { width: '100%' },
});
