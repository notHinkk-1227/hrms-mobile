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
import { loadTensorflowModel } from 'react-native-fast-tflite';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { Skia } from '@shopify/react-native-skia';
import { livenessService } from '@infrastructure/liveness/livenessService';

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
  const [antiSpoofRows, setAntiSpoofRows] = useState<Row[]>([]);
  const [antiSpoofTesting, setAntiSpoofTesting] = useState(false);
  const [livenessRows, setLivenessRows] = useState<Row[]>([]);
  const [livenessTesting, setLivenessTesting] = useState(false);

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

  async function runAntiSpoofSmokeTest() {
    setAntiSpoofTesting(true);
    const results: Row[] = [];

    // --- Tes 1: load model v2 (scale 2.7) ---
    let modelV2: Awaited<ReturnType<typeof loadTensorflowModel>> | null = null;
    try {
      modelV2 = await loadTensorflowModel(
        require('@shared/assets/models/anti-spoof-minifasnet-v2.tflite'),
        [], // delegate kosong = default CPU (XNNPACK)
      );
      const shape = modelV2.inputs[0]?.shape?.join('x') ?? '?';
      results.push({
        label: 'Model v2 loaded',
        value: `OK, input shape [${shape}]`,
        ok: shape === '1x80x80x3',
      });
    } catch (e) {
      results.push({
        label: 'Model v2 loaded',
        value: `GAGAL: ${e instanceof Error ? e.message : String(e)}`,
        ok: false,
      });
    }

    // --- Tes 2: load model v1se (scale 4.0) ---
    let modelV1se: Awaited<ReturnType<typeof loadTensorflowModel>> | null = null;
    try {
      modelV1se = await loadTensorflowModel(
        require('@shared/assets/models/anti-spoof-minifasnet-v1se.tflite'),
        [],
      );
      const shape = modelV1se.inputs[0]?.shape?.join('x') ?? '?';
      results.push({
        label: 'Model v1se loaded',
        value: `OK, input shape [${shape}]`,
        ok: shape === '1x80x80x3',
      });
    } catch (e) {
      results.push({
        label: 'Model v1se loaded',
        value: `GAGAL: ${e instanceof Error ? e.message : String(e)}`,
        ok: false,
      });
    }

    // --- Tes 3: jalankan inference dummy (paling penting -- di sinilah
    // native crash paling mungkin terjadi kalau ada masalah linking Nitro) ---
    if (modelV2) {
      try {
        // Input harus ArrayBuffer (bukan TypedArray langsung) -- ambil
        // .buffer dari Float32Array, sesuai API resmi react-native-fast-tflite.
        const dummyInput = new Float32Array(1 * 80 * 80 * 3).fill(128).buffer;
        const start = Date.now();
        const output = await modelV2.run([dummyInput]);
        const elapsedMs = Date.now() - start;
        const outLength = new Float32Array(output[0]).length;
        results.push({
          label: 'Inference dummy (model v2)',
          value: `OK, output length=${outLength}, ${elapsedMs}ms`,
          ok: outLength === 3,
        });
      } catch (e) {
        results.push({
          label: 'Inference dummy (model v2)',
          value: `GAGAL: ${e instanceof Error ? e.message : String(e)}`,
          ok: false,
        });
      }
    }

    // --- Tes 4: pastikan modul native ML Kit Face Detection ke-link ---
    // (bukan tes fungsional -- itu baru divalidasi di Fase 6 dengan foto asli)
    try {
      const isLinked = typeof FaceDetection?.detect === 'function';
      results.push({
        label: 'ML Kit Face Detection linked',
        value: isLinked ? 'OK, modul native terdeteksi' : 'GAGAL: modul undefined',
        ok: isLinked,
      });
    } catch (e) {
      results.push({
        label: 'ML Kit Face Detection linked',
        value: `GAGAL: ${e instanceof Error ? e.message : String(e)}`,
        ok: false,
      });
    }

    setAntiSpoofRows(results);
    setAntiSpoofTesting(false);
  }

  async function runLivenessSmokeTest() {
    setLivenessTesting(true);
    const results: Row[] = [];

    // --- Tes 1: pastikan Skia ke-link (buat surface kecil, snapshot, baca pixel) ---
    try {
      const surface = Skia.Surface.Make(10, 10);
      if (!surface) throw new Error('Skia.Surface.Make return null');
      const canvas = surface.getCanvas();
      const paint = Skia.Paint();
      paint.setColor(Skia.Color('red'));
      canvas.drawRect({ x: 0, y: 0, width: 10, height: 10 }, paint);
      const pixels = surface.makeImageSnapshot().readPixels() as Uint8Array | null;
      const firstPixelRed = pixels ? pixels[0] : -1;
      results.push({
        label: 'Skia linked',
        value: `OK, pixel merah R=${firstPixelRed} (harus ~255)`,
        ok: firstPixelRed > 200,
      });
    } catch (e) {
      results.push({
        label: 'Skia linked',
        value: `GAGAL: ${e instanceof Error ? e.message : String(e)}`,
        ok: false,
      });
    }

    // --- Tes 2: preload livenessService (load 2 model + cek isReady) ---
    try {
      const start = Date.now();
      await livenessService.preload();
      const elapsedMs = Date.now() - start;
      const ready = livenessService.isReady();
      results.push({
        label: 'livenessService.preload()',
        value: ready ? `OK, isReady=true, ${elapsedMs}ms` : 'GAGAL: isReady=false setelah preload',
        ok: ready,
      });
    } catch (e) {
      results.push({
        label: 'livenessService.preload()',
        value: `GAGAL: ${e instanceof Error ? e.message : String(e)}`,
        ok: false,
      });
    }

    results.push({
      label: 'Catatan',
      value:
        'Tes checkLiveness() dengan foto asli baru bisa divalidasi penuh di Fase 6 ' +
        '(setelah wiring ke ClockInCameraScreen) -- butuh foto selfie nyata, bukan dummy.',
      ok: undefined,
    });

    setLivenessRows(results);
    setLivenessTesting(false);
  }

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

        <Pressable
          onPress={runAntiSpoofSmokeTest}
          disabled={antiSpoofTesting}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.btnPressed,
            antiSpoofTesting && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.btnTextSecondary}>
            {antiSpoofTesting ? 'Testing...' : 'Test Model Anti-Spoofing (Fase 2)'}
          </Text>
        </Pressable>

        {antiSpoofRows.length > 0 && (
          <View style={styles.card}>
            {antiSpoofRows.map((row, i) => (
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
        )}

        <Pressable
          onPress={runLivenessSmokeTest}
          disabled={livenessTesting}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.btnPressed,
            livenessTesting && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.btnTextSecondary}>
            {livenessTesting ? 'Testing...' : 'Test Skia + livenessService (Fase 4)'}
          </Text>
        </Pressable>

        {livenessRows.length > 0 && (
          <View style={styles.card}>
            {livenessRows.map((row, i) => (
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
        )}

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