import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface CellTheme {
  /** Background color cell. */
  bg?: string;
  /** Warna text angka tanggal. */
  text?: string;
  /** Warna pip (dot kecil di bawah angka). null = no pip. */
  pip?: string | null;
}

export interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  /** Optional theme per ISO date (YYYY-MM-DD). */
  cellThemeByDate?: Record<string, CellTheme>;
  /** Optional callback ketika cell di-tap. */
  onPressDate?: (iso: string) => void;
  /** Nav month — optional, kalau callback ada akan tampil chevron. */
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

const ID_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const ID_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getMonthMatrix(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoFor(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function MonthCalendar({
  year,
  month,
  cellThemeByDate,
  onPressDate,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps): React.JSX.Element {
  const cells = getMonthMatrix(year, month);
  const today = new Date();
  const todayIso =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? isoFor(year, month, today.getDate())
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        {onPrevMonth ? (
          <Pressable onPress={onPrevMonth} hitSlop={12} style={styles.navBtn}>
            <ChevronLeft size={20} color={tokens.semantic.fg1} />
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
        <Text style={styles.monthLabel}>
          {ID_MONTHS[month - 1]} {year}
        </Text>
        {onNextMonth ? (
          <Pressable onPress={onNextMonth} hitSlop={12} style={styles.navBtn}>
            <ChevronRight size={20} color={tokens.semantic.fg1} />
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
      </View>

      <View style={styles.daysRow}>
        {ID_DAYS.map((d) => (
          <Text key={d} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (day == null) {
            return <View key={`empty-${idx}`} style={styles.cellSpacer} />;
          }
          const iso = isoFor(year, month, day);
          const theme = cellThemeByDate?.[iso];
          const isToday = iso === todayIso;
          const cellStyle = [
            styles.cell,
            theme?.bg ? { backgroundColor: theme.bg } : null,
            isToday ? styles.cellToday : null,
          ];
          const textStyle = [
            styles.cellText,
            theme?.text ? { color: theme.text } : null,
            isToday ? styles.cellTextToday : null,
          ];
          const content = (
            <View style={cellStyle}>
              <Text style={textStyle}>{day}</Text>
              {theme?.pip ? <View style={[styles.pip, { backgroundColor: theme.pip }]} /> : null}
            </View>
          );
          return onPressDate ? (
            <Pressable key={iso} onPress={() => onPressDate(iso)} style={styles.cellWrap}>
              {content}
            </Pressable>
          ) : (
            <View key={iso} style={styles.cellWrap}>
              {content}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.spacing.sp2 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.sp1,
  },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  monthLabel: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h3,
    fontWeight: '800',
    color: tokens.semantic.fg1,
  },
  daysRow: { flexDirection: 'row' },
  dayLabel: {
    flex: 1,
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.caption,
    fontWeight: '700',
    color: tokens.semantic.fg3,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  cellSpacer: { width: `${100 / 7}%`, padding: 2 },
  cell: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: 'transparent',
    gap: 2,
  },
  cellToday: { backgroundColor: tokens.semantic.brand },
  cellText: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg1,
    fontWeight: '600',
  },
  cellTextToday: { color: tokens.color.white, fontWeight: '700' },
  pip: { width: 4, height: 4, borderRadius: 2 },
});
