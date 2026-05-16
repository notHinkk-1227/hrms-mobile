import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Screen } from '@shared/components/Screen';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { attendanceApi, AttendanceRecord } from '@infrastructure/api/hrmsClient';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'MyAttendance'>;

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function statusColor(status: string): string {
  switch (status) {
    case 'Present':
      return tokens.color.green500;
    case 'Half Day':
      return tokens.color.yellow400;
    case 'On Leave':
      return tokens.color.blue400;
    case 'Work From Home':
      return tokens.color.blue300;
    case 'Absent':
      return tokens.color.error;
    default:
      return tokens.color.ink200;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'Present':
      return 'Hadir';
    case 'Half Day':
      return 'Setengah Hari';
    case 'On Leave':
      return 'Cuti';
    case 'Work From Home':
      return 'WFH';
    case 'Absent':
      return 'Absen';
    default:
      return status;
  }
}

function getMonthMatrix(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function MyAttendanceScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employee?.name) return;
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.listByMonth(employee.name, year, month);
      setRecords(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat absensi');
    } finally {
      setLoading(false);
    }
  }, [employee?.name, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const matrix = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const recordByDate = useMemo(() => {
    const map: Record<number, AttendanceRecord> = {};
    records.forEach((r) => {
      const d = new Date(r.attendance_date);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        map[d.getDate()] = r;
      }
    });
    return map;
  }, [records, year, month]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const stats = useMemo(() => {
    const counts: Record<string, number> = { Present: 0, Absent: 0, 'On Leave': 0, 'Half Day': 0, 'Work From Home': 0 };
    records.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return counts;
  }, [records]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <FormHeader title="Riwayat Absen" onBack={() => navigation.goBack()} />

        <View style={styles.monthNav}>
          <Pressable onPress={prevMonth} hitSlop={12}>
            <ChevronLeft size={24} color={tokens.semantic.fg2} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable onPress={nextMonth} hitSlop={12}>
            <ChevronRight size={24} color={tokens.semantic.fg2} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.semantic.brand} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.calendar}>
              <View style={styles.weekRow}>
                {DAYS.map((d) => (
                  <Text key={d} style={styles.weekHeader}>
                    {d}
                  </Text>
                ))}
              </View>
              <View style={styles.weekGrid}>
                {matrix.map((day, idx) => {
                  if (day === null) return <View key={`empty-${idx}`} style={styles.cell} />;
                  const record = recordByDate[day];
                  return (
                    <View key={`d-${day}`} style={styles.cell}>
                      <View
                        style={[
                          styles.cellInner,
                          record && { backgroundColor: statusColor(record.status) + '20', borderColor: statusColor(record.status) },
                        ]}
                      >
                        <Text style={styles.cellText}>{day}</Text>
                        {record ? (
                          <View
                            style={[styles.dot, { backgroundColor: statusColor(record.status) }]}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Ringkasan</Text>
              {Object.entries(stats)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => (
                  <View key={k} style={styles.statRow}>
                    <View style={styles.statRowLeft}>
                      <View style={[styles.statDot, { backgroundColor: statusColor(k) }]} />
                      <Text style={styles.statLabel}>{statusLabel(k)}</Text>
                    </View>
                    <Text style={styles.statValue}>{v} hari</Text>
                  </View>
                ))}
              {Object.values(stats).every((v) => v === 0) ? (
                <Text style={styles.statsEmpty}>Tidak ada catatan absensi bulan ini.</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.sp2,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  monthLabel: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  center: { padding: tokens.spacing.sp5, alignItems: 'center' },
  errorText: { color: tokens.color.error },
  calendar: {
    padding: tokens.spacing.sp2,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  weekRow: { flexDirection: 'row', marginBottom: tokens.spacing.sp1 },
  weekHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontWeight: '700',
  },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  cellInner: {
    flex: 1,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 2,
  },
  cellText: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg1 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  statsCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp2,
  },
  statsTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statRowLeft: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp2 },
  statDot: { width: 12, height: 12, borderRadius: 6 },
  statLabel: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg2 },
  statValue: { fontSize: tokens.fontSize.body, fontWeight: '700', color: tokens.semantic.fg1 },
  statsEmpty: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
