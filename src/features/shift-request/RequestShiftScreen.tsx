import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { NoticeCard } from '@shared/components/NoticeCard';
import { Screen } from '@shared/components/Screen';
import { Select } from '@shared/components/Select';
import { StickyCta } from '@shared/components/StickyCta';
import { DateField } from '@shared/components/DateField';
import { useToast } from '@shared/components/Toast';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { shiftRequestApi, ShiftType } from '@infrastructure/api/hrmsClient';
import { ApiError } from '@infrastructure/api/errors';
import { translateFrappeError } from '@infrastructure/api/errorTranslator';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'RequestShift'>;

export function RequestShiftScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const toast = useToast();

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [shiftType, setShiftType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    shiftRequestApi
      .listShiftTypes()
      .then(setShiftTypes)
      .catch(() => {
        toast.show({ variant: 'warning', message: 'Gagal memuat tipe shift' });
      })
      .finally(() => setLoadingTypes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    setSubmitError(null);
    const newErrors: Record<string, string> = {};
    if (!shiftType) newErrors.shiftType = 'Pilih tipe shift';
    if (!fromDate) newErrors.fromDate = 'Pilih tanggal mulai';
    if (fromDate && toDate && fromDate > toDate) newErrors.toDate = 'Tanggal selesai harus setelah mulai';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0 || !employee?.name) return;

    setSubmitting(true);
    try {
      const result = await shiftRequestApi.submit({
        employee: employee.name,
        shift_type: shiftType!,
        from_date: fromDate!,
        to_date: toDate ?? undefined,
      });
      navigation.replace('FormSuccess', {
        doctype: 'Shift Request',
        name: result.name,
        title: 'Permohonan Ganti Shift Terkirim',
        message: 'Atasan akan memproses permohonan shift Anda.',
      });
    } catch (e) {
      const apiError = e as ApiError;
      const msg = translateFrappeError(apiError.message);
      setSubmitError(msg);
      toast.show({ variant: 'error', title: 'Gagal mengirim shift', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Ganti Shift" onBack={() => navigation.goBack()} />

        <View style={styles.form}>
          <Select
            label="Tipe Shift"
            value={shiftType}
            options={shiftTypes.map((s) => ({
              value: s.name,
              label: s.name,
              description: `${s.start_time} – ${s.end_time}`,
            }))}
            onChange={(v) => {
              setShiftType(v);
              setSubmitError(null);
            }}
            placeholder={loadingTypes ? 'Memuat…' : 'Pilih shift'}
            loading={loadingTypes}
            error={errors.shiftType}
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
            label="Tanggal Selesai (opsional)"
            value={toDate}
            onChange={(v) => {
              setToDate(v);
              setSubmitError(null);
            }}
            minDate={fromDate ? new Date(fromDate + 'T00:00:00') : undefined}
            error={errors.toDate}
            hint="Kosongkan kalau perubahan permanen"
          />

          {submitError ? (
            <NoticeCard variant="error" title="Tidak bisa mengirim shift" body={submitError} />
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
  ctaRow: { flexDirection: 'row', gap: tokens.spacing.sp2 },
  ctaCancel: { flex: 1 },
  ctaSubmit: { flex: 2 },
});
