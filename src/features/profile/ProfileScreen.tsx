import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Building2, Calendar, ChevronRight, Fingerprint, FileText, Globe2, Info, LogOut, Mail, Palette, User as UserIcon } from 'lucide-react-native';
import { THEMES, type ThemeKey } from '@shared/theme/themes';
import { BottomSheet } from '@shared/components/BottomSheet';
import { Gradient } from '@shared/components/Gradient';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { getHost } from '@shared/utils/url';
import { useAuthStore } from '@features/auth/store';
import { logoutFromFrappe } from '@features/auth/authService';
import { biometricService } from '@infrastructure/biometric/biometricService';
import type { MainStackParamList } from '@app/navigation/types';
import { getFullLabel } from '@config/appInfo';
import { leaveApi, attendanceApi } from '@infrastructure/api/hrmsClient';

/** Hitung % kehadiran berdasarkan Attendance.status bulan berjalan. */
function calcAttendanceRate(
  records: { status?: string }[],
): number | null {
  if (records.length === 0) return null;
  const counted = records.filter((r) =>
    ['Present', 'Half Day', 'Work From Home'].includes(r.status ?? ''),
  ).length;
  return Math.round((counted / records.length) * 100);
}

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
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const language = useAuthStore((s) => s.language);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const theme = useAuthStore((s) => s.theme);
  const setTheme = useAuthStore((s) => s.setTheme);
  const logout = useAuthStore((s) => s.logout);

  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [leaveRemaining, setLeaveRemaining] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);

  useEffect(() => {
    biometricService.isAvailable().then(({ available, biometryType }) => {
      if (available) setBiometricLabel(biometricService.labelFor(biometryType));
    });
  }, []);

  const loadStats = useCallback(async () => {
    if (!employee?.name) return;
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    try {
      const balance = await leaveApi.getLeaveDetails(employee.name, todayIso);
      // Sum sisa cuti semua tipe (Frappe HR balikin per leave_type).
      const total = Object.values(balance).reduce(
        (acc, b) => acc + (Number(b.leave_balance) || 0),
        0,
      );
      setLeaveRemaining(total);
    } catch {
      // Silent — kalau gagal, statistik tetap "—".
    }
    try {
      const records = await attendanceApi.listByMonth(
        employee.name,
        today.getFullYear(),
        today.getMonth() + 1,
      );
      setAttendanceRate(calcAttendanceRate(records));
    } catch {
      // Silent
    }
  }, [employee?.name]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleBiometric = async (next: boolean) => {
    if (!next) {
      setBiometricEnabled(false);
      return;
    }
    const { success } = await biometricService.prompt(
      'Konfirmasi untuk mengaktifkan login biometrik',
    );
    if (success) {
      setBiometricEnabled(true);
    } else {
      Alert.alert('Gagal', 'Konfirmasi biometrik dibatalkan.');
    }
  };

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
                <Text style={[styles.statValue, { color: tokens.color.green300 }]}>
                  {leaveRemaining !== null ? leaveRemaining : '—'}
                </Text>
                <Text style={styles.statLabel}>Sisa cuti</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxMid]}>
                <Text style={[styles.statValue, { color: tokens.color.yellow300 }]}>—</Text>
                <Text style={styles.statLabel}>Lembur (jam)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: tokens.color.blue300 }]}>
                  {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                </Text>
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
            label="Riwayat Presensi"
            hint="Kalender per bulan"
            onPress={() => parent.navigate('MyAttendance')}
          />
          {biometricLabel ? (
            <View style={menuStyles.biometricRow}>
              <Fingerprint size={20} color={tokens.semantic.brand} />
              <View style={menuStyles.text}>
                <Text style={menuStyles.label}>Login Biometrik</Text>
                <Text style={menuStyles.hint}>{biometricLabel}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: tokens.color.ink200, true: tokens.color.green500 }}
              />
            </View>
          ) : null}
          <MenuRow
            icon={<Globe2 size={20} color={tokens.semantic.fg2} />}
            label="Bahasa"
            hint={language === 'en' ? 'English' : 'Bahasa Indonesia'}
            onPress={() => setLangSheetOpen(true)}
          />
          <MenuRow
            icon={<Palette size={20} color={THEMES[theme].brand} />}
            label="Tema Warna"
            hint={`${THEMES[theme].label} · butuh restart`}
            onPress={() => setThemeSheetOpen(true)}
          />
          <MenuRow
            icon={<Info size={20} color={tokens.semantic.fg2} />}
            label="Tentang Aplikasi"
            hint="Informasi & versi"
            onPress={() => parent.navigate('About')}
          />
        </View>

        <BottomSheet
          visible={langSheetOpen}
          title="Pilih Bahasa"
          onClose={() => setLangSheetOpen(false)}
        >
          <Pressable
            onPress={() => {
              setLanguage('id');
              setLangSheetOpen(false);
            }}
            style={({ pressed }) => [langStyles.row, pressed && langStyles.rowPressed]}
          >
            <Text style={[langStyles.label, language === 'id' && langStyles.labelActive]}>
              🇮🇩  Bahasa Indonesia
            </Text>
            {language === 'id' ? <Text style={langStyles.check}>✓</Text> : null}
          </Pressable>
          <Pressable
            onPress={() => {
              setLanguage('en');
              setLangSheetOpen(false);
            }}
            style={({ pressed }) => [langStyles.row, pressed && langStyles.rowPressed]}
          >
            <Text style={[langStyles.label, language === 'en' && langStyles.labelActive]}>
              🇬🇧  English
            </Text>
            {language === 'en' ? <Text style={langStyles.check}>✓</Text> : null}
          </Pressable>
          <Text style={langStyles.note}>
            Catatan: terjemahan English masih dalam pengembangan; sebagian teks
            UI mungkin tetap Bahasa Indonesia.
          </Text>
        </BottomSheet>

        <BottomSheet
          visible={themeSheetOpen}
          title="Pilih Tema Warna"
          onClose={() => setThemeSheetOpen(false)}
        >
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const t = THEMES[key];
            const active = key === theme;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setTheme(key);
                  setThemeSheetOpen(false);
                  Alert.alert(
                    'Restart Aplikasi',
                    'Tutup dan buka aplikasi untuk menerapkan tema baru.',
                  );
                }}
                style={({ pressed }) => [themeStyles.row, pressed && themeStyles.rowPressed]}
              >
                <View style={[themeStyles.swatch, { backgroundColor: t.brand }]} />
                <Text style={[themeStyles.label, active && themeStyles.labelActive]}>
                  {t.label}
                </Text>
                {active ? <Text style={themeStyles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
          <Text style={langStyles.note}>
            Ganti tema membutuhkan tutup-buka aplikasi untuk berlaku penuh.
          </Text>
        </BottomSheet>

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

        <Text style={styles.version}>{getFullLabel()}</Text>
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

const themeStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp3,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  rowPressed: { backgroundColor: tokens.semantic.surface2 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: tokens.semantic.line,
  },
  label: { flex: 1, fontSize: tokens.fontSize.body, color: tokens.semantic.fg1 },
  labelActive: { fontWeight: '700', color: tokens.semantic.brand },
  check: { fontSize: 18, color: tokens.semantic.brand, fontWeight: '700' },
});

const langStyles = StyleSheet.create({
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
  labelActive: { fontWeight: '700', color: tokens.semantic.brand },
  check: { fontSize: 18, color: tokens.semantic.brand, fontWeight: '700' },
  note: {
    marginTop: tokens.spacing.sp3,
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontStyle: 'italic',
    lineHeight: tokens.lineHeight.small,
  },
});

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
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp3,
    paddingHorizontal: tokens.spacing.sp3,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
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
    gap: tokens.spacing.sp1_5,
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
    gap: tokens.spacing.sp1,
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
    gap: tokens.spacing.sp1,
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
