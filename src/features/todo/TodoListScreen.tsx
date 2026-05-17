import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, CheckSquare, ChevronDown } from 'lucide-react-native';
import { BottomSheet } from '@shared/components/BottomSheet';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { todoApi, TodoItem, TodoStatus } from '@infrastructure/api/hrmsClient';
import { ApiError } from '@infrastructure/api/errors';
import { TodoSheet } from './TodoSheet';


type StatusFilter = 'Open' | 'Closed' | 'all';
type PriorityFilter = 'all' | 'High' | 'Medium' | 'Low';
type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'month' | 'none';

const STATUS_CHIPS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'Open', label: 'Aktif' },
  { key: 'Closed', label: 'Selesai' },
  { key: 'all', label: 'Semua' },
];
const PRIORITY_CHIPS: Array<{ key: PriorityFilter; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'High', label: 'Tinggi' },
  { key: 'Medium', label: 'Sedang' },
  { key: 'Low', label: 'Rendah' },
];
const DUE_CHIPS: Array<{ key: DueFilter; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'overdue', label: 'Lewat' },
  { key: 'today', label: 'Hari ini' },
  { key: 'week', label: 'Minggu ini' },
  { key: 'month', label: 'Bulan ini' },
  { key: 'none', label: 'Tanpa tenggat' },
];

function matchDue(filter: DueFilter, date: string | null): boolean {
  if (filter === 'all') return true;
  if (filter === 'none') return date == null;
  if (!date) return false;
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (filter === 'overdue') return diffDays < 0;
  if (filter === 'today') return diffDays === 0;
  if (filter === 'week') return diffDays >= 0 && diffDays < 7;
  if (filter === 'month') return diffDays >= 0 && diffDays < 30;
  return true;
}

