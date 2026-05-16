import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeScreenProps, NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Bell, ChevronRight, Wallet } from 'lucide-react-native';
import { ClockInHero, ClockInHeroState } from '@shared/components/ClockInHero';
import { Screen } from '@shared/components/Screen';
import { StatusBadge } from '@shared/components/StatusBadge';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { getLastCheckinToday, FrappeEmployeeCheckin } from '@infrastructure/api/checkinClient';
import { ApiError } from '@infrastructure/api/errors';
import { listMyRequests } from '@infrastructure/api/requestsClient';
import {
  getDoctypeLabel,
  getStatusLabel,
  getStatusVariant,
} from '@infrastructure/api/requestsClient';
import type { RequestSummary } from '@infrastructure/api/hrmsClient';
import { salarySlipApi, SalarySlipSummary } from '@infrastructure/api/hrmsClient';
import type { HomeStackParamList, MainStackParamList, MainTabsParamList } from '@app/navigation/types';
import type { LogType } from '@domain/entities/checkin';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'HomeMain'>,
  BottomTabScreenProps<MainTabsParamList>
>;

function formatTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRp(n: number | undefined): string {
  if (n == null) return '—';
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatPeriod(start?: string, end?: string): string {
  if (!start || !end) return '';
  const s = new Date(start);
  return s.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const parent = useNavigation<NavigationProp<MainStackParamList>>();
  const tabsNav = useNavigation<NavigationProp<MainTabsParamList>>();
  const employee = useAuthStore((s) => s.employee);
  const tenantName = useAuthStore((s) => s.tenantName);

  const [lastCheckin, setLastCheckin] = useState<FrappeEmployeeCheckin | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestSummary[]>([]);
  const [latestSalary, setLatestSalary] = useState<SalarySlipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!employee?.name) return;
    setError(null);
    try {
      const [last, requests, slips] = await Promise.all([
        getLastCheckinToday(employee.name).catch(() => null),
        listMyRequests(employee.name, 3).catch(() => []),
        salarySlipApi.list(employee.name, 1).catch(() => []),
      ]);
      setLastCheckin(last);
      setRecentRequests(requests.slice(0, 3));
      setLatestSalary(slips[0] ?? null);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee?.name]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const nextLogType: LogType = lastCheckin?.log_type === 'IN' ? 'OUT' : 'IN';

  let heroState: ClockInHeroState = 'idle';
  if (lastCheckin?.log_type === 'IN') heroState = 'in_progress';
  if (lastCheckin?.log_type === 'OUT') heroState = 'in_progress'; // done; tampil hijau juga

  const heroLast = lastCheckin
    ? {
        time: formatTime(lastCheckin.time),
        locationName: undefined as string | undefined,
      }
    : undefined;

  const goClockIn = () => {
    navigation.navigate('ClockInConfirm', { logType: nextLogType });
  };

  return (
    <Screen bottomInset={false}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.greeting}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(employee?.employee_name)}</Text>
          </View>
          <View style={styles.greetText}>
            <Text style={styles.greetEyebrow}>{tenantName ?? 'Sopwer HRMS'}</Text>
            <Text style={styles.greetTitle}>{getGreeting()},</Text>
            <Text style={styles.greetName}>{employee?.employee_name ?? 'Karyawan'}</Text>
          </View>
          <Pressable style={styles.bellBtn} hitSlop={12}>
            <Bell size={20} color={tokens.semantic.fg2} />
          </Pressable>
        </View>

        <ClockInHero
          state={loading ? 'idle' : heroState}
          lastClockIn={heroLast}
          onPressClockIn={goClockIn}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Recent requests section */}
        {recentRequests.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Permohonan Terakhir</Text>
              <Pressable onPress={() => tabsNav.navigate('MyRequests' as never)}>
                <Text style={styles.sectionLink}>Lihat semua</Text>
              </Pressable>
            </View>
            <View style={styles.recentList}>
              {recentRequests.map((req) => (
                <Pressable
                  key={`${req.doctype}::${req.name}`}
                  style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
                  onPress={() => parent.navigate('RequestDetail', { doctype: req.doctype, name: req.name })}
                >
                  <View style={styles.recentMeta}>
                    <Text style={styles.recentDoctype}>{getDoctypeLabel(req.doctype).toUpperCase()}</Text>
                    <Text style={styles.recentPrimary} numberOfLines={1}>{req.primary}</Text>
                  </View>
                  <StatusBadge
                    label={getStatusLabel(req.status)}
                    variant={getStatusVariant(req.status)}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Salary slip teaser */}
        {latestSalary ? (
          <Pressable
            style={({ pressed }) => [styles.salaryCard, pressed && styles.salaryCardPressed]}
            onPress={() => parent.navigate('SalarySlipDetail', { name: latestSalary.name })}
          >
            <View style={styles.salaryIconWrap}>
              <Wallet size={22} color={tokens.color.green600} />
            </View>
            <View style={styles.salaryMeta}>
              <Text style={styles.salaryEyebrow}>SLIP GAJI TERAKHIR</Text>
              <Text style={styles.salaryPeriod}>{formatPeriod(latestSalary.start_date, latestSalary.end_date)}</Text>
              {latestSalary.status === 'Submitted' ? (
                <Text style={styles.salaryAmount}>{formatRp(latestSalary.net_pay)}</Text>
              ) : (
                <Text style={styles.salaryDraft}>Masih draft</Text>
              )}
            </View>
            <ChevronRight size={18} color={tokens.semantic.fg3} />
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp7 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.color.blue700,
  },
  greetText: { flex: 1 },
  greetEyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  greetTitle: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3 },
  greetName: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h3,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    letterSpacing: -0.2,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.semantic.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: tokens.spacing.sp2 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  sectionLink: { fontSize: tokens.fontSize.small, color: tokens.semantic.brand, fontWeight: '600' },
  recentList: { gap: tokens.spacing.sp2 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sp2,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  recentRowPressed: { backgroundColor: tokens.semantic.surface2 },
  recentMeta: { flex: 1, gap: 2 },
  recentDoctype: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.brand,
    fontWeight: '700',
    letterSpacing: 1,
  },
  recentPrimary: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg1,
    fontWeight: '500',
  },
  salaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.color.green50,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.green100,
  },
  salaryCardPressed: { backgroundColor: tokens.color.green100 },
  salaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.green100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryMeta: { flex: 1 },
  salaryEyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.green700,
    fontWeight: '700',
    letterSpacing: 1,
  },
  salaryPeriod: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  salaryAmount: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.h4,
    fontWeight: '800',
    color: tokens.color.green700,
    marginTop: 2,
  },
  salaryDraft: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3, marginTop: 2 },
  errorBox: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.md,
  },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error },
});
