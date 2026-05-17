import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, Globe } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { TextField } from '@shared/components/TextField';
import { tokens } from '@shared/theme/tokens';
import { getHost } from '@shared/utils/url';
import { env } from '@config/env';
import { login } from './authService';
import { isLocked, recordFailedAttempt } from './loginGuard';
import { useAuthStore } from './store';
import type { AuthStackParamList } from '@app/navigation/types';
import { ApiError } from '@infrastructure/api/errors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      <View style={styles.header}>
        <Text style={styles.eyebrow} onPress={onDebugTap} suppressHighlighting>
          LANGKAH 2 DARI 2
        </Text>
        <Text style={styles.title}>Masuk</Text>
      </View>

      {tenantName ? (
        <View style={styles.tenantCard}>
          <View style={styles.tenantRow}>
            <Building2 size={18} color={tokens.semantic.brand} />
            <Text style={styles.tenantName}>{tenantName}</Text>
          </View>
          <View style={styles.tenantUrlRow}>
            <Globe size={12} color={tokens.semantic.fg3} />
            <Text style={styles.tenantHost} numberOfLines={1}>
              {getHost(tenantUrl)}
            </Text>
            {tenantCode ? <Text style={styles.tenantCodeChip}>{tenantCode}</Text> : null}
          </View>
        </View>
      ) : null}

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
        <Button fullWidth onPress={onSubmit} loading={loading} disabled={!email || !password}>
          Masuk
        </Button>
        <Button variant="ghost" fullWidth onPress={clearTenant} disabled={loading}>
          Ganti Kode Tenant
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.sp2, marginBottom: tokens.spacing.sp4 },
  eyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  tenantCard: {
    padding: tokens.spacing.sp3,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.blue50,
    borderWidth: 1,
    borderColor: tokens.color.blue100,
    marginBottom: tokens.spacing.sp4,
    gap: tokens.spacing.sp1_5,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
  },
  tenantName: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    flex: 1,
  },
  tenantUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1,
  },
  tenantHost: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    fontFamily: tokens.font.mono,
    flex: 1,
  },
  tenantCodeChip: {
    fontSize: tokens.fontSize.caption,
    color: tokens.color.blue700,
    fontFamily: tokens.font.mono,
    fontWeight: '700',
    backgroundColor: tokens.color.blue100,
    paddingHorizontal: tokens.spacing.sp2,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  form: { gap: tokens.spacing.sp3 },
  formError: {
    fontSize: tokens.fontSize.small,
    color: tokens.color.error,
    padding: tokens.spacing.sp2,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.sm,
  },
});
