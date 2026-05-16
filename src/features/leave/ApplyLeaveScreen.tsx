import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Calendar } from 'lucide-react-native';
import { ApproverCard } from '@shared/components/ApproverCard';
import { BalanceCard } from '@shared/components/BalanceCard';
import { Button } from '@shared/components/Button';
import { NoticeCard } from '@shared/components/NoticeCard';
import { Screen } from '@shared/components/Screen';
import { Select } from '@shared/components/Select';
import { StickyCta } from '@shared/components/StickyCta';
import { DateField } from '@shared/components/DateField';
import { TextField } from '@shared/components/TextField';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { leaveApi, LeaveType, LeaveBalance } from '@infrastructure/api/hrmsClient';
import { ApiError } from '@infrastructure/api/errors';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ApplyLeave'>;

function daysBetween(from: string, to: string): number {
  const f = new Date(from + 'T00:00:00');
  const t = new Date(to + 'T00:00:00');
  const ms = t.getTime() - f.getTime();
  return Math.max(0, Math.round(ms / 86_400_000)) + 1;
}

export function ApplyLeaveScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [leaveType, setLeaveType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [halfDay, setHalfDay] = useState(false);
  const [description, setDescription] = useState('');
  const [balance, setBalance] = useState<Record<string, LeaveBalance>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    leaveApi
      .listTypes()
      .then(setTypes)
      .catch(() => {
        Alert.alert('Gagal memuat tipe cuti', 'Coba lagi nanti');
      })
      .finally(() => setLoadingTypes(false));
  }, []);

  const loadBalance = useCallback(async () => {
    if (!employee?.name) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const data = await leaveApi.getLeaveDetails(employee.name, today);
      setBalance(data);
    } catch {
      // silent — balance optional display
    }
  }, [employee?.name]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const currentBalance = leaveType ? balance[leaveType]?.leave_balance ?? null : null;
  const totalDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const days = daysBetween(fromDate, toDate);
    return halfDay ? Math.max(0.5, days - 0.5) : days;
  }, [fromDate, toDate, halfDay]);

  const onSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!leaveType) newErrors.leaveType = 'Pilih tipe cuti';
    if (!fromDate) newErrors.fromDate = 'Pilih tanggal mulai';
    if (!toDate) newErrors.toDate = 'Pilih tanggal selesai';
    if (fromDate && toDate && fromDate > toDate) newErrors.toDate = 'Tanggal selesai harus setelah tanggal mulai';
    if (!description.trim()) newErrors.description = 'Alasan wajib diisi';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0 || !employee?.name) return;

    setSubmitting(true);
    try {
      const result = await leaveApi.submit({
        employee: employee.name,
        leave_type: leaveType!,
        from_date: fromDate!,
        to_date: toDate!,
        half_day: halfDay ? 1 : 0,
        half_day_date: halfDay ? fromDate! : undefined,
        description: description.trim(),
      });
      navigation.replace('FormSuccess', {
        doctype: 'Leave Application',
        name: result.name,
        title: 'Permohonan Cuti Terkirim',
        message: 'Atasan akan mendapat notifikasi untuk approval.',
      });
    } catch (e) {
      const apiError = e as ApiError;
      Alert.alert('Gagal mengirim cuti', apiError.message || 'Coba lagi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Ajukan Cuti" subtitle="Permohonan cuti karyawan" onBack={() => navigation.goBack()} />

        <View style={styles.form}>
          <Select
            label="Tipe Cuti"
            value={leaveType}
            options={types.map((t) => ({ value: t.name, label: t.name }))}
            onChange={setLeaveType}
            placeholder={loadingTypes ? 'Memuat…' : 'Pilih tipe cuti'}
            loading={loadingTypes}
            error={errors.leaveType}
          />
          {leaveType && currentBalance !== null ? (
            <BalanceCard
              variant="green"
              icon={<Calendar size={18} color={tokens.color.green700} />}
              title="Sisa cuti"
              value={`${currentBalance} hari`}
              endLabel={balance[leaveType]?.total_leaves_allocated ? 'TOTAL' : undefined}
              endValue={
                balance[leaveType]?.total_leaves_allocated
                  ? `${balance[leaveType].total_leaves_allocated}`
                  : undefined
              }
            />
          ) : null}

          <DateField
            label="Tanggal Mulai"
            value={fromDate}
            onChange={setFromDate}
            error={errors.fromDate}
          />
          <DateField
            label="Tanggal Selesai"
            value={toDate}
            onChange={setToDate}
            minDate={fromDate ? new Date(fromDate + 'T00:00:00') : undefined}
            error={errors.toDate}
          />

          {totalDays > 0 ? (
            <Text style={styles.totalHint}>
              Total: <Text style={styles.totalValue}>{totalDays} hari</Text>
              {halfDay ? ' (termasuk setengah hari)' : ''}
            </Text>
          ) : null}

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
            label="Alasan"
            value={description}
            onChangeText={setDescription}
            placeholder="Jelaskan alasan cuti"
            multiline
            numberOfLines={4}
            maxLength={500}
            style={styles.textArea}
            error={errors.description}
            hint={`${description.length} / 500 karakter`}
          />

          {totalDays > 0 && currentBalance !== null && totalDays > currentBalance ? (
            <NoticeCard
              variant="warning"
              title="Melebihi sisa cuti"
              body={`Pengajuan ${totalDays} hari melebihi sisa ${currentBalance} hari. Atasan mungkin tolak.`}
            />
          ) : null}

          <ApproverCard
            name="Atasan langsung"
            role="Permohonan akan masuk ke atasan Anda saat dikirim"
          />
        </View>
      </ScrollView>

      <StickyCta>
        <Button fullWidth onPress={onSubmit} loading={submitting}>
          Kirim Permohonan
        </Button>
      </StickyCta>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: 120 },
  form: { gap: tokens.spacing.sp3 },
  totalHint: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg2,
    padding: tokens.spacing.sp2,
    backgroundColor: tokens.semantic.surface2,
    borderRadius: tokens.radius.sm,
  },
  totalValue: { fontWeight: '700', color: tokens.semantic.brand },
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
});
