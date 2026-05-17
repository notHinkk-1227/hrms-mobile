import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { StatusBadge } from '@shared/components/StatusBadge';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import {
  getDoctypeLabel,
  getStatusLabel,
  getStatusVariant,
  listMyRequests,
  listTeamRequests,
} from '@infrastructure/api/requestsClient';
import type { RequestSummary } from '@infrastructure/api/hrmsClient';
import type { MainStackParamList, MainTabsParamList } from '@app/navigation/types';

const TABS = [
  { key: 'all', label: 'Semua', doctype: null },
  { key: 'leave', label: 'Cuti', doctype: 'Leave Application' },
  { key: 'expense', label: 'Klaim', doctype: 'Expense Claim' },
  { key: 'advance', label: 'Kasbon', doctype: 'Employee Advance' },
  { key: 'attendance', label: 'Koreksi', doctype: 'Attendance Request' },
  { key: 'shift', label: 'Shift', doctype: 'Shift Request' },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MyRequestsScreen(): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const parent = useNavigation<NavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainTabsParamList, 'MyRequests'>>();
  const year = new Date().getFullYear();

  const [items, setItems] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [mode, setMode] = useState<'mine' | 'team'>('mine');
  const [error, setError] = useState<string | null>(null);

  // Apply route params (from QA tile navigate)
  useEffect(() => {
    const incomingFilter = route.params?.filterDoctype;
    if (incomingFilter) {
      const tab = TABS.find((t) => t.doctype === incomingFilter);
      if (tab) setActiveTab(tab.key);
    }
    if (route.params?.mode) setMode(route.params.mode);
  }, [route.params?.filterDoctype, route.params?.mode]);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (mode === 'team') {
        if (!user) return;
        const data = await listTeamRequests(user);
        setItems(data);
      } else {
        if (!employee?.name) return;
        const data = await listMyRequests(employee.name);
        setItems(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat permohonan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee?.name, user, mode]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const filtered =
    activeTab === 'all'
      ? items
      : items.filter((i) => {
          const tab = TABS.find((t) => t.key === activeTab);
          return tab?.doctype === i.doctype;
        });

  return (
    <Screen bottomInset={false}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.title}>
              {mode === 'team' ? 'Permohonan Tim' : 'Permohonan Saya'}
            </Text>
            <Text style={styles.subtitle}>{`${items.length} PERMOHONAN · ${year}`}</Text>
          </View>
        </View>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('mine')}
            style={[styles.modeBtn, mode === 'mine' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, mode === 'mine' && styles.modeTextActive]}>Saya</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('team')}
            style={[styles.modeBtn, mode === 'team' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, mode === 'team' && styles.modeTextActive]}>Tim</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count =
              tab.doctype === null
                ? items.length
                : items.filter((i) => i.doctype === tab.doctype).length;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList count={4} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.doctype}::${item.name}`}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={ListSep}
          ListEmptyComponent={EmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() =>
                parent.navigate(
                  mode === 'team' ? 'TeamRequestDetail' : 'RequestDetail',
                  { doctype: item.doctype, name: item.name },
                )
              }
            >
              <View style={styles.rowMeta}>
                <Text style={styles.rowDoctype}>{getDoctypeLabel(item.doctype).toUpperCase()}</Text>
                <Text style={styles.rowDate}>{formatDate(item.creation)}</Text>
              </View>
              <Text style={styles.rowPrimary} numberOfLines={1}>
                {item.primary}
              </Text>
              {item.secondary ? (
                <Text style={styles.rowSecondary} numberOfLines={1}>
                  {item.secondary}
                </Text>
              ) : null}
              <View style={styles.rowFooter}>
                <StatusBadge
                  label={getStatusLabel(item.status)}
                  variant={getStatusVariant(item.status)}
                />
                <Text style={styles.rowId}>{item.name}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const ListSep = () => <View style={styles.sep} />;
const EmptyList = () => (
  <EmptyState
    icon={<Inbox size={32} color={tokens.color.ink300} />}
    title="Belum ada permohonan"
    subtitle="Buat permohonan baru dengan tombol + di nav."
  />
);

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.sp3, paddingBottom: tokens.spacing.sp3 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleCol: { flex: 1 },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  subtitle: {
    marginTop: 2,
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.font.mono,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: tokens.semantic.surface2,
    borderRadius: tokens.radius.md,
    padding: 3,
    alignSelf: 'flex-start',
  },
  modeBtn: {
    paddingHorizontal: tokens.spacing.sp4,
    paddingVertical: tokens.spacing.sp2,
    borderRadius: tokens.radius.sm,
  },
  modeBtnActive: {
    backgroundColor: tokens.semantic.surface,
    ...tokens.shadow.sm,
  },
  modeText: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3, fontWeight: '600' },
  modeTextActive: { color: tokens.semantic.fg1, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: tokens.spacing.sp2, paddingRight: tokens.spacing.sp4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1_5,
    paddingHorizontal: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp2,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.semantic.surface2,
  },
  tabActive: { backgroundColor: tokens.semantic.brand },
  tabText: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg2, fontWeight: '600' },
  tabTextActive: { color: tokens.color.white },
  tabCount: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    backgroundColor: tokens.semantic.surface,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.full,
    minWidth: 18,
    textAlign: 'center',
  },
  tabCountActive: { color: tokens.semantic.brand, backgroundColor: tokens.color.white },
  list: { paddingBottom: tokens.spacing.sp5, gap: tokens.spacing.sp2 },
  row: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp1,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowDoctype: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.brand,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rowDate: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  rowPrimary: { fontSize: tokens.fontSize.body, fontWeight: '600', color: tokens.semantic.fg1 },
  rowSecondary: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowId: { fontSize: tokens.fontSize.caption, color: tokens.color.ink300, fontFamily: tokens.font.mono },
  sep: { height: tokens.spacing.sp2 },
  skeletonWrap: { paddingVertical: tokens.spacing.sp2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.sp4 },
  errorText: { color: tokens.color.error },
});
