import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { Select } from '@shared/components/Select';
import { DateField } from '@shared/components/DateField';
import { TextField } from '@shared/components/TextField';
import { CurrencyInput } from '@shared/components/CurrencyInput';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { advanceApi, ModeOfPayment } from '@infrastructure/api/hrmsClient';
import { ApiError } from '@infrastructure/api/errors';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ApplyAdvance'>;

export function ApplyAdvanceScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);

  const [modes, setModes] = useState<ModeOfPayment[]>([]);
  const [loadingModes, setLoadingModes] = useState(true);
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [postingDate, setPostingDate] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
  );
  const [modeOfPayment, setModeOfPayment] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    advanceApi
      .listModeOfPayment()
      .then(setModes)
      .catch(() => {
        // silent — mode optional
      })
      .finally(() => setLoadingModes(false));
  }, []);

  const onSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!purpose.trim()) newErrors.purpose = 'Keperluan wajib diisi';
    if (!amount || amount <= 0) newErrors.amount = 'Jumlah harus lebih dari 0';
    if (!postingDate) newErrors.postingDate = 'Pilih tanggal';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0 || !employee?.name) return;

    if (!employee.company) {
      Alert.alert('Data perusahaan kosong', 'Hubungi HR untuk lengkapi data karyawan.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await advanceApi.submit({
        employee: employee.name,
        company: employee.company,
        posting_date: postingDate!,
        advance_amount: amount!,
        purpose: purpose.trim(),
        repay_unclaimed_amount_from_salary: 1,
        mode_of_payment: modeOfPayment ?? undefined,
      });
      navigation.replace('FormSuccess', {
        doctype: 'Employee Advance',
        name: result.name,
        title: 'Permohonan Kasbon Terkirim',
        message: 'Atasan akan memproses permohonan kasbon Anda.',
      });
    } catch (e) {
      const apiError = e as ApiError;
      Alert.alert('Gagal mengirim kasbon', apiError.message || 'Coba lagi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Ajukan Kasbon" subtitle="Permohonan uang muka" onBack={() => navigation.goBack()} />

        <View style={styles.form}>
          <DateField label="Tanggal Pengajuan" value={postingDate} onChange={setPostingDate} error={errors.postingDate} />
          <CurrencyInput
            label="Jumlah Kasbon"
            value={amount}
            onChange={setAmount}
            error={errors.amount}
            hint="Akan dipotong dari gaji bulan depan"
          />
          <TextField
            label="Keperluan"
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Jelaskan keperluan kasbon"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            error={errors.purpose}
          />
          <Select
            label="Mode Pembayaran (opsional)"
            value={modeOfPayment}
            options={modes.map((m) => ({ value: m.name, label: m.name, description: m.type }))}
            onChange={setModeOfPayment}
            placeholder={loadingModes ? 'Memuat…' : 'Pilih mode pembayaran'}
            loading={loadingModes}
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
