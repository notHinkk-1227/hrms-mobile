/**
 * Dev tool -- BUKAN bagian dari flow presensi produksi.
 *
 * Tujuan: kumpulkan banyak sampel foto berlabel (real vs beberapa jenis
 * spoof) + skor mentah dari kedua model anti-spoofing, supaya
 * LIVENESS_THRESHOLD (src/config/liveness.ts) bisa dikalibrasi ulang
 * berdasarkan data nyata (FAR/FRR), bukan cuma dites manual satu-dua kali.
 *
 * Alur pakai:
 * 1. Buka layar ini dari Debug screen.
 * 2. Pilih label sesuai jenis foto yang akan diambil (Asli / Cetak / Layar HP).
 * 3. Jempret berkali-kali untuk tiap label, idealnya bervariasi: orang
 *    berbeda, pencahayaan berbeda (indoor/outdoor), jarak berbeda, dengan
 *    & tanpa kacamata, sedikit beda sudut.
 * 4. Target MINIMAL per label: 50 sampel (lebih banyak lebih baik, terutama
 *    untuk estimasi FAR yang butuh presisi tinggi -- idealnya 100+).
 * 5. Setelah cukup banyak, tekan "Salin Data (JSON)" lalu kirim hasil salinan
 *    itu (paste as text) untuk dianalisis -- akan dihitung FAR/FRR di
 *    berbagai threshold dan direkomendasikan nilai threshold optimal.
 *
 * Data disimpan persisten di MMKV (StorageKeys.LIVENESS_CALIBRATION_SAMPLES)
 * supaya sesi pengumpulan bisa dilanjut kapan saja tanpa hilang kalau app
 * di-restart.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import type { MainStackParamList } from '@app/navigation/types';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import { livenessService, getRawLivenessScore } from '@infrastructure/liveness/livenessService';
import type { LivenessRawScore } from '@infrastructure/liveness/livenessService';

type Props = NativeStackScreenProps<MainStackParamList, 'LivenessCalibration'>;

/** Label kelas sampel -- sesuaikan/tambah sendiri kalau perlu jenis spoof lain
 * (mis. video replay terpisah dari foto statis di layar). */
const LABELS = [
  { key: 'real', title: 'Asli', hint: 'Wajah langsung di depan kamera' },
  { key: 'print', title: 'Cetak', hint: 'Foto yang dicetak di kertas/foto studio' },
  { key: 'screen', title: 'Layar HP/Tablet', hint: 'Foto atau video diputar di layar' },
] as const;
type LabelKey = (typeof LABELS)[number]['key'];

interface CalibrationSample {
  id: string;
  label: LabelKey;
  capturedAt: number;
  status: LivenessRawScore['status'];
  softmaxV2?: [number, number, number];
  softmaxV1se?: [number, number, number];
  scoreReal?: number;
}

function loadSamples(): CalibrationSample[] {
  return persist.getObject<CalibrationSample[]>(StorageKeys.LIVENESS_CALIBRATION_SAMPLES) ?? [];
}

function saveSamples(samples: CalibrationSample[]): void {
  persist.setObject(StorageKeys.LIVENESS_CALIBRATION_SAMPLES, samples);
}

