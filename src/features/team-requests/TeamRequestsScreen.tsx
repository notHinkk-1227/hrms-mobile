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
import { CheckCircle2 } from 'lucide-react-native';
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
  listTeamRequests,
} from '@infrastructure/api/requestsClient';
import type { RequestSummary } from '@infrastructure/api/hrmsClient';
import type { MainStackParamList } from '@app/navigation/types';

const TABS = [
  { key: 'all', label: 'Semua', doctype: null },
  { key: 'leave', label: 'Cuti', doctype: 'Leave Application' },
  { key: 'expense', label: 'Klaim', doctype: 'Expense Claim' },
  { key: 'advance', label: 'Kasbon', doctype: 'Employee Advance' },
  { key: 'shift', label: 'Shift', doctype: 'Shift Request' },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

export function TeamRequestsScreen(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const parent = useNavigation<NavigationProp<MainStackParamList>>();

  const [items, setItems] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const data = await listTeamRequests(user);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat permohonan tim');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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

  const statBoxes = [
    { doctype: 'Leave Application', label: 'Cuti', color: tokens.color.blue700, bg: tokens.color.blue50 },
    { doctype: 'Expense Claim', label: 'Klaim', color: tokens.color.green700, bg: tokens.color.green50 },
    { doctype: 'Employee Advance', label: 'Kasbon', color: tokens.color.yellow700, bg: tokens.color.yellow50 },
    { doctype: 'Shift Request', label: 'Shift', color: tokens.semantic.fg2, bg: tokens.color.ink50 },
  ];

  return (
    <Screen bottomInset={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Permohonan Tim</Text>
        <Text style={styles.subtitle}>
          {items.length} permohonan menunggu persetujuan Anda
        </Text>

        <View style={styles.statsBar}>
          {statBoxes.map((box) => {
            const count = items.filter((i) => i.doctype === box.doctype).length;
            return (
              <View
                key={box.doctype}
                style={[
                  styles.statBox,
                  { backgroundColor: count > 0 ? box.bg : tokens.semantic.surface2 },
                ]}
              >
                <Text style={[styles.statValue, { color: count > 0 ? box.color : tokens.color.ink300 }]}>
                  {count}
                </Text>
                <Text style={[styles.statLabel, { color: count > 0 ? box.color : tokens.semantic.fg3 }]}>
                  {box.label}
                </Text>
              </View>
            );
          })}
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
                parent.navigate('TeamRequestDetail', { doctype: item.doctype, name: item.name })
              }
            >
              <View style={styles.rowMeta}>
                <View style={styles.rowMetaLeft}>
                  <Text style={styles.rowDoctype}>{getDoctypeLabel(item.doctype).toUpperCase()}</Text>
                  <Text style={styles.rowDate}> · {formatDate(item.creation)}</Text>
                </View>
                <StatusBadge
                  label={getStatusLabel(item.status)}
                  variant={getStatusVariant(item.status)}
                />
              </View>
              <Text style={styles.rowEmployee}>{item.employee_name ?? item.employee}</Text>
              <Text style={styles.rowPrimary} numberOfLines={1}>
                {item.primary}
              </Text>
              {item.secondary ? (
                <Text style={styles.rowSecondary} numberOfLines={2}>
                  {item.secondary}
                </Text>
              ) : null}
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
    icon={<CheckCircle2 size={32} color={tokens.color.green500} />}
    title="Inbox bersih"
    subtitle="Semua permohonan tim sudah diproses. Sampai jumpa di permohonan berikutnya."
  />
);

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.sp2, paddingBottom: tokens.spacing.sp3 },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  subtitle: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  statsBar: {
    flexDirection: 'row',
    gap: tokens.spacing.sp1_5,
    marginTop: tokens.spacing.sp2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: tokens.spacing.sp2,
    borderRadius: tokens.radius.md,
    gap: 2,
  },
  statValue: {
    fontFamily: tokens.font.display,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tabs: { flexDirection: 'row', gap: tokens.spacing.sp2, marginTop: tokens.spacing.sp2 },
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
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMetaLeft: { flexDirection: 'row', alignItems: 'center' },
  rowDoctype: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.brand,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rowDate: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  rowEmployee: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  rowPrimary: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg2 },
  rowSecondary: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  sep: { height: tokens.spacing.sp2 },
  skeletonWrap: { paddingVertical: tokens.spacing.sp2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.sp4 },
  errorText: { color: tokens.color.error },
});
