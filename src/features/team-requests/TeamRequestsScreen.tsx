import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Screen } from '@shared/components/Screen';
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

  return (
    <Screen bottomInset={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Permohonan Tim</Text>
        <Text style={styles.subtitle}>
          {items.length} permohonan menunggu persetujuan Anda
        </Text>
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
        <View style={styles.center}>
          <ActivityIndicator color={tokens.semantic.brand} />
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
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>Tidak ada yang menunggu</Text>
    <Text style={styles.emptyBody}>Semua permohonan tim sudah diproses.</Text>
  </View>
);

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.sp2, paddingBottom: tokens.spacing.sp3 },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  subtitle: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  tabs: { flexDirection: 'row', gap: tokens.spacing.sp2, marginTop: tokens.spacing.sp2 },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.sp4 },
  errorText: { color: tokens.color.error },
  empty: { padding: tokens.spacing.sp5, alignItems: 'center', gap: tokens.spacing.sp2 },
  emptyTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  emptyBody: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3, textAlign: 'center' },
});
