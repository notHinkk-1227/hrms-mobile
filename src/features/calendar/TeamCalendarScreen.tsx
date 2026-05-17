import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheet } from '@shared/components/BottomSheet';
import { MonthCalendar, CellTheme } from '@shared/components/MonthCalendar';
import { Screen } from '@shared/components/Screen';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import {
  calendarApi,
  HolidayItem,
  TeamLeaveItem,
} from '@infrastructure/api/calendarClient';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'TeamCalendar'>;

function startOfMonth(year: number, month: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-01`;
}
function endOfMonth(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(last)}`;
}

function isoFor(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isoBetween(from: string, to: string, year: number, month: number): string[] {
  const out: string[] = [];
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    if (cur.getFullYear() === year && cur.getMonth() + 1 === month) {
      out.push(isoFor(year, month, cur.getDate()));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

interface DayDetail {
  iso: string;
  holiday: HolidayItem | null;
  leaves: TeamLeaveItem[];
}

export function TeamCalendarScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [leaves, setLeaves] = useState<TeamLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DayDetail | null>(null);

  const [permLimited, setPermLimited] = useState(false);

  const load = useCallback(async () => {
    if (!employee?.name) {
      setLoading(false);
      setError('Data karyawan belum dimuat');
      return;
    }
    setLoading(true);
    setError(null);
    setPermLimited(false);
    const fromDate = startOfMonth(year, month);
    const toDate = endOfMonth(year, month);

    let limitedFlag = false;
    let holidayRows: HolidayItem[] = [];
    const holidayList = await calendarApi
      .getEmployeeHolidayList(employee.name)
      .catch(() => null);
    if (holidayList) {
      holidayRows = await calendarApi
        .listHolidays(holidayList, fromDate, toDate)
        .catch(() => {
          limitedFlag = true;
          return [];
        });
    }
    const leaveRows = await calendarApi
      .listTeamLeaves(employee.department ?? null, fromDate, toDate)
      .catch(() => {
        limitedFlag = true;
        return [];
      });

    setHolidays(holidayRows);
    setLeaves(leaveRows);
    setPermLimited(limitedFlag);
    setLoading(false);
  }, [employee?.name, employee?.department, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const cellTheme: Record<string, CellTheme> = useMemo(() => {
    const map: Record<string, CellTheme> = {};
    for (const h of holidays) {
      map[h.holiday_date] = {
        bg: tokens.color.errorTint,
        text: tokens.color.error,
        pip: tokens.color.error,
      };
    }
    const leaveCountByDate: Record<string, number> = {};
    for (const l of leaves) {
      for (const iso of isoBetween(l.from_date, l.to_date, year, month)) {
        leaveCountByDate[iso] = (leaveCountByDate[iso] ?? 0) + 1;
      }
    }
    for (const [iso, count] of Object.entries(leaveCountByDate)) {
      if (map[iso]) {
        // Tanggal libur sekaligus ada cuti — tetap merah, tambah pip biru kalau ada
        map[iso].pip = tokens.color.blue500;
        continue;
      }
      const heavy = count >= 3;
      map[iso] = {
        bg: heavy ? tokens.color.yellow50 : tokens.color.blue50,
        text: heavy ? tokens.color.yellow700 : tokens.color.blue700,
        pip: heavy ? tokens.color.yellow500 : tokens.color.blue500,
      };
    }
    return map;
  }, [holidays, leaves, year, month]);

  const handlePrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const handleNext = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const openDay = (iso: string) => {
    const dayHoliday = holidays.find((h) => h.holiday_date === iso) ?? null;
    const dayLeaves = leaves.filter((l) => {
      const matches = isoBetween(l.from_date, l.to_date, year, month);
      return matches.includes(iso);
    });
    if (!dayHoliday && dayLeaves.length === 0) return;
    setSelected({ iso, holiday: dayHoliday, leaves: dayLeaves });
  };

  return (
    <Screen>
      <FormHeader
        title={employee?.department ? 'Kalender Tim' : 'Kalender'}
        subtitle={employee?.department ?? 'Semua karyawan'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={tokens.semantic.brand} />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <MonthCalendar
              year={year}
              month={month}
              cellThemeByDate={cellTheme}
              onPressDate={openDay}
              onPrevMonth={handlePrev}
              onNextMonth={handleNext}
            />

            <View style={styles.legend}>
              <LegendItem color={tokens.color.error} label="Hari libur" />
              <LegendItem color={tokens.color.blue500} label="Cuti tim 1-2" />
              <LegendItem color={tokens.color.yellow500} label="Cuti tim ≥3" />
            </View>

            {permLimited ? (
              <Text style={styles.permNote}>
                Catatan: data libur dan cuti tim memerlukan akses HR. Sebagian
                informasi mungkin tidak ditampilkan.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={!!selected}
        title={
          selected
            ? new Date(selected.iso + 'T00:00:00').toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : ''
        }
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <View style={styles.sheetBody}>
            {selected.holiday ? (
              <View style={[styles.holidayCard, { backgroundColor: tokens.color.errorTint }]}>
                <Text style={styles.holidayLabel}>HARI LIBUR</Text>
                <Text style={styles.holidayName}>{selected.holiday.description ?? selected.holiday.name}</Text>
              </View>
            ) : null}

            {selected.leaves.length > 0 ? (
              <>
                <Text style={styles.leavesLabel}>YANG CUTI ({selected.leaves.length})</Text>
                {selected.leaves.map((l) => (
                  <View key={l.name} style={styles.leaveRow}>
                    <Text style={styles.leaveName}>{l.employee_name ?? l.employee}</Text>
                    <Text style={styles.leaveType}>{l.leave_type}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  loadingWrap: { paddingVertical: tokens.spacing.sp5, alignItems: 'center' },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error, textAlign: 'center', padding: tokens.spacing.sp4 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sp3,
    paddingHorizontal: tokens.spacing.sp2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1_5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg2 },
  permNote: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontStyle: 'italic',
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface2,
    borderRadius: tokens.radius.md,
    lineHeight: tokens.lineHeight.small,
  },
  sheetBody: { gap: tokens.spacing.sp3, paddingBottom: tokens.spacing.sp2 },
  holidayCard: {
    padding: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.sp1,
  },
  holidayLabel: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.error,
    fontWeight: '700',
    letterSpacing: 1,
  },
  holidayName: { fontSize: tokens.fontSize.body, color: tokens.color.error, fontWeight: '700' },
  leavesLabel: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  leaveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.sp2,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  leaveName: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
  leaveType: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
