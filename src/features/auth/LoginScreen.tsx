import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Fingerprint, Globe, Repeat } from 'lucide-react-native';
import { AuthFooter } from '@shared/components/AuthFooter';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { TextField } from '@shared/components/TextField';
import { tokens } from '@shared/theme/tokens';
import { getHost } from '@shared/utils/url';
import { env } from '@config/env';
import { biometricService } from '@infrastructure/biometric/biometricService';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import type { Employee } from '@domain/entities/employee';
import { login } from './authService';
import { isLocked, recordFailedAttempt } from './loginGuard';
import { useAuthStore } from './store';
import type { AuthStackParamList } from '@app/navigation/types';
import { ApiError } from '@infrastructure/api/errors';

interface BiometricSession {
  user: string;
  apiKey: string;
  apiSecret: string;
  employee: Employee;
}

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tampilkan host dengan 5 karakter awal jelas, sisanya di-mask dengan bullet.
 * Tujuan: user tetap bisa kenali tenant-nya (5 char prefix biasanya cukup)
 * tanpa expose full URL backend di layar login. Contoh: hrmsori.sopwer.my.id
 * → "hrmso••••••••••••••".
 */
function maskHost(url: string | null | undefined): string {
  if (!url) return '';
  const host = getHost(url);
  if (!host) return '';
  if (host.length <= 5) return host;
  const prefix = host.slice(0, 5);
  const masked = '•'.repeat(host.length - 5);
  return `${prefix}${masked}`;
}

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugTaps, setDebugTaps] = useState(0);

  const tenantName = useAuthStore((s) => s.tenantName);
  const tenantUrl = useAuthStore((s) => s.tenantUrl);
  const tenantCode = useAuthStore((s) => s.tenantCode);
  const setLogin = useAuthStore((s) => s.login);
  const clearTenant = useAuthStore((s) => s.clearTenant);
  const privacyAccepted = useAuthStore((s) => s.privacyAccepted);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);

  const [bioSession, setBioSession] = useState<BiometricSession | null>(null);
  const [bioLabel, setBioLabel] = useState<string | null>(null);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    // Tampilkan icon button kapanpun device support biometric — supaya user
    // tahu fitur ada. Aksi-nya beda kalau session belum tersimpan.
    biometricService.isAvailable().then(({ available, biometryType }) => {
      if (!available) return;
      setBioLabel(biometricService.labelFor(biometryType));
      if (biometricEnabled) {
        const saved = persist.getObject<BiometricSession>(StorageKeys.BIOMETRIC_SESSION);
        if (saved) setBioSession(saved);
      }
    });
  }, [biometricEnabled]);

  const onChangeTenant = () => {
    Alert.alert(
      'Ganti Kode Tenant?',
      'Anda akan kembali ke halaman input kode tenant. Pengaturan akun di tenant ini tidak terpengaruh.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ganti',
          style: 'destructive',
          onPress: () => {
            clearTenant();
            // pickInitialRoute di AuthStack dievaluasi sekali saat mount, jadi
            // perlu navigasi explicit ke TenantCode supaya UI sinkron dengan state.
            navigation.replace('TenantCode');
          },
        },
      ],
    );
  };

  const onBiometricLogin = async () => {
    if (!bioSession) return;
    setBioBusy(true);
    try {
      const { success } = await biometricService.prompt(
        `Login sebagai ${bioSession.user}`,
      );
      if (!success) return;
      setLogin({
        user: bioSession.user,
        apiKey: bioSession.apiKey,
        apiSecret: bioSession.apiSecret,
        employee: bioSession.employee,
      });
    } finally {
      setBioBusy(false);
    }
  };

  const onSubmit = async () => {
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);

    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Email tidak valid');
      return;
    }
    if (password.length < 4) {
      setPasswordError('Password minimal 4 karakter');
      return;
    }

    const lock = isLocked();
    if (lock.locked) {
      const seconds = Math.ceil(lock.remainingMs / 1000);
      setFormError(`Terlalu banyak percobaan. Coba lagi dalam ${seconds} detik.`);
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      // Phase 1: session cookie auth (no api key/secret yet). Placeholder strings.
      setLogin({
        user: result.user,
        apiKey: '',
        apiSecret: '',
        employee: result.employee,
      });
      // Refresh biometric session di MMKV kalau biometric sudah enabled —
      // supaya logout/relaunch berikutnya bisa pakai biometric login.
      useAuthStore.getState().saveBiometricSession();

      // Opt-in biometric login setelah sukses, kalau device support + belum enabled
      const { available } = await biometricService.isAvailable();
      const alreadyEnabled = useAuthStore.getState().biometricEnabled;
      if (available && !alreadyEnabled) {
        Alert.alert(
          'Aktifkan Login Biometrik?',
          'Buka aplikasi lebih cepat dengan sidik jari atau wajah tanpa perlu input password.',
          [
            { text: 'Nanti', style: 'cancel' },
            {
              text: 'Aktifkan',
              onPress: async () => {
                const { success } = await biometricService.prompt('Konfirmasi biometrik');
                if (success) {
                  useAuthStore.getState().setBiometricEnabled(true);
                }
              },
            },
          ],
        );
      }
      if (!privacyAccepted) {
        navigation.replace('Privacy');
      }
      // RootNavigator auto-switch ke MainTabs setelah isAuthenticated + privacyAccepted
    } catch (e) {
      const apiError = e as ApiError;
      if (apiError.kind === 'unauthorized') {
        const lockResult = recordFailedAttempt();
        if (lockResult.locked) {
          setFormError(`Login dikunci ${Math.ceil(lockResult.remainingMs / 1000)} detik karena 7x gagal.`);
        } else {
          setPasswordError('Email atau password salah');
        }
      } else if (apiError.kind === 'not_found') {
        setFormError(apiError.message);
      } else if (apiError.kind === 'network') {
        setFormError('Tidak ada koneksi — periksa jaringan');
      } else {
        setFormError(apiError.message || 'Gagal masuk');
      }
    } finally {
      setLoading(false);
    }
  };

  const onDebugTap = () => {
    const next = debugTaps + 1;
    setDebugTaps(next);
    if (next >= 5) {
      setDebugTaps(0);
      Alert.alert(
        'Debug Info',
        `Controller URL:\n${env.controllerUrl}\n\n` +
          `Tenant:\n• Name: ${tenantName ?? '—'}\n• Code: ${tenantCode ?? '—'}\n• Full URL: ${tenantUrl ?? '—'}\n• Host: ${getHost(tenantUrl)}\n\n` +
          `Endpoint login:\n${tenantUrl ?? '?'}/api/method/login`,
      );
    }
  };

  return (
    <Screen>
      <View style={styles.brandHeader}>
        <Pressable onPress={onDebugTap}>
          <Image
            source={require('@shared/assets/brand/logo-full.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Hadir by Sopwer"
          />
        </Pressable>
        {tenantName ? (
          <Text style={styles.tenantName} numberOfLines={1}>
            {tenantName}
          </Text>
        ) : null}
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="nama@perusahaan.id"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          error={emailError ?? undefined}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password Anda"
          secureTextEntry
          toggleSecure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          error={passwordError ?? undefined}
        />
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <View style={styles.submitRow}>
          <View style={styles.submitMain}>
            <Button fullWidth onPress={onSubmit} loading={loading} disabled={!email || !password}>
              Masuk
            </Button>
          </View>
          {bioLabel ? (
            <Pressable
              onPress={
                bioSession
                  ? onBiometricLogin
                  : () =>
                      Alert.alert(
                        'Login Biometrik',
                        'Aktifkan dulu di Profil → Login Biometrik setelah masuk pertama kali.',
                      )
              }
              disabled={bioBusy}
              style={({ pressed }) => [
                styles.bioIconBtn,
                pressed && styles.bioIconBtnPressed,
                bioBusy && styles.bioBtnDisabled,
                !bioSession && styles.bioIconBtnInactive,
              ]}
              accessibilityLabel={`Masuk dengan ${bioLabel}`}
            >
              <Fingerprint
                size={24}
                color={bioSession ? tokens.color.white : tokens.semantic.fg3}
              />
            </Pressable>
          ) : null}
        </View>

        {tenantUrl ? (
          <View style={styles.tenantFooter}>
            <View style={styles.tenantUrlRow}>
              <Globe size={12} color={tokens.semantic.fg3} />
              <Text style={styles.tenantHost} numberOfLines={1}>
                {maskHost(tenantUrl)}
              </Text>
              <Pressable
                onPress={onChangeTenant}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.changeTenantIcon,
                  pressed && styles.changeTenantIconPressed,
                ]}
                accessibilityLabel="Ganti Kode Tenant"
              >
                <Repeat size={14} color={tokens.semantic.fg3} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
      <AuthFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    marginBottom: tokens.spacing.sp4,
  },
  logo: {
    width: 200,
    height: 64,
  },
  tenantName: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    textAlign: 'center',
  },
  tenantFooter: {
    marginTop: tokens.spacing.sp3,
    alignItems: 'center',
  },
  tenantUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1_5,
  },
  tenantHost: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    fontFamily: tokens.font.mono,
  },
  changeTenantIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.semantic.surface2,
  },
  changeTenantIconPressed: {
    opacity: 0.6,
  },
  form: { gap: tokens.spacing.sp3 },
  submitRow: { flexDirection: 'row', gap: tokens.spacing.sp2, alignItems: 'stretch' },
  submitMain: { flex: 1 },
  bioIconBtn: {
    width: 52,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.semantic.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioIconBtnPressed: { opacity: 0.85 },
  bioIconBtnInactive: {
    backgroundColor: tokens.semantic.surface2,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  bioBtnDisabled: { opacity: 0.5 },
  formError: {
    fontSize: tokens.fontSize.small,
    color: tokens.color.error,
    padding: tokens.spacing.sp2,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.sm,
  },
});
