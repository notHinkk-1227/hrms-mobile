import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@shared/components/Screen';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { salarySlipApi, SalarySlipDetail } from '@infrastructure/api/hrmsClient';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'SalarySlipDetail'>;

function formatRp(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function SalarySlipDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { name } = route.params;
  const [slip, setSlip] = useState<SalarySlipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    salarySlipApi
      .get(name)
      .then(setSlip)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <FormHeader title="Detail Slip Gaji" subtitle={name} onBack={() => navigation.goBack()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.semantic.brand} />
          </View>
        ) : error || !slip ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error ?? 'Slip tidak ditemukan'}</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.netCard}>
              <Text style={styles.netLabel}>TAKE-HOME PAY</Text>
              <Text style={styles.netValue}>Rp {formatRp(slip.net_pay)}</Text>
              <Text style={styles.netPeriod}>{formatPeriod(slip.start_date, slip.end_date)}</Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Hari Kerja</Text>
                <Text style={styles.summaryValue}>{slip.total_working_days ?? 0}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Hari Dibayar</Text>
                <Text style={styles.summaryValue}>{slip.payment_days ?? 0}</Text>
              </View>
            </View>

            <Section title="Pendapatan" color={tokens.color.green700}>
              {(slip.earnings ?? []).map((row, idx) => (
                <Row key={`e-${idx}`} label={row.salary_component} value={`Rp ${formatRp(row.amount)}`} />
              ))}
              <Row
                label="Total Pendapatan"
                value={`Rp ${formatRp(slip.gross_pay)}`}
                emphasis
              />
            </Section>

            <Section title="Potongan" color={tokens.color.error}>
              {(slip.deductions ?? []).map((row, idx) => (
                <Row
                  key={`d-${idx}`}
                  label={row.salary_component}
                  value={`Rp ${formatRp(row.amount)}`}
                />
              ))}
              <Row
                label="Total Potongan"
                value={`Rp ${formatRp(slip.total_deduction ?? 0)}`}
                emphasis
              />
            </Section>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

interface SectionProps {
  title: string;
  color: string;
  children: React.ReactNode;
}

function Section({ title, color, children }: SectionProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function Row({ label, value, emphasis }: RowProps): React.JSX.Element {
  return (
    <View style={[rowStyles.row, emphasis && rowStyles.rowEmphasis]}>
      <Text style={[rowStyles.label, emphasis && rowStyles.labelEmphasis]}>{label}</Text>
      <Text style={[rowStyles.value, emphasis && rowStyles.valueEmphasis]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sp2,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  rowEmphasis: {
    borderBottomWidth: 0,
    paddingTop: tokens.spacing.sp3,
    marginTop: tokens.spacing.sp1,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.line,
  },
  label: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg2, flex: 1 },
  labelEmphasis: { fontWeight: '700', color: tokens.semantic.fg1 },
  value: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg1,
    fontFamily: tokens.font.mono,
  },
  valueEmphasis: { fontWeight: '700' },
});

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  center: { padding: tokens.spacing.sp5, alignItems: 'center' },
  errorText: { color: tokens.color.error },
  content: { gap: tokens.spacing.sp4 },
  netCard: {
    padding: tokens.spacing.sp4,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.green600,
    alignItems: 'center',
    gap: 4,
  },
  netLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.green100,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  netValue: {
    fontSize: tokens.fontSize.h1,
    color: tokens.color.white,
    fontWeight: '800',
    fontFamily: tokens.font.mono,
  },
  netPeriod: { fontSize: tokens.fontSize.body, color: tokens.color.green100 },
  summaryGrid: { flexDirection: 'row', gap: tokens.spacing.sp2 },
  summaryItem: {
    flex: 1,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: { fontSize: tokens.fontSize.eyebrow, color: tokens.semantic.fg3, fontWeight: '700', letterSpacing: 1 },
  summaryValue: { fontSize: tokens.fontSize.h2, fontWeight: '800', color: tokens.semantic.fg1 },
  section: {
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    padding: tokens.spacing.sp3,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: tokens.spacing.sp2,
  },
  sectionBody: {},
});
