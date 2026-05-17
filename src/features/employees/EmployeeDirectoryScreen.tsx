import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, Users } from 'lucide-react-native';
import { Avatar } from '@shared/components/Avatar';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { TextField } from '@shared/components/TextField';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import {
  listEmployeesByDept,
  EmployeeContact,
} from '@infrastructure/api/employeeClient';
import { ApiError } from '@infrastructure/api/errors';
import { EmployeeActionSheet } from './EmployeeActionSheet';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'EmployeeDirectory'>;

export function EmployeeDirectoryScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const [rows, setRows] = useState<EmployeeContact[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmployeeContact | null>(null);

  const load = useCallback(async () => {
    if (!employee?.name) {
      setLoading(false);
      setError('Data karyawan belum dimuat');
      return;
    }
    setError(null);
    try {
      const data = await listEmployeesByDept(
        employee.department ?? null,
        employee.name,
        employee.reports_to ?? null,
        200,
      );
      setRows(data);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat daftar karyawan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee?.name, employee?.department, employee?.reports_to]);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(q) ||
          (r.designation ?? '').toLowerCase().includes(q),
      )
    : rows;

  return (
    <Screen>
      <FormHeader
        title="Karyawan"
        subtitle={employee?.department ?? 'Semua karyawan aktif'}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Cari nama atau jabatan"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={12}
            style={styles.clearBtn}
            accessibilityLabel="Hapus pencarian"
          >
            <Text style={styles.clearBtnText}>×</Text>
          </Pressable>
        ) : null}
      </View>

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
          keyExtractor={(item) => item.name}
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
              icon={<Users size={32} color={tokens.color.ink300} />}
              title={q ? 'Tidak ada hasil' : 'Belum ada rekan kerja'}
              subtitle={q ? 'Coba kata kunci lain.' : 'Departemen Anda belum punya karyawan lain terdaftar.'}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setSelected(item)}
            >
              <Avatar name={item.employee_name} imageUri={item.image} size="lg" />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>{item.employee_name}</Text>
                {item.designation || item.department ? (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[item.designation, item.department].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={20} color={tokens.semantic.fg3} />
            </Pressable>
          )}
        />
      )}

      <EmployeeActionSheet
        contact={selected}
        onClose={() => setSelected(null)}
        onOpenDetail={(name) => navigation.navigate('EmployeeDetail', { name })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { marginBottom: tokens.spacing.sp3, position: 'relative' },
  clearBtn: {
    position: 'absolute',
    right: tokens.spacing.sp3,
    top: 28,
    width: tokens.touchTarget.min,
    height: tokens.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 24, color: tokens.semantic.fg3, fontWeight: '600' },
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
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: tokens.fontSize.body, fontWeight: '700', color: tokens.semantic.fg1 },
  rowMeta: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
