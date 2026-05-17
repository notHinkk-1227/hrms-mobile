import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { StatusBadge } from '@shared/components/StatusBadge';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { getDoctype, updateDocStatus } from '@infrastructure/api/hrmsClient';
import {
  getDoctypeLabel,
  getStatusLabel,
  getStatusVariant,
} from '@infrastructure/api/requestsClient';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'TeamRequestDetail'>;

function formatRp(n: number | null | undefined): string {
  if (n == null) return '—';
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface FieldRow {
  label: string;
  value: string;
}

function extractFields(doctype: string, doc: Record<string, unknown>): FieldRow[] {
  const s = (v: unknown) => (v == null || v === '' ? '—' : String(v));
  const n = (v: unknown) => formatRp(typeof v === 'number' ? v : null);
  const d = (v: unknown) => formatDate(typeof v === 'string' ? v : null);

  switch (doctype) {
    case 'Leave Application':
      return [
        { label: 'Tipe Cuti', value: s(doc.leave_type) },
        { label: 'Periode', value: `${d(doc.from_date)} – ${d(doc.to_date)}` },
        { label: 'Total Hari', value: s(doc.total_leave_days) },
        { label: 'Alasan', value: s(doc.description) },
      ];
    case 'Expense Claim':
      return [
        { label: 'Tanggal', value: d(doc.posting_date) },
        { label: 'Total Klaim', value: n(doc.total_claimed_amount) },
      ];
    case 'Employee Advance':
      return [
        { label: 'Tanggal', value: d(doc.posting_date) },
        { label: 'Jumlah', value: n(doc.advance_amount) },
        { label: 'Keperluan', value: s(doc.purpose) },
      ];
    case 'Shift Request':
      return [
        { label: 'Tipe Shift', value: s(doc.shift_type) },
        { label: 'Periode', value: `${d(doc.from_date)}${doc.to_date ? ` – ${d(doc.to_date)}` : ''}` },
      ];
    default:
      return [];
  }
}

export function TeamRequestDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { doctype, name } = route.params;
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDoctype(doctype, name)
      .then((d) => setDoc(d as Record<string, unknown>))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [doctype, name]);

  const action = (status: 'Approved' | 'Rejected') => {
    const verb = status === 'Approved' ? 'menyetujui' : 'menolak';
    Alert.alert(
      'Konfirmasi',
      `Yakin ${verb} permohonan ${getDoctypeLabel(doctype).toLowerCase()} ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: status === 'Approved' ? 'Setujui' : 'Tolak',
          style: status === 'Approved' ? 'default' : 'destructive',
          onPress: async () => {
            setActing(true);
            try {
              await updateDocStatus(doctype, name, status);
              Alert.alert(
                'Berhasil',
                `Permohonan ${status === 'Approved' ? 'disetujui' : 'ditolak'}.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Gagal update status';
              Alert.alert('Gagal', msg);
            } finally {
              setActing(false);
            }
          },
        },
      ],
    );
  };

  const isOpen = doc ? String(doc.status) === 'Open' : false;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <FormHeader
          title={getDoctypeLabel(doctype)}
          subtitle={name}
          onBack={() => navigation.goBack()}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.semantic.brand} />
          </View>
        ) : error || !doc ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error ?? 'Tidak ada data'}</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.employeeCard}>
              <Text style={styles.employeeLabel}>PEMOHON</Text>
              <Text style={styles.employeeName}>
                {String(doc.employee_name ?? doc.employee)}
              </Text>
              <Text style={styles.employeeId}>{String(doc.employee)}</Text>
            </View>

            <View style={styles.statusRow}>
              <StatusBadge
                label={getStatusLabel(String(doc.status))}
                variant={getStatusVariant(String(doc.status))}
              />
              <Text style={styles.creation}>
                Diajukan {new Date(String(doc.creation)).toLocaleDateString('id-ID')}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              {extractFields(doctype, doc).map((f) => (
                <View key={f.label} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{f.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {!loading && doc && isOpen ? (
        <View style={styles.actionBar}>
          <Button
            variant="outline"
            style={styles.rejectBtn}
            onPress={() => action('Rejected')}
            disabled={acting}
          >
            <XCircle size={18} color={tokens.color.error} />
            <Text style={styles.rejectText}> Tolak</Text>
          </Button>
          <Button
            style={styles.approveBtn}
            onPress={() => action('Approved')}
            loading={acting}
          >
            <CheckCircle2 size={18} color={tokens.color.white} />
            <Text style={styles.approveText}> Setujui</Text>
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.formCtaSpace },
  center: { padding: tokens.spacing.sp5, alignItems: 'center' },
  errorText: { color: tokens.color.error },
  content: { gap: tokens.spacing.sp4 },
  employeeCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.color.blue50,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.sp1,
  },
  employeeLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.blue700,
    fontWeight: '700',
    letterSpacing: 1,
  },
  employeeName: { fontSize: tokens.fontSize.h2, fontWeight: '800', color: tokens.semantic.fg1 },
  employeeId: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3, fontFamily: tokens.font.mono },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  creation: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  fieldGroup: {
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    overflow: 'hidden',
  },
  field: {
    padding: tokens.spacing.sp3,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
    gap: tokens.spacing.sp1,
  },
  fieldLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fieldValue: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1 },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: tokens.spacing.sp2,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.line,
    paddingBottom: tokens.spacing.sp4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    borderColor: tokens.color.error,
  },
  rejectText: { color: tokens.color.error, fontWeight: '700' },
  approveBtn: { flex: 1, flexDirection: 'row' },
  approveText: { color: tokens.color.white, fontWeight: '700' },
});
