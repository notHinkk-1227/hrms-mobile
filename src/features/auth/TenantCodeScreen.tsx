import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Globe } from 'lucide-react-native';
import { AuthFooter } from '@shared/components/AuthFooter';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { TextField } from '@shared/components/TextField';
import { tokens } from '@shared/theme/tokens';
import { getHost } from '@shared/utils/url';
import {
  resolveTenantCode,
  ResolveErrorCode,
  ResolveTenantResponse,
} from '@infrastructure/api/controllerClient';
import { getDeviceId } from '@infrastructure/device/deviceInfo';
import { ApiError } from '@infrastructure/api/errors';
import { env } from '@config/env';
import { APP_ID } from '@config/appInfo';
import { useAuthStore } from './store';
import type { AuthStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'TenantCode'>;

const TENANT_CODE_REGEX = /^[A-Z0-9]{4,12}$/;

const ERROR_MESSAGES: Record<ResolveErrorCode, string> = {
  missing_parameter: 'Kode tenant dan ID perangkat wajib diisi.',
  invalid_code: 'Kode tenant tidak ditemukan. Periksa kembali kode dari HR.',
  disabled: 'Akses tenant sedang dinonaktifkan. Hubungi admin perusahaan Anda.',
  expired: 'Kode tenant sudah kadaluarsa. Hubungi admin untuk perpanjangan.',
  app_not_allowed:
    'Aplikasi HRMS belum diizinkan untuk tenant ini. Hubungi HR untuk aktivasi.',
  quota_exceeded:
    'Kuota perangkat tenant ini sudah penuh. Hubungi admin untuk mencabut perangkat lama.',
  device_revoked:
    'Perangkat ini sudah dicabut aksesnya oleh admin. Hubungi HR untuk binding ulang.',
  server_error: 'Server bermasalah. Coba lagi dalam beberapa saat.',
};

interface ResolvedTenant {
  code: string;
  url: string;
  name: string;
}

export function TenantCodeScreen({ navigation }: Props): React.JSX.Element {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<ResolvedTenant | null>(null);
  const [debugTaps, setDebugTaps] = useState(0);
  const setTenant = useAuthStore((s) => s.setTenant);

  const onSubmit = async () => {
    setError(null);
    setResolved(null);
    if (!TENANT_CODE_REGEX.test(code)) {
      setError('Kode tenant 4-12 karakter, huruf besar atau angka');
      return;
    }
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const result: ResolveTenantResponse = await resolveTenantCode(code, deviceId);
      if (!result?.ok || !result.url) {
        const friendly = result?.error_code ? ERROR_MESSAGES[result.error_code] : null;
        setError(friendly ?? result?.message ?? 'Kode tenant tidak ditemukan');
        return;
      }
      setResolved({
        code: result.code ?? code,
        url: result.url,
        name: result.tenant_name ?? code,
      });
    } catch (e) {
      const apiError = e as ApiError;
      if (apiError.kind === 'network') {
        setError('Tidak ada koneksi — periksa jaringan');
      } else if (apiError.kind === 'timeout') {
        setError('Server lama merespons. Coba lagi.');
      } else {
        setError(apiError.message || 'Gagal menghubungi server');
      }
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = () => {
    if (!resolved) return;
    setTenant(resolved);
    navigation.replace('Login');
  };

  const onChangeCode = () => {
    setResolved(null);
    setCode('');
    setError(null);
  };

  const onDebugTap = () => {
    const next = debugTaps + 1;
    setDebugTaps(next);
    if (next >= 5) {
      setDebugTaps(0);
      Alert.alert(
        'Debug Info',
        `Controller URL:\n${env.controllerUrl}\n\n` +
          `Endpoint:\n/api/method/sopwer_controller.api.resolve_tenant_code\n\n` +
          `App ID:\n${APP_ID}\n\n` +
          (resolved
            ? `Resolved tenant:\n• Name: ${resolved.name}\n• Code: ${resolved.code}\n• Full URL: ${resolved.url}\n• Host: ${getHost(resolved.url)}`
            : 'Belum ada tenant resolved.'),
      );
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow} onPress={onDebugTap} suppressHighlighting>
          LANGKAH 1 DARI 2
        </Text>
        <Text style={styles.title}>Masukkan Kode Tenant</Text>
        <Text style={styles.body}>
          Kode tenant diberikan oleh HR perusahaan Anda. Kode ini menentukan server perusahaan Anda.
        </Text>
      </View>

      {resolved ? (
        <View style={styles.successCard}>
          <View style={styles.successRow}>
            <CheckCircle2 size={24} color={tokens.color.green500} />
            <Text style={styles.successTitle}>Tenant ditemukan</Text>
          </View>
          <Text style={styles.tenantName}>{resolved.name}</Text>
          <View style={styles.urlRow}>
            <Globe size={14} color={tokens.semantic.fg3} />
            <Text style={styles.urlText} numberOfLines={1}>
              {getHost(resolved.url)}
            </Text>
          </View>
          <Text style={styles.tenantCode}>Kode: {resolved.code}</Text>
          <View style={styles.successActions}>
            <Button fullWidth onPress={onConfirm}>
              Lanjut ke Login
            </Button>
            <Button variant="ghost" fullWidth onPress={onChangeCode}>
              Ganti Kode
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="Kode Tenant"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
            placeholder="Contoh: 78AB41"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={12}
            error={error ?? undefined}
            hint={!error ? '4-12 karakter, huruf besar atau angka' : undefined}
          />
          <Button fullWidth onPress={onSubmit} loading={loading} disabled={!code}>
            Lanjut
          </Button>
        </View>
      )}

      <Text style={styles.controllerHint}>Server: {getHost(env.controllerUrl)}</Text>
      <AuthFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.sp2, marginBottom: tokens.spacing.sp5 },
  eyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  body: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3, lineHeight: 22 },
  form: { gap: tokens.spacing.sp3 },
  successCard: {
    padding: tokens.spacing.sp4,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.green50,
    borderWidth: 1,
    borderColor: tokens.color.green200,
    gap: tokens.spacing.sp2,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    marginBottom: tokens.spacing.sp1,
  },
  successTitle: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.color.green700,
  },
  tenantName: {
    fontSize: tokens.fontSize.h2,
    fontWeight: '800',
    color: tokens.semantic.fg1,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1,
  },
  urlText: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg2,
    fontFamily: tokens.font.mono,
    flex: 1,
  },
  tenantCode: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    fontFamily: tokens.font.mono,
  },
  successActions: {
    marginTop: tokens.spacing.sp3,
    gap: tokens.spacing.sp2,
  },
  controllerHint: {
    marginTop: 'auto',
    paddingTop: tokens.spacing.sp4,
    fontSize: tokens.fontSize.caption,
    color: tokens.color.ink300,
    fontFamily: tokens.font.mono,
    textAlign: 'center',
  },
});
