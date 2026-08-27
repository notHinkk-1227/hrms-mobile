import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@shared/components/Screen';
import { StatusBanner, BannerStatus } from '@shared/components/StatusBanner';
import { StatusTimeline, TimelineStep } from '@shared/components/StatusTimeline';
import { FormHeader } from '@features/forms/FormHeader';
import { AttachmentRow } from '@shared/components/AttachmentRow';
import type { UploadedFile } from '@infrastructure/api/uploadClient';
import { tokens } from '@shared/theme/tokens';
import { getDoctype } from '@infrastructure/api/hrmsClient';
import { getDoctypeLabel } from '@infrastructure/api/requestsClient';
import type { MainStackParamList } from '@app/navigation/types';

function getBannerStatus(status: string): BannerStatus {
  if (status === 'Approved' || status === 'Paid') return 'approved';
  if (status === 'Rejected' || status === 'Cancelled') return 'rejected';
  if (status === 'Draft') return 'draft';
  return 'pending';
}

function getBannerCopy(status: BannerStatus, doctype: string): { title: string; subtitle: string } {
  const docName = doctype.toLowerCase();
  switch (status) {
    case 'approved':
      return { title: 'Permohonan disetujui', subtitle: `${docName} Anda sudah disetujui atasan` };
    case 'rejected':
      return { title: 'Permohonan ditolak', subtitle: `Cek alasan dari atasan di bawah` };
    case 'draft':
      return { title: 'Masih draft', subtitle: 'Belum dikirim untuk approval' };
    default:
      return { title: 'Menunggu persetujuan', subtitle: 'Atasan akan memproses dalam 1–2 hari' };
  }
}

function buildTimeline(doc: Record<string, unknown>): TimelineStep[] {
  const status = String(doc.status ?? 'Open');
  const creation = doc.creation as string | undefined;
  const modified = doc.modified as string | undefined;
  const approver = (doc.leave_approver ?? doc.expense_approver ?? doc.approver) as string | undefined;
  const formatDt = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : undefined;

  const submitted: TimelineStep = {
    status: 'done',
    title: 'Permohonan dikirim',
    subtitle: formatDt(creation),
  };

  if (status === 'Approved') {
    return [
      submitted,
      {
        status: 'done',
        title: 'Disetujui atasan',
        subtitle: formatDt(modified),
        actorName: approver,
      },
    ];
  }
  if (status === 'Rejected') {
    return [
      submitted,
      {
        status: 'rejected',
        title: 'Ditolak atasan',
        subtitle: formatDt(modified),
        actorName: approver,
      },
    ];
  }
  if (status === 'Cancelled') {
    return [
      submitted,
      {
        status: 'rejected',
        title: 'Dibatalkan',
        subtitle: formatDt(modified),
      },
    ];
  }
  // Open / Draft
  return [
    submitted,
    {
      status: 'current',
      title: 'Menunggu persetujuan atasan',
      subtitle: approver ? `Approver: ${approver}` : undefined,
    },
  ];
}

type Props = NativeStackScreenProps<MainStackParamList, 'RequestDetail'>;

interface FieldRow {
  label: string;
  value: string;
}

