import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';

export function HomeScreen(): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const tenantName = useAuthStore((s) => s.tenantName);

  return (
    <Screen>
      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>{tenantName}</Text>
        <Text style={styles.helloName}>Halo, {employee?.employee_name ?? 'Karyawan'}</Text>
        <Text style={styles.subtitle}>{employee?.designation ?? '—'}</Text>
      </View>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>BELUM ABSEN HARI INI</Text>
        <Text style={styles.heroTitle}>Mulai hari Anda</Text>
        <Text style={styles.heroSubtitle}>Fitur Absen Masuk akan tersedia di Fase 2.</Text>
      </View>
      <Text style={styles.note}>Phase 1 scaffold — fitur clock-in, cuti, klaim, slip gaji menyusul di fase berikutnya.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 4, marginBottom: tokens.spacing.sp4 },
  eyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  helloName: { fontSize: tokens.fontSize.h2, fontWeight: '800', color: tokens.semantic.fg1 },
  subtitle: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3 },
  heroCard: {
    padding: tokens.spacing.sp4,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.semantic.brand,
    gap: tokens.spacing.sp1,
    ...tokens.shadow.md,
  },
  heroLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.blue100,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroTitle: { fontSize: tokens.fontSize.h1, color: tokens.color.white, fontWeight: '800' },
  heroSubtitle: { fontSize: tokens.fontSize.body, color: tokens.color.blue50 },
  note: {
    marginTop: tokens.spacing.sp4,
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    lineHeight: 20,
  },
});
