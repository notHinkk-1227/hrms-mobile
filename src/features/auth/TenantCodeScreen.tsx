import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { TextField } from '@shared/components/TextField';
import { tokens } from '@shared/theme/tokens';
import { resolveTenantCode } from '@infrastructure/api/controllerClient';
import { getDeviceId } from '@infrastructure/device/deviceInfo';
import { ApiError } from '@infrastructure/api/errors';
import { useAuthStore } from './store';
import type { AuthStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'TenantCode'>;

const TENANT_CODE_REGEX = /^[A-Z0-9]{4,12}$/;

export function TenantCodeScreen({ navigation }: Props): React.JSX.Element {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setTenant = useAuthStore((s) => s.setTenant);

  const onSubmit = async () => {
    setError(null);
    if (!TENANT_CODE_REGEX.test(code)) {
      setError('Kode tenant 4-12 karakter, huruf besar atau angka');
      return;
    }
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const result = await resolveTenantCode(code, deviceId);
      if (!result?.ok || !result.url) {
        setError(result?.message || 'Kode tenant tidak ditemukan');
        return;
      }
      setTenant({ code: result.code ?? code, url: result.url, name: result.tenant_name ?? code });
      navigation.replace('Login');
    } catch (e) {
      const apiError = e as ApiError;
      if (apiError.kind === 'not_found') {
        setError('Kode tenant tidak ditemukan');
      } else if (apiError.kind === 'network') {
        setError('Tidak ada koneksi — periksa jaringan');
      } else if (apiError.kind === 'server') {
        setError('Server bermasalah — coba lagi');
      } else {
        setError(apiError.message || 'Gagal menghubungi server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LANGKAH 1 DARI 2</Text>
        <Text style={styles.title}>Masukkan Kode Tenant</Text>
        <Text style={styles.body}>
          Kode tenant diberikan oleh HR perusahaan Anda. Kode ini menentukan server perusahaan Anda.
        </Text>
      </View>
      <View style={styles.form}>
        <TextField
          label="Kode Tenant"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
          placeholder="Contoh: SYAMANAH"
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
  title: {
    fontSize: tokens.fontSize.h1,
    fontWeight: '800',
    color: tokens.semantic.fg1,
  },
  body: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg3,
    lineHeight: 22,
  },
  form: { gap: tokens.spacing.sp3 },
});