export function LivenessCalibrationScreen({ navigation }: Props): React.JSX.Element {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);

  const [activeLabel, setActiveLabel] = useState<LabelKey>('real');
  const [samples, setSamples] = useState<CalibrationSample[]>(() => loadSamples());
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    livenessService.preload();
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const counts = LABELS.reduce<Record<LabelKey, number>>(
    (acc, l) => {
      acc[l.key] = samples.filter((s) => s.label === l.key).length;
      return acc;
    },
    { real: 0, print: 0, screen: 0 },
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off', enableShutterSound: false });
      const raw = await getRawLivenessScore(photo.path);
      const sample: CalibrationSample = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: activeLabel,
        capturedAt: Date.now(),
        status: raw.status,
        softmaxV2: raw.softmaxV2,
        softmaxV1se: raw.softmaxV1se,
        scoreReal: raw.scoreReal,
      };
      setSamples((prev) => {
        const next = [sample, ...prev];
        saveSamples(next);
        return next;
      });
    } catch (e) {
      Alert.alert('Gagal capture', e instanceof Error ? e.message : String(e));
    } finally {
      setCapturing(false);
    }
  }, [activeLabel, capturing]);

  const handleUndoLast = () => {
    setSamples((prev) => {
      const next = prev.slice(1);
      saveSamples(next);
      return next;
    });
  };

  const handleReset = () => {
    Alert.alert('Hapus semua data kalibrasi?', 'Tindakan ini tidak bisa dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus semua',
        style: 'destructive',
        onPress: () => {
          setSamples([]);
          persist.delete(StorageKeys.LIVENESS_CALIBRATION_SAMPLES);
        },
      },
    ]);
  };

  const handleExport = () => {
    const json = JSON.stringify(samples, null, 2);
    Clipboard.setString(json);
    Alert.alert(
      'Disalin',
      `${samples.length} sampel disalin ke clipboard sebagai JSON. Paste hasil salinan ini untuk dianalisis.`,
    );
  };

  if (!hasPermission) {
    return (
      <Screen>
        <View style={styles.permWrap}>
          <Text style={styles.permText}>Izin kamera diperlukan untuk kalibrasi.</Text>
          <Pressable style={styles.permBtn} onPress={() => requestPermission()}>
            <Text style={styles.permBtnText}>Berikan Izin</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!device) {
    return (
      <Screen>
        <View style={styles.permWrap}>
          <ActivityIndicator color={tokens.semantic.brand} />
          <Text style={styles.permText}>Mempersiapkan kamera…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} isActive photo />

      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.iconBtnText}>×</Text>
        </Pressable>
        <Text style={styles.title}>Kalibrasi Anti-Spoofing</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.labelBar}>
        {LABELS.map((l) => (
          <Pressable
            key={l.key}
            onPress={() => setActiveLabel(l.key)}
            style={[styles.labelChip, activeLabel === l.key && styles.labelChipActive]}
          >
            <Text style={[styles.labelChipText, activeLabel === l.key && styles.labelChipTextActive]}>
              {l.title} ({counts[l.key]})
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.labelHint}>{LABELS.find((l) => l.key === activeLabel)?.hint}</Text>

      <ScrollView style={styles.recentList} contentContainerStyle={styles.recentListContent}>
        {samples.slice(0, 6).map((s) => (
          <View key={s.id} style={styles.recentRow}>
            <Text style={styles.recentLabel}>{s.label}</Text>
            <Text style={styles.recentScore}>
              {s.status !== 'ok' ? s.status : `real=${s.scoreReal?.toFixed(3)}`}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.smallBtn} onPress={handleUndoLast} disabled={samples.length === 0}>
          <Text style={styles.smallBtnText}>Undo</Text>
        </Pressable>
        <Pressable
          style={[styles.shutter, capturing && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={capturing}
        >
          {capturing ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
        </Pressable>
        <Pressable style={styles.smallBtn} onPress={handleReset}>
          <Text style={styles.smallBtnText}>Reset</Text>
        </Pressable>
      </View>

      <Pressable style={styles.exportBtn} onPress={handleExport} disabled={samples.length === 0}>
        <Text style={styles.exportBtnText}>Salin Data ({samples.length} sampel, JSON)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: tokens.spacing.sp4,
    paddingBottom: tokens.spacing.sp3,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: -2 },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  labelBar: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
    paddingHorizontal: tokens.spacing.sp3,
  },
  labelChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  labelChipActive: { backgroundColor: tokens.semantic.brand, borderColor: tokens.semantic.brand },
  labelChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  labelChipTextActive: { color: '#fff' },
  labelHint: {
    position: 'absolute',
    top: 154,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  recentList: {
    position: 'absolute',
    top: 190,
    left: tokens.spacing.sp3,
    right: tokens.spacing.sp3,
    maxHeight: 140,
  },
  recentListContent: { gap: 4 },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recentLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  recentScore: { color: '#fff', fontSize: 11, fontFamily: tokens.font.mono },
  bottomBar: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: tokens.spacing.sp4,
  },
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.6 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  exportBtn: {
    position: 'absolute',
    bottom: 24,
    left: tokens.spacing.sp4,
    right: tokens.spacing.sp4,
    backgroundColor: tokens.color.green600,
    borderRadius: tokens.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  permText: { color: tokens.semantic.fg2, textAlign: 'center' },
  permBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: tokens.semantic.brand,
    borderRadius: tokens.radius.md,
  },
  permBtnText: { color: '#fff', fontWeight: '700' },
});