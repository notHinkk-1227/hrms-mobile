import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeScreenProps, NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  Bell,
  Calendar,
  CalendarDays,
  CheckSquare,
  Clock,
  DollarSign,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react-native';
import { ClockInHero, ClockInHeroState } from '@shared/components/ClockInHero';
import { Screen } from '@shared/components/Screen';
import { StatusBadge } from '@shared/components/StatusBadge';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { getLastCheckinToday, FrappeEmployeeCheckin } from '@infrastructure/api/checkinClient';
import { ApiError } from '@infrastructure/api/errors';
import { getAllowedLocationsForToday } from '@infrastructure/api/employeeClient';
import { locationService } from '@infrastructure/location/locationService';
import { listMyRequests } from '@infrastructure/api/requestsClient';
import {
  getDoctypeLabel,
  getStatusLabel,
  getStatusVariant,
} from '@infrastructure/api/requestsClient';
import type { RequestSummary } from '@infrastructure/api/hrmsClient';
import { todoApi, TodoItem } from '@infrastructure/api/hrmsClient';
import { notificationsApi } from '@infrastructure/api/notificationsClient';
import { TodoSheet } from '@features/todo/TodoSheet';
import type { HomeStackParamList, MainStackParamList, MainTabsParamList } from '@app/navigation/types';
import type { AllowedLocation, LogType } from '@domain/entities/checkin';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'HomeMain'>,
  BottomTabScreenProps<MainTabsParamList>
>;

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

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface NearestLocation {
  name: string;
  distanceM: number;
}

type QaTone = 'blue' | 'green' | 'amber' | 'dark';
interface QaTile {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  tone: QaTone;
  target: keyof MainStackParamList;
}

const QA_ROWS: QaTile[][] = [
  [
    { key: 'leave', label: 'Cuti', icon: Calendar, tone: 'blue', target: 'ApplyLeave' },
    { key: 'expense', label: 'Klaim', icon: Wallet, tone: 'green', target: 'ApplyExpense' },
    { key: 'advance', label: 'Kasbon', icon: DollarSign, tone: 'amber', target: 'ApplyAdvance' },
    { key: 'koreksi', label: 'Presensi', icon: Clock, tone: 'dark', target: 'MyAttendance' },
  ],
  [
    { key: 'shift', label: 'Shift', icon: RefreshCw, tone: 'blue', target: 'RequestShift' },
    { key: 'todo', label: 'ToDo', icon: CheckSquare, tone: 'amber', target: 'TodoList' },
    { key: 'calendar', label: 'Kalender', icon: CalendarDays, tone: 'green', target: 'TeamCalendar' },
    { key: 'employee', label: 'Karyawan', icon: Users, tone: 'dark', target: 'EmployeeDirectory' },
  ],
];

