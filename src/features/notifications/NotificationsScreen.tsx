import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { useToast } from '@shared/components/Toast';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import {
  notificationsApi,
  NotificationLog,
} from '@infrastructure/api/notificationsClient';
import { ApiError } from '@infrastructure/api/errors';
import type { HomeStackParamList, MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

const REQUEST_DOCTYPES = new Set([
  'Leave Application',
  'Expense Claim',
  'Employee Advance',
  'Attendance Request',
  'Shift Request',
]);

const SALARY_SLIP = 'Salary Slip';
const EMPLOYEE_CHECKIN = 'Employee Checkin';
const TODO = 'ToDo';
const EMPLOYEE = 'Employee';

function stripHtml(s: string): string {
  return s.replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function dayBucket(iso: string): 'today' | 'yesterday' | 'older' {
  const d = new Date(iso.replace(' ', 'T'));
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'today';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate();
  if (isYesterday) return 'yesterday';
  return 'older';
}

function formatTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso: string): string {
  return new Date(iso.replace(' ', 'T')).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function NotificationsScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const parent = useNavigation<NavigationProp<MainStackParamList>>();
  const toast = useToast();
  const userId = employee?.user_id ?? null;
  const [rows, setRows] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const data = await notificationsApi.list(userId, 50);
      setRows(data);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat notifikasi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch tiap kali screen di-focus — notif baru langsung muncul.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleTap = async (row: NotificationLog) => {
    if (!row.read) {
      setRows((curr) =>
        curr.map((r) => (r.name === row.name ? { ...r, read: 1 } : r)),
      );
      notificationsApi.markRead(row.name).catch((e: Error) => {
        console.error('[Notifications] markRead failed', { name: row.name, error: e });
        // Revert optimistic update kalau gagal supaya UI sync dengan server.
        setRows((curr) =>
          curr.map((r) => (r.name === row.name ? { ...r, read: 0 } : r)),
        );
        toast.show({
          variant: 'warning',
          title: 'Notifikasi belum bisa ditandai dibaca',
          message: e.message || 'Coba lagi nanti',
        });
      });
    }
    const dt = row.document_type;
    const dn = row.document_name;
    if (!dt) return;
    if (REQUEST_DOCTYPES.has(dt) && dn) {
      parent.navigate('RequestDetail', { doctype: dt, name: dn });
      return;
    }
    if (dt === SALARY_SLIP && dn) {
      parent.navigate('SalarySlipDetail', { name: dn });
      return;
    }
    if (dt === EMPLOYEE_CHECKIN) {
      navigation.navigate('CheckinHistory');
      return;
    }
    if (dt === TODO) {
      // Navigate ke Task tab (TodoList sebagai tab, bukan stack screen)
      parent.navigate('Tabs', { screen: 'Task' });
      return;
    }
    if (dt === EMPLOYEE && dn) {
      parent.navigate('EmployeeDetail', { name: dn });
      return;
    }
    // Doctype lain — no-op, sudah di-mark read
  };

  const grouped: Array<
    | { type: 'header'; key: string; label: string }
    | { type: 'row'; key: string; item: NotificationLog }
  > = [];
  const buckets: Record<string, NotificationLog[]> = { today: [], yesterday: [], older: [] };
  for (const r of rows) {
    buckets[dayBucket(r.creation)].push(r);
  }
  const labels: Record<string, string> = {
    today: 'HARI INI',
    yesterday: 'KEMARIN',
    older: 'SEBELUMNYA',
  };
  for (const key of ['today', 'yesterday', 'older'] as const) {
    if (buckets[key].length === 0) continue;
    grouped.push({ type: 'header', key: `h-${key}`, label: labels[key] });
    for (const r of buckets[key]) {
      grouped.push({ type: 'row', key: `r-${r.name}`, item: r });
    }
  }

  const handleMarkAll = useCallback(async () => {
    if (!userId) return;
    try {
      await notificationsApi.markAllRead(userId);
      setRows((curr) => curr.map((r) => ({ ...r, read: 1 })));
      toast.show({
        variant: 'success',
        title: 'Selesai',
        message: 'Semua notifikasi ditandai dibaca',
      });
    } catch (e) {
      console.error('[Notifications] markAllRead failed', { userId, error: e });
      toast.show({
        variant: 'error',
        title: 'Gagal',
        message: e instanceof Error ? e.message : 'Tidak bisa mark all read',
      });
    }
  }, [toast, userId]);

  // Selalu tampil button — server unread count bisa beda dengan local list
  // (loaded items max 50, tapi server bisa punya >50 unread).
  return (
    <Screen bottomInset={false}>
      <FormHeader title="Notifikasi" onBack={() => navigation.goBack()} />

      {rows.length > 0 ? (
        <Pressable onPress={handleMarkAll} style={styles.markAllBtn} hitSlop={8}>
          <Text style={styles.markAllText}>Tandai semua dibaca</Text>
        </Pressable>
      ) : null}

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
          data={grouped}
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
              icon={<Bell size={32} color={tokens.color.ink300} />}
              title="Belum ada notifikasi"
              subtitle="Pemberitahuan dari atasan dan sistem akan tampil di sini."
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              const isToday = item.label === 'HARI INI';
              return (
                <Text
                  style={[styles.bucket, isToday && styles.bucketActive]}
                >
                  {item.label}
                </Text>
              );
            }
            const r = item.item;
            const unread = !r.read;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  unread ? styles.rowUnread : null,
                  pressed ? styles.rowPressed : null,
                ]}
                onPress={() => handleTap(r)}
              >
                <View style={[styles.dot, unread ? styles.dotUnread : styles.dotRead]} />
                <View style={styles.rowText}>
                  <Text style={styles.rowSubject} numberOfLines={2}>
                    {stripHtml(r.subject)}
                  </Text>
                  {r.email_content ? (
                    <Text style={styles.rowBody} numberOfLines={2}>
                      {stripHtml(r.email_content)}
                    </Text>
                  ) : null}
                  <Text style={styles.rowMeta}>
                    {formatDate(r.creation)} · {formatTime(r.creation)}
                    {r.from_user ? ` · ${r.from_user}` : ''}
                  </Text>
                </View>
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
  markAllBtn: {
    alignSelf: 'flex-end',
    paddingVertical: tokens.spacing.sp2,
    paddingHorizontal: tokens.spacing.sp3,
    marginBottom: tokens.spacing.sp2,
  },
  markAllText: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.brand,
    fontWeight: '700',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.sp4 },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error, textAlign: 'center' },
  bucket: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
    marginTop: tokens.spacing.sp3,
    marginBottom: tokens.spacing.sp1,
  },
  bucketActive: { color: tokens.semantic.brand },
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.sp2,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  rowUnread: { backgroundColor: tokens.color.blue50, borderColor: tokens.color.blue100 },
  rowPressed: { opacity: 0.85 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  dotUnread: { backgroundColor: tokens.semantic.brand },
  dotRead: { backgroundColor: tokens.color.ink200 },
  rowText: { flex: 1, gap: 2 },
  rowSubject: { fontSize: tokens.fontSize.body, fontWeight: '600', color: tokens.semantic.fg1 },
  rowBody: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg2 },
  rowMeta: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3, fontFamily: tokens.font.mono },
});
