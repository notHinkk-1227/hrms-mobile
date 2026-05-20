import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronDown, FolderKanban } from 'lucide-react-native';
import { BottomSheet } from '@shared/components/BottomSheet';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { StatusBadge } from '@shared/components/StatusBadge';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { taskApi, TaskItem, TaskPriority, TaskStatus } from '@infrastructure/api/taskClient';
import { TaskSheet } from './TaskSheet';

type StatusFilter = 'open' | 'all';
type PriorityFilter = 'all' | TaskPriority;

const STATUS_OPTS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'open', label: 'Belum Selesai' },
  { key: 'all', label: 'Semua' },
];
const PRIORITY_OPTS: Array<{ key: PriorityFilter; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'Urgent', label: 'Urgent' },
  { key: 'High', label: 'Tinggi' },
  { key: 'Medium', label: 'Sedang' },
  { key: 'Low', label: 'Rendah' },
];

function priorityColor(p: TaskPriority | null): string {
  if (p === 'Urgent') return tokens.color.error;
  if (p === 'High') return tokens.color.yellow500;
  if (p === 'Medium') return tokens.color.blue500;
  return tokens.color.ink300;
}

function statusVariant(status: TaskStatus): 'success' | 'warning' | 'neutral' | 'error' {
  if (status === 'Completed') return 'success';
  if (status === 'Working' || status === 'Pending Review') return 'warning';
  if (status === 'Overdue') return 'error';
  return 'neutral';
}

function stripHtml(s: string | null): string {
  if (!s) return '';
  return s.replace(/<\/?[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function dueLabel(date: string | null): string {
  if (!date) return 'Tanpa tenggat';
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  if (diff < 7) return `${diff} hari lagi`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function TaskListScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const employee = useAuthStore((s) => s.employee);
  const userId = employee?.user_id ?? null;

  const [rows, setRows] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [pickerOpen, setPickerOpen] = useState<'status' | 'priority' | 'project' | null>(null);
  const [selected, setSelected] = useState<TaskItem | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const data = await taskApi.listAssignedToMe(userId, statusFilter === 'open', 100);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat task');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleComplete = async (task: TaskItem) => {
    await taskApi.markCompleted(task.name);
    setRows((curr) => curr.filter((r) => r.name !== task.name));
  };

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.project) {
        // Prefer project_name, fallback ke project ID
        if (!map.has(r.project)) {
          map.set(r.project, r.project_name ?? r.project);
        }
      }
    }
    const entries: Array<{ id: string; label: string }> = [{ id: 'all', label: 'Semua proyek' }];
    for (const [id, label] of map) entries.push({ id, label });
    entries.sort((a, b) => (a.id === 'all' ? -1 : b.id === 'all' ? 1 : a.label.localeCompare(b.label)));
    return entries;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (projectFilter !== 'all' && r.project !== projectFilter) return false;
      return true;
    });
  }, [rows, priorityFilter, projectFilter]);

  const activeFilters =
    (statusFilter !== 'open' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (projectFilter !== 'all' ? 1 : 0);

  return (
    <Screen bottomInset={false}>
      <FormHeader
        title="Task Saya"
        onBack={canGoBack ? () => navigation.goBack() : undefined}
      />

      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <DimensionChip
            label="Status"
            value={STATUS_OPTS.find((o) => o.key === statusFilter)?.label ?? 'Semua'}
            active={statusFilter !== 'open'}
            onPress={() => setPickerOpen('status')}
          />
          <DimensionChip
            label="Prioritas"
            value={PRIORITY_OPTS.find((o) => o.key === priorityFilter)?.label ?? 'Semua'}
            active={priorityFilter !== 'all'}
            onPress={() => setPickerOpen('priority')}
          />
          <DimensionChip
            label="Proyek"
            value={
              projectFilter === 'all'
                ? 'Semua'
                : projectOptions.find((p) => p.id === projectFilter)?.label ?? projectFilter
            }
            active={projectFilter !== 'all'}
            onPress={() => setPickerOpen('project')}
          />
          {activeFilters > 0 ? (
            <Pressable
              onPress={() => {
                setStatusFilter('open');
                setPriorityFilter('all');
                setProjectFilter('all');
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
        {STATUS_OPTS.map((o) => (
          <ValueRow
            key={o.key}
            label={o.label}
            selected={o.key === statusFilter}
            onPress={() => {
              setStatusFilter(o.key);
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
        {PRIORITY_OPTS.map((o) => (
          <ValueRow
            key={o.key}
            label={o.label}
            selected={o.key === priorityFilter}
            onPress={() => {
              setPriorityFilter(o.key);
              setPickerOpen(null);
            }}
          />
        ))}
      </BottomSheet>
      <BottomSheet
        visible={pickerOpen === 'project'}
        title="Filter Proyek"
        onClose={() => setPickerOpen(null)}
      >
        {projectOptions.map((p) => (
          <ValueRow
            key={p.id}
            label={p.label}
            selected={p.id === projectFilter}
            onPress={() => {
              setProjectFilter(p.id);
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
          data={filtered}
          keyExtractor={(it) => it.name}
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
              icon={<FolderKanban size={32} color={tokens.color.ink300} />}
              title="Belum ada task"
              subtitle="Task ERPNext yang di-assign ke Anda akan muncul di sini."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setSelected(item)}
            >
              <View style={[styles.priorityDot, { backgroundColor: priorityColor(item.priority) }]} />
              <View style={styles.rowText}>
                <Text style={styles.rowSubject} numberOfLines={2}>
                  {item.subject || '(tanpa judul)'}
                </Text>
                <View style={styles.rowMeta}>
                  {item.project ? (
                    <Text style={styles.rowProject} numberOfLines={1}>
                      📁 {item.project_name ?? item.project}
                    </Text>
                  ) : null}
                  <Text style={styles.rowDue}>{dueLabel(item.exp_end_date)}</Text>
                </View>
              </View>
              <StatusBadge label={item.status} variant={statusVariant(item.status)} />
            </Pressable>
          )}
        />
      )}

      <TaskSheet
        task={selected}
        onClose={() => setSelected(null)}
        onComplete={handleComplete}
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
      <Text style={[styles.dimChipLabel, active && styles.dimChipLabelActive]}>{label}:</Text>
      <Text style={[styles.dimChipValue, active && styles.dimChipValueActive]}>{value}</Text>
      <ChevronDown size={12} color={active ? tokens.color.white : tokens.semantic.fg3} />
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
      style={({ pressed }) => [valueRowStyles.row, pressed && valueRowStyles.rowPressed]}
    >
      <Text style={[valueRowStyles.label, selected && valueRowStyles.labelSelected]}>{label}</Text>
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
  priorityDot: { width: 12, height: 12, borderRadius: 6 },
  rowText: { flex: 1, gap: 4 },
  rowSubject: { fontSize: tokens.fontSize.body, fontWeight: '600', color: tokens.semantic.fg1 },
  rowMeta: { flexDirection: 'row', gap: tokens.spacing.sp2, alignItems: 'center', flexWrap: 'wrap' },
  rowProject: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3, flexShrink: 1 },
  rowDue: { fontSize: tokens.fontSize.caption, color: tokens.semantic.brand, fontWeight: '600' },
});

export { stripHtml };