function stripHtmlShort(s: string): string {
  return s
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function priorityColor(p: string): string {
  switch (p) {
    case 'High':
      return tokens.color.error;
    case 'Medium':
      return tokens.color.yellow500;
    default:
      return tokens.color.ink300;
  }
}

function dueLabelShort(date: string | null): string {
  if (!date) return 'Tanpa tenggat';
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff === -1) return 'Kemarin';
  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  if (diff < 7) return `${diff} hari lagi`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const parent = useNavigation<NavigationProp<MainStackParamList>>();
  const tabsNav = useNavigation<NavigationProp<MainTabsParamList>>();
  const employee = useAuthStore((s) => s.employee);
  const tenantName = useAuthStore((s) => s.tenantName);

  const [lastCheckin, setLastCheckin] = useState<FrappeEmployeeCheckin | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestSummary[]>([]);
  const [nearest, setNearest] = useState<NearestLocation | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!employee?.name) return;
    setError(null);
    const userId = employee.user_id;
    try {
      const [last, requests, todoList, unread] = await Promise.all([
        getLastCheckinToday(employee.name).catch(() => null),
        listMyRequests(employee.name, 3).catch(() => []),
        userId ? todoApi.listMyOpen(userId, 5).catch(() => [] as TodoItem[]) : Promise.resolve([] as TodoItem[]),
        userId ? notificationsApi.countUnread(userId).catch(() => 0) : Promise.resolve(0),
      ]);
      setLastCheckin(last);
      setRecentRequests(requests.slice(0, 3));
      setTodos(todoList.slice(0, 5));
      setUnreadCount(unread);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee?.name, employee?.user_id]);

  const loadNearestLocation = useCallback(async () => {
    if (!employee?.name) return;
    try {
      const granted = await locationService.hasPermission();
      if (!granted) return;
      const [pos, locations] = await Promise.all([
        locationService.getCurrentPosition({ timeoutMs: 8000 }),
        getAllowedLocationsForToday(employee.name).catch<AllowedLocation[]>(() => []),
      ]);
      if (locations.length === 0) return;
      let best: NearestLocation | null = null;
      for (const loc of locations) {
        const d = haversineMeters(pos, loc);
        if (!best || d < best.distanceM) {
          best = { name: loc.locationName ?? loc.name, distanceM: d };
        }
      }
      setNearest(best);
    } catch {
      // silent — location optional di Home
    }
  }, [employee?.name]);

  useEffect(() => {
    loadAll();
    loadNearestLocation();
  }, [loadAll, loadNearestLocation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
    loadNearestLocation();
  }, [loadAll, loadNearestLocation]);

  const nextLogType: LogType = lastCheckin?.log_type === 'IN' ? 'OUT' : 'IN';

  let heroState: ClockInHeroState = 'idle';
  if (lastCheckin?.log_type === 'IN') heroState = 'in_progress';
  if (lastCheckin?.log_type === 'OUT') heroState = 'done';

  const locationLine = nearest
    ? heroState === 'in_progress' || heroState === 'done'
      ? `Terverifikasi · ${nearest.name}`
      : `${nearest.name} · ${Math.round(nearest.distanceM)}m dari titik`
    : undefined;

  const goClockIn = () => {
    navigation.navigate('ClockInCamera', { logType: nextLogType });
  };

  const goQa = (target: keyof MainStackParamList) => {
    parent.navigate(target as never);
  };

  const handleTodoDone = async (todo: TodoItem) => {
    await todoApi.markDone(todo.name);
    setTodos((curr) => curr.filter((t) => t.name !== todo.name));
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
            <Text style={styles.greetEyebrow}>{tenantName ?? 'Hadir by Sopwer'}</Text>
            <Text style={styles.greetTitle}>{getGreeting()},</Text>
            <Text style={styles.greetName}>{employee?.employee_name ?? 'Karyawan'}</Text>
          </View>
          <Pressable
            style={styles.bellBtn}
            hitSlop={12}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={20} color={tokens.semantic.fg2} />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ClockInHero
          state={loading ? 'idle' : heroState}
          locationLine={locationLine}
          onPressClockIn={goClockIn}
          onPressHistory={() => navigation.navigate('CheckinHistory')}
        />

        {/* Quick Actions — 8 tile, 2 baris × 4 kolom */}
        <View style={styles.qaGrid}>
          {QA_ROWS.map((row, rowIdx) => (
            <View key={`qa-row-${rowIdx}`} style={styles.qaRow}>
              {row.map((qa) => {
                const Icon = qa.icon;
                const wrap =
                  qa.tone === 'green'
                    ? styles.qaIccGreen
                    : qa.tone === 'amber'
                      ? styles.qaIccAmber
                      : qa.tone === 'dark'
                        ? styles.qaIccDark
                        : styles.qaIccBlue;
                const iconColor =
                  qa.tone === 'green'
                    ? tokens.color.green700
                    : qa.tone === 'amber'
                      ? tokens.color.yellow700
                      : qa.tone === 'dark'
                        ? tokens.semantic.fg2
                        : tokens.color.blue700;
                return (
                  <Pressable
                    key={qa.key}
                    style={({ pressed }) => [styles.qaTile, pressed && styles.qaTilePressed]}
                    onPress={() => goQa(qa.target)}
                  >
                    <View style={[styles.qaIcc, wrap]}>
                      <Icon size={18} color={iconColor} />
                    </View>
                    <Text style={styles.qaLabel}>{qa.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Tugas Anda — top 5 open ToDo */}
        {todos.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Tugas Anda</Text>
              <Pressable onPress={() => parent.navigate('TodoList')}>
                <Text style={styles.sectionLink}>Lihat semua</Text>
              </Pressable>
            </View>
            <View style={styles.recentList}>
              {todos.map((t) => (
                <Pressable
                  key={t.name}
                  style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
                  onPress={() => setSelectedTodo(t)}
                >
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor(t.priority) }]} />
                  <View style={styles.recentMeta}>
                    <Text style={styles.recentPrimary} numberOfLines={1}>
                      {stripHtmlShort(t.description) || '(tanpa deskripsi)'}
                    </Text>
                    <Text style={styles.todoDue}>{dueLabelShort(t.date)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
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

        {/* Empty state kalau semua kosong */}
        {!loading && todos.length === 0 && recentRequests.length === 0 && !error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Semua up-to-date</Text>
            <Text style={styles.emptyBody}>
              Tidak ada tugas atau permohonan tertunda. Selamat bekerja!
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <TodoSheet
        todo={selectedTodo}
        onClose={() => setSelectedTodo(null)}
        onDone={handleTodoDone}
      />
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
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: tokens.color.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tokens.semantic.bg,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: tokens.color.white,
    fontFamily: tokens.font.mono,
  },
  priorityDot: { width: 12, height: 12, borderRadius: 6, marginRight: tokens.spacing.sp1_5 },
  todoDue: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3, marginTop: 2 },
  qaGrid: {
    gap: tokens.spacing.sp2,
  },
  qaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sp2,
  },
  qaTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: tokens.spacing.sp3,
    gap: tokens.spacing.sp2,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  qaTilePressed: { backgroundColor: tokens.semantic.surface2 },
  qaIcc: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaIccBlue: { backgroundColor: tokens.color.blue50 },
  qaIccGreen: { backgroundColor: tokens.color.green50 },
  qaIccAmber: { backgroundColor: tokens.color.yellow50 },
  qaIccDark: { backgroundColor: tokens.color.ink50 },
  qaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.semantic.fg1,
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
  errorBox: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.md,
  },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error },
  emptyCard: {
    padding: tokens.spacing.sp5,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    alignItems: 'center',
    gap: tokens.spacing.sp2,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h3,
    fontWeight: '800',
    color: tokens.semantic.fg1,
  },
  emptyBody: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    textAlign: 'center',
    lineHeight: tokens.lineHeight.small,
  },
});
