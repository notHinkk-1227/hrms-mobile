import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, FileText } from 'lucide-react-native';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { StatusBadge } from '@shared/components/StatusBadge';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { salarySlipApi, SalarySlipSummary } from '@infrastructure/api/hrmsClient';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'SalarySlipList'>;

function formatRp(n: number): string {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const startMonth = s.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) return startMonth;
  return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function SalarySlipListScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const [items, setItems] = useState<SalarySlipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employee?.name) return;
    salarySlipApi
      .list(employee.name, 12)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [employee?.name]);

  return (
    <Screen>
      <FormHeader title="Slip Gaji" subtitle="12 bulan terakhir" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList count={3} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={ListSep}
          ListEmptyComponent={EmptyList}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate('SalarySlipDetail', { name: item.name })}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowPeriod}>{formatPeriod(item.start_date, item.end_date)}</Text>
                <View style={styles.rowMeta}>
                  <StatusBadge
                    label={item.status === 'Submitted' ? 'Terkirim' : item.status}
                    variant={item.status === 'Submitted' ? 'success' : 'warning'}
                  />
                  {item.status === 'Submitted' ? (
                    <Text style={styles.rowAmount}>{formatRp(item.net_pay)}</Text>
                  ) : (
                    <Text style={styles.rowAmountMuted}>Belum final</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color={tokens.semantic.fg3} />
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
    icon={<FileText size={32} color={tokens.color.ink300} />}
    title="Belum ada slip gaji"
    subtitle="Slip akan muncul setelah HR memproses gaji bulan ini."
  />
);

const styles = StyleSheet.create({
  list: { paddingBottom: tokens.spacing.sp5, gap: tokens.spacing.sp2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  rowText: { flex: 1, gap: tokens.spacing.sp1_5 },
  rowPeriod: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp2 },
  rowAmount: { fontSize: tokens.fontSize.body, color: tokens.color.green700, fontWeight: '700' },
  rowAmountMuted: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  sep: { height: tokens.spacing.sp2 },
  skeletonWrap: { paddingVertical: tokens.spacing.sp2 },
  center: { padding: tokens.spacing.sp5, alignItems: 'center' },
  errorText: { color: tokens.color.error },
});
