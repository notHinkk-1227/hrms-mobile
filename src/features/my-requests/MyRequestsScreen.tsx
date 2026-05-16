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
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Inbox, Plus } from 'lucide-react-native';
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
} from '@infrastructure/api/requestsClient';
import type { RequestSummary } from '@infrastructure/api/hrmsClient';
import type { MainStackParamList } from '@app/navigation/types';

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
  const parent = useNavigation<NavigationProp<MainStackParamList>>();

  const [items, setItems] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employee?.name) return;
    setError(null);
    try {
      const data = await listMyRequests(employee.name);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat permohonan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee?.name]);

  useEffect(() => {
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
          <Text style={styles.title}>Permohonan Saya</Text>
          <Pressable
            onPress={() => parent.navigate('ApplyLeave')}
            style={styles.fab}
          >
            <Plus size={20} color={tokens.color.white} />
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
                parent.navigate('RequestDetail', { doctype: item.doctype, name: item.name })
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
    subtitle="Buat permohonan baru dengan tombol + di atas atau FAB di bawah."
  />
);

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.sp3, paddingBottom: tokens.spacing.sp3 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  fab: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.semantic.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', gap: tokens.spacing.sp2, paddingRight: tokens.spacing.sp4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    gap: 4,
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
