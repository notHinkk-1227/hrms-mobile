import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { Select } from '@shared/components/Select';
import { DateField } from '@shared/components/DateField';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { shiftRequestApi, ShiftType } from '@infrastructure/api/hrmsClient';
import { ApiError } from '@infrastructure/api/errors';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'RequestShift'>;

export function RequestShiftScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [shiftType, setShiftType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    shiftRequestApi
      .listShiftTypes()
      .then(setShiftTypes)
      .catch(() => {
        Alert.alert('Gagal memuat shift', 'Coba lagi nanti');
      })
      .finally(() => setLoadingTypes(false));
  }, []);

  const onSubmit = async () => {
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
      Alert.alert('Gagal mengirim shift', apiError.message || 'Coba lagi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Ganti Shift" subtitle="Permohonan pindah shift" onBack={() => navigation.goBack()} />

        <View style={styles.form}>
          <Select
            label="Tipe Shift"
            value={shiftType}
            options={shiftTypes.map((s) => ({
              value: s.name,
              label: s.name,
              description: `${s.start_time} – ${s.end_time}`,
            }))}
            onChange={setShiftType}
            placeholder={loadingTypes ? 'Memuat…' : 'Pilih shift'}
            loading={loadingTypes}
            error={errors.shiftType}
          />
          <DateField label="Tanggal Mulai" value={fromDate} onChange={setFromDate} error={errors.fromDate} />
          <DateField
            label="Tanggal Selesai (opsional)"
            value={toDate}
            onChange={setToDate}
            minDate={fromDate ? new Date(fromDate + 'T00:00:00') : undefined}
            error={errors.toDate}
            hint="Kosongkan kalau perubahan permanen"
          />
        </View>

        <View style={styles.cta}>
          <Button fullWidth onPress={onSubmit} loading={submitting}>
            Kirim Permohonan
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4 },
  form: { gap: tokens.spacing.sp3 },
  cta: { gap: tokens.spacing.sp2, marginTop: tokens.spacing.sp3 },
});