function stripHtml(s: string): string {
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

function dueBucket(dateStr: string | null): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!dateStr) return 'none';
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) return 'overdue';
  if (d.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

function dueLabel(dateStr: string | null): string {
  if (!dateStr) return 'Tanpa tenggat';
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Besok';
  if (diffDays === -1) return 'Kemarin';
  if (diffDays < 0) return `Lewat ${Math.abs(diffDays)} hari`;
  if (diffDays < 7) return `${diffDays} hari lagi`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function TodoListScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const employee = useAuthStore((s) => s.employee);
  const userId = employee?.user_id ?? null;
  const [rows, setRows] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TodoItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Open');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [pickerOpen, setPickerOpen] = useState<'status' | 'priority' | 'due' | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const serverStatuses: TodoStatus[] =
        statusFilter === 'all' ? ['Open', 'Closed'] : [statusFilter];
      const data = await todoApi.listMy(userId, serverStatuses, 100);
      setRows(data);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat tugas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleDone = async (todo: TodoItem) => {
    await todoApi.markDone(todo.name);
    setRows((curr) => curr.filter((r) => r.name !== todo.name));
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (!matchDue(dueFilter, r.date)) return false;
      return true;
    });
  }, [rows, priorityFilter, dueFilter]);

  const groupOrder: Array<'overdue' | 'today' | 'upcoming' | 'none'> = [
    'overdue',
    'today',
    'upcoming',
    'none',
  ];
  const groupLabel: Record<typeof groupOrder[number], string> = {
    overdue: 'LEWAT TENGGAT',
    today: 'HARI INI',
    upcoming: 'AKAN DATANG',
    none: 'TANPA TENGGAT',
  };
  const buckets: Record<string, TodoItem[]> = { overdue: [], today: [], upcoming: [], none: [] };
  for (const r of filtered) buckets[dueBucket(r.date)].push(r);
  const flat: Array<
    | { type: 'header'; key: string; label: string }
    | { type: 'row'; key: string; item: TodoItem }
  > = [];
  for (const g of groupOrder) {
    if (buckets[g].length === 0) continue;
    flat.push({ type: 'header', key: `h-${g}`, label: groupLabel[g] });
    for (const r of buckets[g]) flat.push({ type: 'row', key: `r-${r.name}`, item: r });
  }

  const activeFilterCount =
    (statusFilter !== 'Open' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (dueFilter !== 'all' ? 1 : 0);

  return (
    <Screen>
      <FormHeader title="Tugas Saya" onBack={canGoBack ? () => navigation.goBack() : undefined} />

      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <DimensionChip
            label="Status"
            value={STATUS_CHIPS.find((c) => c.key === statusFilter)?.label ?? 'Semua'}
            active={statusFilter !== 'Open'}
            onPress={() => setPickerOpen('status')}
          />
          <DimensionChip
            label="Prioritas"
            value={PRIORITY_CHIPS.find((c) => c.key === priorityFilter)?.label ?? 'Semua'}
            active={priorityFilter !== 'all'}
            onPress={() => setPickerOpen('priority')}
          />
          <DimensionChip
            label="Tenggat"
            value={DUE_CHIPS.find((c) => c.key === dueFilter)?.label ?? 'Semua'}
            active={dueFilter !== 'all'}
            onPress={() => setPickerOpen('due')}
          />
          {activeFilterCount > 0 ? (
            <Pressable
              onPress={() => {
                setStatusFilter('Open');
                setPriorityFilter('all');
                setDueFilter('all');
              }}
              hitSlop={8}
            >
              <Text style={styles.resetLink}>Reset</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <BottomSheet
        visible={pickerOpen === 'status'}
        title="Filter Status"
        onClose={() => setPickerOpen(null)}
      >
        {STATUS_CHIPS.map((c) => (
          <ValueRow
            key={c.key}
            label={c.label}
            selected={c.key === statusFilter}
            onPress={() => {
              setStatusFilter(c.key);
              setPickerOpen(null);
            }}
          />
        ))}
      </BottomSheet>
      <BottomSheet
        visible={pickerOpen === 'priority'}
        title="Filter Prioritas"
        onClose={() => setPickerOpen(null)}
      >
        {PRIORITY_CHIPS.map((c) => (
          <ValueRow
            key={c.key}
            label={c.label}
            selected={c.key === priorityFilter}
            onPress={() => {
              setPriorityFilter(c.key);
              setPickerOpen(null);
            }}
          />
        ))}
      </BottomSheet>
      <BottomSheet
        visible={pickerOpen === 'due'}
        title="Filter Tenggat"
        onClose={() => setPickerOpen(null)}
      >
        {DUE_CHIPS.map((c) => (
          <ValueRow
            key={c.key}
            label={c.label}
            selected={c.key === dueFilter}
            onPress={() => {
              setDueFilter(c.key);
              setPickerOpen(null);
            }}
          />
        ))}
      </BottomSheet>

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
          data={flat}
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
              icon={<CheckSquare size={32} color={tokens.color.ink300} />}
              title={statusFilter === 'Closed' ? 'Belum ada tugas selesai' : 'Tidak ada tugas'}
              subtitle={statusFilter === 'Closed' ? 'Riwayat tugas selesai kosong.' : 'Tugas Anda sudah selesai semua. Mantap!'}
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.bucket}>{item.label}</Text>;
            }
            const r = item.item;
            const isClosed = r.status === 'Closed';
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed, isClosed && styles.rowClosed]}
                onPress={() => setSelected(r)}
              >
                <View style={[styles.priorityDot, { backgroundColor: priorityColor(r.priority) }]} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowDesc, isClosed && styles.rowDescClosed]} numberOfLines={2}>
                    {stripHtml(r.description ?? '') || '(tanpa deskripsi)'}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {isClosed ? '✓ Selesai · ' : ''}
                    {dueLabel(r.date)}
                    {r.assigned_by_full_name ? ` · dari ${r.assigned_by_full_name}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <TodoSheet
        todo={selected}
        onClose={() => setSelected(null)}
        onDone={handleDone}
      />
    </Screen>
  );
}

interface DimensionChipProps {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}

function DimensionChip({ label, value, active, onPress }: DimensionChipProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dimChip, active && styles.dimChipActive]}
      hitSlop={4}
    >
      <Text style={[styles.dimChipLabel, active && styles.dimChipLabelActive]}>
        {label}:
      </Text>
      <Text style={[styles.dimChipValue, active && styles.dimChipValueActive]}>
        {value}
      </Text>
      <ChevronDown
        size={12}
        color={active ? tokens.color.white : tokens.semantic.fg3}
      />
    </Pressable>
  );
}

interface ValueRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function ValueRow({ label, selected, onPress }: ValueRowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        valueRowStyles.row,
        pressed && valueRowStyles.rowPressed,
      ]}
    >
      <Text style={[valueRowStyles.label, selected && valueRowStyles.labelSelected]}>
        {label}
      </Text>
      {selected ? <Check size={18} color={tokens.semantic.brand} /> : null}
    </Pressable>
  );
}

const valueRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.sp3,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  label: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1 },
  labelSelected: { fontWeight: '700', color: tokens.semantic.brand },
});

const styles = StyleSheet.create({
  filters: {
    gap: tokens.spacing.sp1,
    paddingBottom: tokens.spacing.sp2,
    marginBottom: tokens.spacing.sp1,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1_5,
    flexWrap: 'wrap',
  },
  dimChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.spacing.sp2,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.semantic.surface2,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  dimChipActive: {
    backgroundColor: tokens.semantic.brand,
    borderColor: tokens.semantic.brand,
  },
  dimChipLabel: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontWeight: '600',
  },
  dimChipLabelActive: { color: 'rgba(255,255,255,0.85)' },
  dimChipValue: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg1,
    fontWeight: '700',
  },
  dimChipValueActive: { color: tokens.color.white },
  resetLink: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.brand,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  list: { paddingBottom: tokens.spacing.sp5, gap: tokens.spacing.sp2 },
  skeletonWrap: { paddingVertical: tokens.spacing.sp2 },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  rowClosed: { opacity: 0.65, backgroundColor: tokens.semantic.surface2 },
  priorityDot: { width: 12, height: 12, borderRadius: 6 },
  rowText: { flex: 1, gap: tokens.spacing.sp1 },
  rowDesc: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
  rowDescClosed: { textDecorationLine: 'line-through', color: tokens.semantic.fg3 },
  rowMeta: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
});