function formatRp(n: number | null | undefined): string {
  if (n == null) return '—';
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function extractFields(doctype: string, doc: Record<string, unknown>): FieldRow[] {
  const s = (v: unknown) => (v == null || v === '' ? '—' : String(v));
  const n = (v: unknown) => formatRp(typeof v === 'number' ? v : null);
  const d = (v: unknown) => formatDate(typeof v === 'string' ? v : null);

  switch (doctype) {
    case 'Leave Application':
      return [
        { label: 'Tipe Cuti', value: s(doc.leave_type) },
        { label: 'Mulai', value: d(doc.from_date) },
        { label: 'Selesai', value: d(doc.to_date) },
        { label: 'Total Hari', value: s(doc.total_leave_days) },
        { label: 'Setengah Hari', value: doc.half_day ? 'Ya' : 'Tidak' },
        { label: 'Alasan', value: s(doc.description) },
        { label: 'Approver', value: s(doc.leave_approver) },
      ];
    case 'Expense Claim':
      return [
        { label: 'Tanggal Pengajuan', value: d(doc.posting_date) },
        { label: 'Total Klaim', value: n(doc.total_claimed_amount) },
        { label: 'Total Disetujui', value: n(doc.total_sanctioned_amount) },
        { label: 'Approver', value: s(doc.expense_approver) },
      ];
    case 'Employee Advance':
      return [
        { label: 'Tanggal', value: d(doc.posting_date) },
        { label: 'Jumlah', value: n(doc.advance_amount) },
        { label: 'Keperluan', value: s(doc.purpose) },
        { label: 'Mode Pembayaran', value: s(doc.mode_of_payment) },
      ];
    case 'Attendance Request':
      return [
        { label: 'Alasan', value: s(doc.reason) },
        { label: 'Mulai', value: d(doc.from_date) },
        { label: 'Selesai', value: d(doc.to_date) },
        { label: 'Penjelasan', value: s(doc.explanation) },
      ];
    case 'Shift Request':
      return [
        { label: 'Tipe Shift', value: s(doc.shift_type) },
        { label: 'Mulai', value: d(doc.from_date) },
        { label: 'Selesai', value: d(doc.to_date) },
      ];
    default:
      return [];
  }
}

export function RequestDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { doctype, name } = route.params;
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buktiBayar, setBuktiBayar] = useState<UploadedFile | null>(null);

  useEffect(() => {
    getDoctype(doctype, name)
      .then((d) => setDoc(d as Record<string, unknown>))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [doctype, name]);

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
            {(() => {
              const bannerStatus = getBannerStatus(String(doc.status));
              const copy = getBannerCopy(bannerStatus, getDoctypeLabel(doctype));
              return <StatusBanner status={bannerStatus} title={copy.title} subtitle={copy.subtitle} />;
            })()}

            <View style={styles.timelineBlock}>
              <Text style={styles.timelineHead}>Alur Persetujuan</Text>
              <StatusTimeline steps={buildTimeline(doc)} />
            </View>

            <View style={styles.fieldGroup}>
              {extractFields(doctype, doc).map((f) => (
                <View key={f.label} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{f.value}</Text>
                </View>
              ))}
            </View>

            {doctype === 'Expense Claim' && Array.isArray(doc.expenses) ? (
              <View style={styles.itemsBlock}>
                <Text style={styles.itemsTitle}>Rincian Item</Text>
                {(doc.expenses as Array<Record<string, unknown>>).map((item, idx) => (
                  <View key={`item-${idx}`} style={styles.itemRow}>
                    <Text style={styles.itemDesc}>{String(item.description ?? '—')}</Text>
                    <Text style={styles.itemMeta}>
                      {String(item.expense_type ?? '')} · {formatDate(String(item.expense_date))}
                    </Text>
                    <Text style={styles.itemAmount}>
                      {formatRp(typeof item.amount === 'number' ? item.amount : null)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {doctype === 'Expense Claim' &&
            (String(doc.status) === 'Draft' || String(doc.approval_status) === 'Approved') ? (
              <View style={styles.buktiBayarBlock}>
                <Text style={styles.itemsTitle}>Bukti Bayar</Text>
                <AttachmentRow
                  label="Lampirkan bukti pembayaran"
                  file={buktiBayar}
                  onChange={setBuktiBayar}
                  attachToDoctype="Expense Claim"
                  attachToName={name}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  center: { padding: tokens.spacing.sp5, alignItems: 'center' },
  errorText: { color: tokens.color.error },
  content: { gap: tokens.spacing.sp4 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineBlock: { gap: tokens.spacing.sp2 },
  timelineHead: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
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
  itemsBlock: {
    gap: tokens.spacing.sp2,
  },
  itemsTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  itemRow: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp1,
  },
  itemDesc: { fontSize: tokens.fontSize.body, fontWeight: '600', color: tokens.semantic.fg1 },
  itemMeta: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  itemAmount: { fontSize: tokens.fontSize.body, color: tokens.semantic.brand, fontWeight: '700' },
  buktiBayarBlock: { gap: tokens.spacing.sp2 },
});
