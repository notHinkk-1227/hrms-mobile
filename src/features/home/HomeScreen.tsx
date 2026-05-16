import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeScreenProps, NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ClockInHero, ClockInHeroState } from '@shared/components/ClockInHero';
import { QuickCreateFab, QuickCreateAction } from '@shared/components/QuickCreateFab';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { getLastCheckinToday, FrappeEmployeeCheckin } from '@infrastructure/api/checkinClient';
import { ApiError } from '@infrastructure/api/errors';
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

const QUICK_TO_ROUTE: Record<QuickCreateAction['key'], keyof MainStackParamList> = {
  leave: 'ApplyLeave',
  expense: 'ApplyExpense',
  advance: 'ApplyAdvance',
  'attendance-request': 'RequestAttendance',
  'shift-request': 'RequestShift',
};

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const parent = useNavigation<NavigationProp<MainStackParamList>>();
  const employee = useAuthStore((s) => s.employee);
  const tenantName = useAuthStore((s) => s.tenantName);

  const [lastCheckin, setLastCheckin] = useState<FrappeEmployeeCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!employee?.name) return;
    setError(null);
    try {
      const last = await getLastCheckinToday(employee.name);
      setLastCheckin(last);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat status absen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee?.name]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStatus();
  }, [loadStatus]);

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

  const goQuickCreate = (key: QuickCreateAction['key']) => {
    const route = QUICK_TO_ROUTE[key];
    (parent.navigate as (name: string) => void)(route);
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

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          <Text style={styles.sectionHint}>Tap + untuk lihat semua</Text>
        </View>

        <Text style={styles.note}>
          Tekan tombol biru bulat di bawah untuk ajukan cuti, klaim reimbursement, kasbon,
          koreksi absen, atau ganti shift.
        </Text>
      </ScrollView>

      <QuickCreateFab onSelect={goQuickCreate} />
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
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  sectionHint: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  note: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    lineHeight: 20,
  },
  errorBox: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.md,
  },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error },
});
