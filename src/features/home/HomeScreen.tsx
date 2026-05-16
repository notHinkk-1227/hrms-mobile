import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeScreenProps, NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Calendar, Clock, FileText, RefreshCw, Replace, Wallet } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
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

function formatDate(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}

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

  const nextLogType: LogType =
    lastCheckin?.log_type === 'IN' ? 'OUT' : 'IN';

  const goClockIn = () => {
    navigation.navigate('ClockInConfirm', { logType: nextLogType });
  };

  const isClockedIn = lastCheckin?.log_type === 'IN';
  const isClockedOut = lastCheckin?.log_type === 'OUT';

  return (
    <Screen bottomInset={false}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>{tenantName ?? 'Sopwer HRMS'}</Text>
          <Text style={styles.hello}>Halo, {employee?.employee_name ?? 'Karyawan'}</Text>
          <Text style={styles.subtitle}>
            {employee?.designation ?? '—'} · {formatDate(new Date().toISOString())}
          </Text>
        </View>

        <View
          style={[
            styles.heroCard,
            isClockedIn && styles.heroActive,
            isClockedOut && styles.heroDone,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={tokens.color.white} />
          ) : (
            <>
              <Text style={styles.heroLabel}>
                {isClockedIn
                  ? 'SUDAH ABSEN MASUK'
                  : isClockedOut
                  ? 'SUDAH ABSEN PULANG'
                  : 'BELUM ABSEN HARI INI'}
              </Text>
              {lastCheckin ? (
                <View style={styles.heroLogRow}>
                  <Clock size={16} color={tokens.color.white} />
                  <Text style={styles.heroLogText}>
                    Absen {lastCheckin.log_type === 'IN' ? 'Masuk' : 'Pulang'} pukul{' '}
                    {formatTime(lastCheckin.time)}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.heroTitle}>
                {isClockedOut ? 'Hari kerja selesai' : isClockedIn ? 'Selamat bekerja' : 'Mulai hari Anda'}
              </Text>
              {!isClockedOut ? (
                <Button
                  variant="primary"
                  fullWidth
                  onPress={goClockIn}
                  style={styles.heroBtn}
                >
                  {nextLogType === 'IN' ? '⏱  Absen Masuk' : '🏁  Absen Pulang'}
                </Button>
              ) : null}
            </>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.quickGrid}>
          <Pressable style={styles.quickCard} onPress={() => parent.navigate('ApplyLeave')}>
            <Calendar size={22} color={tokens.semantic.brand} />
            <Text style={styles.quickLabel}>Ajukan Cuti</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => parent.navigate('ApplyExpense')}>
            <FileText size={22} color={tokens.color.green600} />
            <Text style={styles.quickLabel}>Klaim Reimbursement</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => parent.navigate('ApplyAdvance')}>
            <Wallet size={22} color={tokens.color.yellow500} />
            <Text style={styles.quickLabel}>Kasbon</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => parent.navigate('RequestAttendance')}>
            <RefreshCw size={22} color={tokens.semantic.brand} />
            <Text style={styles.quickLabel}>Koreksi Absen</Text>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => parent.navigate('RequestShift')}>
            <Replace size={22} color={tokens.color.ink600} />
            <Text style={styles.quickLabel}>Ganti Shift</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          Mode standard: clock-in + form pakai endpoint Frappe HR bawaan. Selfie + verification
          scoring nyusul saat sopwer_hrms backend ready.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  greeting: { gap: 4 },
  eyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  hello: { fontSize: tokens.fontSize.h2, fontWeight: '800', color: tokens.semantic.fg1 },
  subtitle: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3 },
  heroCard: {
    padding: tokens.spacing.sp4,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.semantic.brand,
    gap: tokens.spacing.sp2,
    minHeight: 180,
    ...tokens.shadow.md,
  },
  heroActive: { backgroundColor: tokens.color.green600 },
  heroDone: { backgroundColor: tokens.color.ink600 },
  heroLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.blue100,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroLogRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1 },
  heroLogText: { color: tokens.color.white, fontSize: tokens.fontSize.small },
  heroTitle: { fontSize: tokens.fontSize.h1, color: tokens.color.white, fontWeight: '800' },
  heroBtn: { marginTop: tokens.spacing.sp2, backgroundColor: tokens.color.white },
  errorBox: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.md,
  },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  sectionTitle: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    marginTop: tokens.spacing.sp2,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sp2,
  },
  quickCard: {
    flexBasis: '48%',
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: 6,
    minHeight: 80,
  },
  quickLabel: { fontSize: tokens.fontSize.small, fontWeight: '600', color: tokens.semantic.fg1 },
  note: {
    marginTop: tokens.spacing.sp4,
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    lineHeight: 20,
  },
});
