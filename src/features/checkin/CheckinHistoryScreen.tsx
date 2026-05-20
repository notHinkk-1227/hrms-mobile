import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, Clock, LogIn, LogOut, MapPin } from 'lucide-react-native';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { StatusBadge } from '@shared/components/StatusBadge';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { listCheckinHistory, FrappeEmployeeCheckin } from '@infrastructure/api/checkinClient';
import { ApiError } from '@infrastructure/api/errors';
import type { HomeStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CheckinHistory'>;

function formatDateLong(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

interface DaySection {
  date: string;
  items: FrappeEmployeeCheckin[];
}

function groupByDay(rows: FrappeEmployeeCheckin[]): DaySection[] {
  const map = new Map<string, FrappeEmployeeCheckin[]>();
  for (const row of rows) {
    const key = dayKey(row.time);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => (b.date < a.date ? -1 : 1));
}

export function CheckinHistoryScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const [rows, setRows] = useState<FrappeEmployeeCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employee?.name) return;
    setError(null);
    try {
      const data = await listCheckinHistory(employee.name, 100);
      setRows(data);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat riwayat presensi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee?.name]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = groupByDay(rows);
  const flat = sections.flatMap((s) => [
    { type: 'header' as const, key: `h-${s.date}`, date: s.date },
    ...s.items.map((it) => ({ type: 'row' as const, key: `r-${it.name}`, item: it })),
  ]);

  return (
    <Screen bottomInset={false}>
      <FormHeader title="Riwayat Presensi" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList count={5} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(it) => it.key}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Clock size={32} color={tokens.color.ink300} />}
              title="Belum ada presensi"
              subtitle="Tap tombol Presensi Masuk di Beranda untuk mulai."
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text style={styles.dayHeader}>{formatDateLong(item.date + ' 00:00:00')}</Text>
              );
            }
            const r = item.item;
            const isIn = r.log_type === 'IN';
            const Icon = isIn ? LogIn : LogOut;
            const tint = isIn ? tokens.color.green700 : tokens.color.blue700;
            const wrapBg = isIn ? tokens.color.green50 : tokens.color.blue50;
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => navigation.navigate('CheckinDetail', { name: r.name })}
              >
                <View style={[styles.iconWrap, { backgroundColor: wrapBg }]}>
                  <Icon size={18} color={tint} />
                </View>
                <View style={styles.rowText}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTime}>{formatTime(r.time)}</Text>
                    <StatusBadge
                      label={isIn ? 'Masuk' : 'Pulang'}
                      variant={isIn ? 'success' : 'neutral'}
                    />
                  </View>
                  {r.latitude != null && r.longitude != null ? (
                    <View style={styles.rowMeta}>
                      <MapPin size={11} color={tokens.semantic.fg3} />
                      <Text style={styles.rowMetaText} numberOfLines={1}>
                        {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.rowId}>{r.name}</Text>
                </View>
                <ChevronRight size={18} color={tokens.semantic.fg3} />
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: tokens.spacing.sp5, gap: tokens.spacing.sp2 },
  skeletonWrap: { paddingVertical: tokens.spacing.sp2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.sp4 },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error, textAlign: 'center' },
  dayHeader: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
    textTransform: 'uppercase',
    marginTop: tokens.spacing.sp3,
    marginBottom: tokens.spacing.sp1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: tokens.spacing.sp1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTime: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1 },
  rowMetaText: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3, fontFamily: tokens.font.mono },
  rowId: { fontSize: tokens.fontSize.caption, color: tokens.color.ink300, fontFamily: tokens.font.mono },
});
