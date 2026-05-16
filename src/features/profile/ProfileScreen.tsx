import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { logoutFromFrappe } from '@features/auth/authService';

export function ProfileScreen(): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const tenantName = useAuthStore((s) => s.tenantName);
  const tenantCode = useAuthStore((s) => s.tenantCode);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = () => {
    Alert.alert('Keluar dari aplikasi?', 'Anda akan diminta login ulang.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logoutFromFrappe();
          logout();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title}>Profil</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nama</Text>
        <Text style={styles.value}>{employee?.employee_name ?? '—'}</Text>
        <Text style={styles.label}>NIK</Text>
        <Text style={styles.value}>{employee?.name ?? '—'}</Text>
        <Text style={styles.label}>Departemen</Text>
        <Text style={styles.value}>{employee?.department ?? '—'}</Text>
        <Text style={styles.label}>Jabatan</Text>
        <Text style={styles.value}>{employee?.designation ?? '—'}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user ?? '—'}</Text>
        <Text style={styles.label}>Perusahaan</Text>
        <Text style={styles.value}>{tenantName ?? '—'} ({tenantCode ?? '—'})</Text>
      </View>
      <Button variant="outline" fullWidth onPress={onLogout}>
        Keluar
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1, marginBottom: tokens.spacing.sp3 },
  card: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    marginBottom: tokens.spacing.sp4,
    gap: 6,
  },
  label: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: tokens.spacing.sp1,
  },
  value: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
});
