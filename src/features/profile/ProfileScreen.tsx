import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Building2, Calendar, ChevronRight, FileText, LogOut, Mail, User as UserIcon } from 'lucide-react-native';
import { Gradient } from '@shared/components/Gradient';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { getHost } from '@shared/utils/url';
import { useAuthStore } from '@features/auth/store';
import { logoutFromFrappe } from '@features/auth/authService';
import type { MainStackParamList } from '@app/navigation/types';

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileScreen(): React.JSX.Element {
  const parent = useNavigation<NavigationProp<MainStackParamList>>();
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const tenantName = useAuthStore((s) => s.tenantName);
  const tenantUrl = useAuthStore((s) => s.tenantUrl);
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
    <Screen bottomInset={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Gradient colors={[tokens.color.ink800, tokens.color.ink900]} angle={135} style={styles.heroCard}>
          <View style={styles.heroContent}>
            {employee?.image ? (
              <Image
                source={{ uri: (tenantUrl ?? '') + employee.image }}
                style={styles.avatar}
              />
            ) : (
              <Gradient
                colors={[tokens.color.blue500, tokens.color.blue700]}
                angle={135}
                style={styles.avatarFallback}
              >
                <View style={styles.avatarContent}>
                  {employee?.employee_name ? (
                    <Text style={styles.avatarInitials}>{getInitials(employee.employee_name)}</Text>
                  ) : (
                    <UserIcon size={36} color={tokens.color.white} />
                  )}
                </View>
              </Gradient>
            )}
            <Text style={styles.name}>{employee?.employee_name ?? 'Karyawan'}</Text>
            <Text style={styles.designation}>{employee?.designation ?? '—'}</Text>
            <View style={styles.tenantStrip}>
              <Building2 size={11} color={tokens.color.white} />
              <Text style={styles.tenantStripText}>{tenantName ?? '—'}</Text>
              {tenantCode ? <Text style={styles.tenantStripCode}> · {tenantCode}</Text> : null}
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: tokens.color.green300 }]}>9</Text>
                <Text style={styles.statLabel}>Sisa cuti</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxMid]}>
                <Text style={[styles.statValue, { color: tokens.color.yellow300 }]}>4</Text>
                <Text style={styles.statLabel}>Lembur (jam)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: tokens.color.blue300 }]}>98%</Text>
                <Text style={styles.statLabel}>Kehadiran</Text>
              </View>
            </View>
          </View>
        </Gradient>

        <View style={styles.body}>

        <View style={styles.menu}>
          <MenuRow
            icon={<FileText size={20} color={tokens.color.green600} />}
            label="Slip Gaji"
            hint="12 bulan terakhir"
            onPress={() => parent.navigate('SalarySlipList')}
          />
          <MenuRow
            icon={<Calendar size={20} color={tokens.semantic.brand} />}
            label="Riwayat Absen"
            hint="Kalender per bulan"
            onPress={() => parent.navigate('MyAttendance')}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informasi Karyawan</Text>
          <InfoRow icon={<Mail size={16} color={tokens.semantic.fg3} />} label="Email" value={user ?? '—'} />
          <InfoRow
            icon={<Building2 size={16} color={tokens.semantic.fg3} />}
            label="Departemen"
            value={employee?.department ?? '—'}
          />
          <InfoRow
            icon={<Building2 size={16} color={tokens.semantic.fg3} />}
            label="Perusahaan"
            value={employee?.company ?? '—'}
          />
          {employee?.date_of_joining ? (
            <InfoRow
              icon={<Calendar size={16} color={tokens.semantic.fg3} />}
              label="Bergabung"
              value={new Date(employee.date_of_joining).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          ) : null}
        </View>

        <View style={styles.tenantCard}>
          <Text style={styles.tenantLabel}>SERVER</Text>
          <Text style={styles.tenantHost}>{getHost(tenantUrl)}</Text>
        </View>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        >
          <LogOut size={18} color={tokens.color.error} />
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>

        <Text style={styles.version}>Sopwer HRMS v0.0.5 · Phase 4 MVP</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onPress: () => void;
}

function MenuRow({ icon, label, hint, onPress }: MenuRowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [menuStyles.row, pressed && menuStyles.rowPressed]}
    >
      {icon}
      <View style={menuStyles.text}>
        <Text style={menuStyles.label}>{label}</Text>
        {hint ? <Text style={menuStyles.hint}>{hint}</Text> : null}
      </View>
      <ChevronRight size={18} color={tokens.semantic.fg3} />
    </Pressable>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps): React.JSX.Element {
  return (
    <View style={infoStyles.row}>
      {icon}
      <View style={infoStyles.text}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp3,
    paddingHorizontal: tokens.spacing.sp3,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  text: { flex: 1 },
  label: { fontSize: tokens.fontSize.body, fontWeight: '600', color: tokens.semantic.fg1 },
  hint: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    paddingVertical: tokens.spacing.sp2,
  },
  text: { flex: 1, gap: 2 },
  label: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  value: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1 },
});

const styles = StyleSheet.create({
  scroll: { paddingBottom: tokens.spacing.sp5 },
  heroCard: { paddingBottom: tokens.spacing.sp4 },
  heroContent: {
    alignItems: 'center',
    paddingTop: tokens.spacing.sp4,
    paddingHorizontal: tokens.spacing.sp4,
    gap: 6,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    ...tokens.shadow.lg,
  },
  avatarContent: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: tokens.font.display,
    fontSize: 28,
    fontWeight: '800',
    color: tokens.color.white,
  },
  name: {
    fontFamily: tokens.font.display,
    fontSize: 22,
    fontWeight: '800',
    color: tokens.color.white,
    marginTop: tokens.spacing.sp3,
    letterSpacing: -0.3,
  },
  designation: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  tenantStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: tokens.radius.full,
    marginTop: tokens.spacing.sp2,
  },
  tenantStripText: { fontSize: 11, color: tokens.color.white, fontWeight: '600' },
  tenantStripCode: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: tokens.font.mono },
  statsGrid: {
    flexDirection: 'row',
    marginTop: tokens.spacing.sp4,
    width: '100%',
    paddingHorizontal: tokens.spacing.sp2,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statBoxMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontFamily: tokens.font.display, fontSize: 24, fontWeight: '800' },
  statLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: { paddingHorizontal: tokens.spacing.sp4, paddingTop: tokens.spacing.sp4, gap: tokens.spacing.sp4 },
  menu: {
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    overflow: 'hidden',
  },
  infoCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    marginBottom: tokens.spacing.sp2,
  },
  tenantCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface2,
    borderRadius: tokens.radius.md,
    gap: 4,
  },
  tenantLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tenantHost: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg2, fontFamily: tokens.font.mono },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.errorTint,
    borderWidth: 1,
    borderColor: tokens.color.error,
  },
  logoutBtnPressed: { opacity: 0.7 },
  logoutText: { fontSize: tokens.fontSize.body, fontWeight: '700', color: tokens.color.error },
  version: { fontSize: tokens.fontSize.caption, color: tokens.color.ink300, textAlign: 'center' },
});
