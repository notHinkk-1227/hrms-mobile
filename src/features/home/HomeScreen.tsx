import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
  Mail,
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
import { inboxApi } from '@infrastructure/api/inboxClient';
import { inboxRead } from '@infrastructure/storage/inboxRead';
import { useFeaturesStore } from '@infrastructure/api/featureDetect';
import { realtimeService } from '@infrastructure/realtime/realtimeService';
import { useToast } from '@shared/components/Toast';
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
  /** Salah satu: ('requestFilter' → buka MyRequests tab dengan filter doctype) atau ('stackRoute' → langsung navigate MainStack screen) atau ('taskTab' → buka Task tab) */
  action:
    | { kind: 'requestFilter'; doctype: string }
    | { kind: 'stackRoute'; route: keyof MainStackParamList }
    | { kind: 'taskTab' };
}

const QA_ROWS: QaTile[][] = [
  [
    { key: 'leave', label: 'Cuti', icon: Calendar, tone: 'blue', action: { kind: 'requestFilter', doctype: 'Leave Application' } },
    { key: 'expense', label: 'Klaim', icon: Wallet, tone: 'green', action: { kind: 'requestFilter', doctype: 'Expense Claim' } },
    { key: 'advance', label: 'Kasbon', icon: DollarSign, tone: 'amber', action: { kind: 'requestFilter', doctype: 'Employee Advance' } },
    { key: 'koreksi', label: 'Presensi', icon: Clock, tone: 'dark', action: { kind: 'stackRoute', route: 'MyAttendance' } },
  ],
  [
    { key: 'shift', label: 'Shift', icon: RefreshCw, tone: 'blue', action: { kind: 'requestFilter', doctype: 'Shift Request' } },
    { key: 'todo', label: 'ToDo', icon: CheckSquare, tone: 'amber', action: { kind: 'stackRoute', route: 'TodoList' } },
    { key: 'calendar', label: 'Kalender', icon: CalendarDays, tone: 'green', action: { kind: 'stackRoute', route: 'TeamCalendar' } },
    { key: 'employee', label: 'Karyawan', icon: Users, tone: 'dark', action: { kind: 'stackRoute', route: 'EmployeeDirectory' } },
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
  const [gpsOk, setGpsOk] = useState<boolean>(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);
  const features = useFeaturesStore((s) => s.features);
  const inboxEnabled = features.hasSopwerHrms && features.inbox;
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
      if (!granted) {
        setGpsOk(false);
        return;
      }
      const pos = await locationService.getCurrentPosition({ timeoutMs: 8000 });
      setGpsOk(true); // GPS aktif + dapat posisi — sudah cukup untuk indicator
      const locations = await getAllowedLocationsForToday(employee.name).catch<AllowedLocation[]>(
        () => [],
      );
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

  useFocusEffect(
    useCallback(() => {
      const userId = employee?.user_id;
      if (!userId) return;
      notificationsApi
        .countUnread(userId)
        .then(setUnreadCount)
        .catch(() => undefined);
    }, [employee?.user_id]),
  );

  // Refresh inbox unread saat focus — total published dikurangi readSet lokal.
  const refreshInboxUnread = useCallback(async () => {
    if (!inboxEnabled) return;
    try {
      const total = await inboxApi.countActive();
      const readSize = inboxRead.size();
      setInboxUnread(Math.max(0, total - readSize));
    } catch {
      // silent — badge optional
    }
  }, [inboxEnabled]);

  useFocusEffect(
    useCallback(() => {
      refreshInboxUnread();
    }, [refreshInboxUnread]),
  );

  // Realtime: dengar event `notification` dari Frappe socket.io. Saat ada
  // task/assign baru: refresh badge + tampil toast singkat.
  const toast = useToast();
  useEffect(() => {
    const userId = employee?.user_id;
    if (!userId) return;
    return realtimeService.subscribe((event) => {
      if (event.type === 'notification') {
        notificationsApi
          .countUnread(userId)
          .then(setUnreadCount)
          .catch(() => undefined);
        toast.show({
          variant: 'info',
          title: 'Notifikasi baru',
          message: 'Ada pemberitahuan masuk — buka untuk lihat detail',
        });
        return;
      }
      if (event.type === 'inbox_new') {
        refreshInboxUnread();
        toast.show({
          variant: 'info',
          title: 'Pengumuman baru',
          message: event.data?.subject || 'Buka inbox untuk lihat detail',
        });
      }
    });
  }, [employee?.user_id, refreshInboxUnread, toast]);

  // Polling fallback: kalau socket.io tidak tersambung (Frappe socketio butuh
  // session cookie, mobile pakai API key — bisa gagal handshake), tetap
  // refresh unread count setiap 60 detik supaya badge ngk stale.
  useEffect(() => {
    const userId = employee?.user_id;
    if (!userId) return;
    const id = setInterval(() => {
      notificationsApi
        .countUnread(userId)
        .then(setUnreadCount)
        .catch(() => undefined);
      refreshInboxUnread();
    }, 60_000);
    return () => clearInterval(id);
  }, [employee?.user_id, refreshInboxUnread]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
    loadNearestLocation();
  }, [loadAll, loadNearestLocation]);

  const nextLogType: LogType = lastCheckin?.log_type === 'IN' ? 'OUT' : 'IN';

  let heroState: ClockInHeroState = 'idle';
  if (lastCheckin?.log_type === 'IN') heroState = 'in_progress';
  if (lastCheckin?.log_type === 'OUT') heroState = 'done';

  const checkInTime = lastCheckin
    ? (() => {
        const d = new Date(lastCheckin.time.replace(' ', 'T'));
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : undefined;

  const locationLine = nearest
    ? heroState === 'in_progress' || heroState === 'done'
      ? `Terverifikasi · ${nearest.name}`
      : `${nearest.name} · ${Math.round(nearest.distanceM)}m dari titik`
    : undefined;

  const goClockIn = () => {
    navigation.navigate('ClockInCamera', { logType: nextLogType });
  };

  const goQa = (action: QaTile['action']) => {
    if (action.kind === 'requestFilter') {
      tabsNav.navigate('MyRequests', { filterDoctype: action.doctype, mode: 'mine' });
    } else if (action.kind === 'taskTab') {
      tabsNav.navigate('Task');
    } else {
      parent.navigate(action.route as never);
    }
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
            <Text style={styles.greetEyebrow} numberOfLines={1} ellipsizeMode="tail">
              {tenantName ?? 'Hadir by Sopwer'}
            </Text>
            <Text style={styles.greetTitle}>{getGreeting()},</Text>
            <Text style={styles.greetName} numberOfLines={1} ellipsizeMode="tail">
              {employee?.employee_name ?? 'Karyawan'}
            </Text>
          </View>
          {inboxEnabled ? (
            <Pressable
              style={styles.bellBtn}
              hitSlop={12}
              onPress={() => navigation.navigate('Inbox')}
              accessibilityLabel="Inbox pengumuman"
            >
              <Mail size={20} color={tokens.semantic.fg2} />
              {inboxUnread > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {inboxUnread > 9 ? '9+' : String(inboxUnread)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
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
          checkInTime={checkInTime}
          gpsActive={gpsOk ? true : undefined}
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
                    onPress={() => goQa(qa.action)}
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
              <Pressable onPress={() => tabsNav.navigate('Task')}>
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
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp2 },
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
  greetText: { flex: 1, minWidth: 0 },
  greetEyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1,
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
