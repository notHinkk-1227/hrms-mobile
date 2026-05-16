import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { Select } from '@shared/components/Select';
import { DateField } from '@shared/components/DateField';
import { TextField } from '@shared/components/TextField';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { attendanceRequestApi } from '@infrastructure/api/hrmsClient';
import { ApiError } from '@infrastructure/api/errors';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'RequestAttendance'>;

const REASON_OPTIONS = [
  {
    value: 'Work From Home' as const,
    label: 'Work From Home',
    description: 'Bekerja dari rumah, tidak hadir di kantor',
  },
  {
    value: 'On Duty' as const,
    label: 'On Duty',
    description: 'Tugas luar kantor atau perjalanan dinas',
  },
];

export function RequestAttendanceScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);

  const [reason, setReason] = useState<'Work From Home' | 'On Duty' | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [halfDay, setHalfDay] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const onSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!reason) newErrors.reason = 'Pilih alasan';
    if (!fromDate) newErrors.fromDate = 'Pilih tanggal mulai';
    if (!toDate) newErrors.toDate = 'Pilih tanggal selesai';
    if (fromDate && toDate && fromDate > toDate) newErrors.toDate = 'Tanggal selesai harus setelah mulai';
    if (!explanation.trim()) newErrors.explanation = 'Penjelasan wajib diisi';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0 || !employee?.name) return;

    setSubmitting(true);
    try {
      const result = await attendanceRequestApi.submit({
        employee: employee.name,
        from_date: fromDate!,
        to_date: toDate!,
        reason: reason!,
        explanation: explanation.trim(),
        half_day: halfDay ? 1 : 0,
        half_day_date: halfDay ? fromDate! : undefined,
      });
      navigation.replace('FormSuccess', {
        doctype: 'Attendance Request',
        name: result.name,
        title: 'Permohonan Koreksi Absen Terkirim',
        message: 'Atasan akan memverifikasi koreksi absen Anda.',
      });
    } catch (e) {
      const apiError = e as ApiError;
      Alert.alert('Gagal mengirim koreksi absen', apiError.message || 'Coba lagi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader
          title="Koreksi Absen"
          subtitle="Untuk WFH atau dinas luar"
          onBack={() => navigation.goBack()}
        />

        <View style={styles.form}>
          <Select
            label="Alasan"
            value={reason}
            options={REASON_OPTIONS}
            onChange={(v) => setReason(v as 'Work From Home' | 'On Duty')}
            placeholder="Pilih alasan"
            error={errors.reason}
          />
          <DateField label="Tanggal Mulai" value={fromDate} onChange={setFromDate} error={errors.fromDate} />
          <DateField
            label="Tanggal Selesai"
            value={toDate}
            onChange={setToDate}
            minDate={fromDate ? new Date(fromDate + 'T00:00:00') : undefined}
            error={errors.toDate}
          />
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Setengah Hari</Text>
              <Text style={styles.switchHint}>Aktifkan kalau hari pertama setengah hari</Text>
            </View>
            <Switch
              value={halfDay}
              onValueChange={setHalfDay}
              trackColor={{ false: tokens.color.ink200, true: tokens.color.blue200 }}
              thumbColor={halfDay ? tokens.semantic.brand : tokens.color.white}
            />
          </View>
          <TextField
            label="Penjelasan"
            value={explanation}
            onChangeText={setExplanation}
            placeholder="Jelaskan situasi"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            error={errors.explanation}
          />
        </View>
      </ScrollView>

      <View style={styles.stickyCta}>
        <Button fullWidth onPress={onSubmit} loading={submitting}>
          Kirim Permohonan
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: 120 },
  form: { gap: tokens.spacing.sp3 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sp2,
  },
  switchText: { flex: 1 },
  switchLabel: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
  switchHint: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  textArea: { height: 96, paddingTop: tokens.spacing.sp2, textAlignVertical: 'top' },
  stickyCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: tokens.spacing.sp4,
    paddingTop: tokens.spacing.sp3,
    paddingBottom: tokens.spacing.sp4,
    backgroundColor: tokens.semantic.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.line,
  },
});
