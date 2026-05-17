import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@shared/components/Screen';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import { realtimeService } from '@infrastructure/realtime/realtimeService';
import { notificationsApi } from '@infrastructure/api/notificationsClient';
import { useFeaturesStore } from '@infrastructure/api/featureDetect';
import { biometricService } from '@infrastructure/biometric/biometricService';
import { getFullLabel } from '@config/appInfo';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Debug'>;

interface Row {
  label: string;
  value: string;
  ok?: boolean;
}

export function DebugScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const tenantUrl = useAuthStore((s) => s.tenantUrl);
  const tenantName = useAuthStore((s) => s.tenantName);
  const tenantCode = useAuthStore((s) => s.tenantCode);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const features = useFeaturesStore((s) => s.features);
  const refreshFeatures = useFeaturesStore((s) => s.refresh);
  const language = useAuthStore((s) => s.language);
  const theme = useAuthStore((s) => s.theme);

  const [bioAvailable, setBioAvailable] = useState<string>('checking...');
  const [bioSessionExists, setBioSessionExists] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<string>('-');
  const [rtConnected, setRtConnected] = useState<boolean>(realtimeService.isConnected());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    biometricService.isAvailable().then((r) => {
      setBioAvailable(
        r.available
          ? `available (${biometricService.labelFor(r.biometryType)})`
          : 'not available',
      );
    });
    setBioSessionExists(!!persist.getObject(StorageKeys.BIOMETRIC_SESSION));
  }, [tick]);

  useEffect(() => {
    const userId = employee?.user_id;
    if (!userId) return;
    notificationsApi
      .countUnread(userId)
      .then((n) => setUnreadCount(String(n)))
      .catch((e) => setUnreadCount(`ERROR: ${e instanceof Error ? e.message : String(e)}`));
  }, [employee?.user_id, tick]);

  useEffect(() => {
    return realtimeService.subscribe((event) => {
      if (event.type === 'connected') setRtConnected(true);
      else if (event.type === 'disconnected') setRtConnected(false);
    });
  }, []);

  const apiKey = persist.getString(StorageKeys.AUTH_API_KEY);
  const apiSecret = persist.getString(StorageKeys.AUTH_API_SECRET);

  const rows: Row[] = [
    { label: 'App version', value: getFullLabel() },
    { label: 'Tenant URL', value: tenantUrl ?? '(none)', ok: !!tenantUrl },
    { label: 'Tenant Name', value: tenantName ?? '(none)' },
    { label: 'Tenant Code', value: tenantCode ?? '(none)' },
    { label: 'User', value: user ?? '(none)', ok: !!user },
    { label: 'Employee', value: employee?.name ?? '(none)' },
    { label: 'Employee user_id', value: employee?.user_id ?? '(none)' },
    { label: 'API Key set', value: apiKey ? 'yes' : 'no (session cookie auth)', ok: true },
    { label: 'API Secret set', value: apiSecret ? 'yes' : 'no', ok: true },
    { label: 'Biometric enabled', value: String(biometricEnabled), ok: biometricEnabled },
    { label: 'Biometric available', value: bioAvailable },
    { label: 'BIOMETRIC_SESSION ada di MMKV', value: bioSessionExists ? 'YES' : 'NO', ok: bioSessionExists },
    { label: 'Language', value: language },
    { label: 'Theme', value: theme },
    { label: 'Unread notif (live fetch)', value: unreadCount },
    { label: 'Realtime socket.io connected', value: rtConnected ? 'YES' : 'NO', ok: rtConnected },
    {
      label: 'Backend mode',
      value: features.hasSopwerHrms
        ? `Enhanced (sopwer_hrms v${features.version ?? '?'})`
        : 'Standard (vanilla Frappe HR)',
      ok: features.hasSopwerHrms,
    },
    ...(features.hasSopwerHrms
      ? [
          {
            label: 'Backend features',
            value: [
              features.geofence ? 'geofence' : '',
              features.selfieRequired ? 'selfie_required' : '',
              features.antiTamper ? 'anti_tamper' : '',
              features.timeWindow ? 'time_window' : '',
              features.deviceBinding ? 'device_binding' : '',
              features.scoring ? 'scoring' : '',
            ]
              .filter(Boolean)
              .join(', ') || '(none)',
          },
          {
            label: 'Geofence radius default',
            value: `${features.geofenceDefaultRadiusM} m`,
          },
        ]
      : []),
  ];

  return (
    <Screen>
      <FormHeader title="Debug Info" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{row.label}</Text>
              <Text
                style={[
                  styles.value,
                  row.ok === false && styles.valueBad,
                  row.ok === true && styles.valueGood,
                ]}
                selectable
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => setTick((t) => t + 1)}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>Refresh</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            realtimeService.disconnect();
            setTimeout(() => realtimeService.connect(), 500);
          }}
          style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnTextSecondary}>Reconnect Realtime</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            refreshFeatures(true);
          }}
          style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnTextSecondary}>Refresh Backend Features</Text>
        </Pressable>

        <Text style={styles.note}>
          Long-press versi di Tentang Aplikasi untuk buka layar ini. Semua nilai
          bisa di-copy (long-press). Gunakan untuk laporkan bug ke developer.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp3, paddingBottom: tokens.spacing.sp5 },
  card: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp2,
  },
  row: {
    paddingVertical: tokens.spacing.sp1,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
    gap: 4,
  },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  value: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg1,
  },
  valueGood: { color: tokens.color.green700 },
  valueBad: { color: tokens.color.error },
  btn: {
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.semantic.brand,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: tokens.semantic.surface,
    borderWidth: 1,
    borderColor: tokens.semantic.brand,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: tokens.color.white, fontSize: tokens.fontSize.body, fontWeight: '700' },
  btnTextSecondary: { color: tokens.semantic.brand, fontSize: tokens.fontSize.body, fontWeight: '700' },
  note: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontStyle: 'italic',
    lineHeight: tokens.lineHeight.small,
  },
});
