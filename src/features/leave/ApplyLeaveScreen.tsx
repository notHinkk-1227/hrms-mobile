import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { useToast } from '@shared/components/Toast';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { analytics } from '@infrastructure/analytics';
import { leaveApi, LeaveType, LeaveBalance } from '@infrastructure/api/hrmsClient';
import { getEmployeeApprovers } from '@infrastructure/api/employeeClient';
import { ApiError } from '@infrastructure/api/errors';
import { translateFrappeError } from '@infrastructure/api/errorTranslator';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ApplyLeave'>;

const ID_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function enumerateWorkingDays(from: string, to: string): Date[] {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  if (end.getTime() < start.getTime()) return [];
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function summarizeDays(days: Date[]): string {
  if (days.length === 0) return '';
  if (days.length === 1) {
    const d = days[0];
    return `${d.getDate()} ${ID_SHORT_MONTHS[d.getMonth()]}`;
  }
  const grouped = days.reduce<Record<string, number[]>>((acc, d) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    (acc[key] ||= []).push(d.getDate());
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([key, dates]) => {
      const month = Number(key.split('-')[1]);
      return `${dates.join(', ')} ${ID_SHORT_MONTHS[month]}`;
    })
    .join(' · ');
}

export function ApplyLeaveScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const toast = useToast();

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [leaveType, setLeaveType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [balance, setBalance] = useState<Record<string, LeaveBalance>>({});
  const [leaveApprover, setLeaveApprover] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    leaveApi
      .listTypes()
      .then(setTypes)
      .catch(() => {
        toast.show({ variant: 'warning', message: 'Gagal memuat tipe cuti' });
      })
      .finally(() => setLoadingTypes(false));
    if (employee?.name) {
      getEmployeeApprovers(employee.name)
        .then((a) => setLeaveApprover(a.leave_approver))
        .catch(() => {
          // silent — auto-fill optional
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.name]);

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

  const workingDays = useMemo(() => {
    if (!fromDate || !toDate) return [];
    return enumerateWorkingDays(fromDate, toDate);
  }, [fromDate, toDate]);
  const totalDays = workingDays.length;

  const onSubmit = async () => {
    setSubmitError(null);
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
        half_day: 0,
        description: description.trim(),
        leave_approver: leaveApprover ?? undefined,
      });
      analytics.logEvent('leave_request_submitted', {
        leave_type: leaveType,
      }).catch(() => undefined);
      navigation.replace('FormSuccess', {
        doctype: 'Leave Application',
        name: result.name,
        title: 'Permohonan Cuti Terkirim',
        message: 'Atasan akan mendapat notifikasi untuk approval.',
      });
    } catch (e) {
      const apiError = e as ApiError;
      const msg = translateFrappeError(apiError.message);
      setSubmitError(msg);
      toast.show({ variant: 'error', title: 'Gagal mengirim cuti', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader title="Ajukan Cuti" onBack={() => navigation.goBack()} />

        <View style={styles.form}>
          <Select
            label="Tipe Cuti"
            value={leaveType}
            options={types.map((t) => ({ value: t.name, label: t.name }))}
            onChange={(v) => {
              setLeaveType(v);
              setSubmitError(null);
            }}
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
              stats={
                balance[leaveType]?.total_leaves_allocated
                  ? [
                      { label: 'TOTAL', value: balance[leaveType].total_leaves_allocated },
                      { label: 'TERPAKAI', value: balance[leaveType].leaves_taken ?? 0 },
                    ]
                  : undefined
              }
            />
          ) : null}

          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <DateField
                label="Mulai"
                value={fromDate}
                onChange={(v) => {
                  setFromDate(v);
                  setSubmitError(null);
                }}
                error={errors.fromDate}
              />
            </View>
            <View style={styles.dateCol}>
              <DateField
                label="Selesai"
                value={toDate}
                onChange={(v) => {
                  setToDate(v);
                  setSubmitError(null);
                }}
                minDate={fromDate ? new Date(fromDate + 'T00:00:00') : undefined}
                error={errors.toDate}
              />
            </View>
          </View>

          {totalDays > 0 ? (
            <NoticeCard
              variant="warning"
              title={`Total: ${totalDays} hari kerja`}
              body={summarizeDays(workingDays)}
            />
          ) : null}

          <TextField
            label="Alasan"
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              setSubmitError(null);
            }}
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
            name={leaveApprover ?? 'Atasan langsung'}
            role={leaveApprover ? 'Approver Anda' : 'Permohonan akan masuk ke atasan Anda saat dikirim'}
          />

          {submitError ? (
            <NoticeCard variant="error" title="Tidak bisa mengirim cuti" body={submitError} />
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
  dateRow: { flexDirection: 'row', gap: tokens.spacing.sp2 },
  dateCol: { flex: 1, minWidth: 0 },
  textArea: { height: 96, paddingTop: tokens.spacing.sp2, textAlignVertical: 'top' },
  ctaRow: { flexDirection: 'row', gap: tokens.spacing.sp2 },
  ctaCancel: { flex: 1 },
  ctaSubmit: { flex: 2 },
});
