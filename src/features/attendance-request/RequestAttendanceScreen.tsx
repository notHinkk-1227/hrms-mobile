import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { NoticeCard } from '@shared/components/NoticeCard';
import { Screen } from '@shared/components/Screen';
import { Select } from '@shared/components/Select';
import { StickyCta } from '@shared/components/StickyCta';
import { DateField } from '@shared/components/DateField';
import { TextField } from '@shared/components/TextField';
import { useToast } from '@shared/components/Toast';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { attendanceRequestApi } from '@infrastructure/api/hrmsClient';
import { ApiError } from '@infrastructure/api/errors';
import { translateFrappeError } from '@infrastructure/api/errorTranslator';
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
  const toast = useToast();

  const [reason, setReason] = useState<'Work From Home' | 'On Duty' | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [halfDay, setHalfDay] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitError(null);
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
        title: 'Permohonan Koreksi Presensi Terkirim',
        message: 'Atasan akan memverifikasi koreksi presensi Anda.',
      });
    } catch (e) {
      const apiError = e as ApiError;
      const msg = translateFrappeError(apiError.message);
      setSubmitError(msg);
      toast.show({ variant: 'error', title: 'Gagal mengirim koreksi presensi', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Koreksi Presensi" onBack={() => navigation.goBack()} />

        <View style={styles.form}>
          <Select
            label="Alasan"
            value={reason}
            options={REASON_OPTIONS}
            onChange={(v) => {
              setReason(v as 'Work From Home' | 'On Duty');
              setSubmitError(null);
            }}
            placeholder="Pilih alasan"
            error={errors.reason}
          />
          <DateField
            label="Tanggal Mulai"
            value={fromDate}
            onChange={(v) => {
              setFromDate(v);
              setSubmitError(null);
            }}
            error={errors.fromDate}
          />
          <DateField
            label="Tanggal Selesai"
            value={toDate}
            onChange={(v) => {
              setToDate(v);
              setSubmitError(null);
            }}
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
              onValueChange={(v) => {
                setHalfDay(v);
                setSubmitError(null);
              }}
              trackColor={{ false: tokens.color.ink200, true: tokens.color.blue200 }}
              thumbColor={halfDay ? tokens.semantic.brand : tokens.color.white}
            />
          </View>
          <TextField
            label="Penjelasan"
            value={explanation}
            onChangeText={(t) => {
              setExplanation(t);
              setSubmitError(null);
            }}
            placeholder="Jelaskan situasi"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            error={errors.explanation}
          />

          {submitError ? (
            <NoticeCard variant="error" title="Tidak bisa mengirim koreksi presensi" body={submitError} />
          ) : null}
        </View>
      </ScrollView>

      <StickyCta>
        <View style={styles.ctaRow}>
          <Button variant="outline" style={styles.ctaCancel} onPress={() => navigation.goBack()}>
            Batal
          </Button>
          <Button style={styles.ctaSubmit} onPress={onSubmit} loading={submitting}>
            Kirim Permohonan
          </Button>
        </View>
      </StickyCta>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.formCtaSpace },
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
  ctaRow: { flexDirection: 'row', gap: tokens.spacing.sp2 },
  ctaCancel: { flex: 1 },
  ctaSubmit: { flex: 2 },
});
