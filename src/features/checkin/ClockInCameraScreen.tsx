import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { Check, RotateCcw, X } from 'lucide-react-native';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import type { HomeStackParamList } from '@app/navigation/types';
import { livenessService } from '@infrastructure/liveness/livenessService';

type Props = NativeStackScreenProps<HomeStackParamList, 'ClockInCamera'>;

export function ClockInCameraScreen({ navigation, route }: Props): React.JSX.Element {
  const { logType } = route.params;
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);

  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [permissionAsked, setPermissionAsked] = useState(false);
  const [tick, setTick] = useState(0);
  const [checkingLiveness, setCheckingLiveness] = useState(false);
  const [blockReason, setBlockReason] = useState<'Fail' | 'NoFace' | null>(null);

  // Preload model anti-spoofing sedini mungkin (saat screen ini dibuka,
  // bukan saat user sudah pencet "Pakai Foto Ini") supaya checkLiveness()
  // nanti tidak perlu nunggu loading model (~beberapa ratus ms).
  useEffect(() => {
    livenessService.preload();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const liveStamp = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${time} · ${date.toUpperCase()}`;
  })();
  void tick; // keep linter happy on tick dep

  useEffect(() => {
    if (!hasPermission && !permissionAsked) {
      setPermissionAsked(true);
      requestPermission();
    }
  }, [hasPermission, permissionAsked, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      setPhotoPath(photo.path);
    } catch {
      // silent — user can retry
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  const handleRetake = () => {
    setPhotoPath(null);
    setBlockReason(null);
  };

  const handleUse = async () => {
    if (!photoPath || checkingLiveness) return;
    setCheckingLiveness(true);
    setBlockReason(null);
    try {
      const faceLiveness = await livenessService.checkLiveness(photoPath);
      if (faceLiveness.verdict === 'Fail' || faceLiveness.verdict === 'NoFace') {
        // Hard block di level UI juga (selain di use case) -- user harus
        // ambil ulang foto, tidak ada tombol "lanjut saja". Pesan beda
        // tergantung alasan: 'Fail' = terdeteksi spoof, 'NoFace' = wajah
        // tidak ditemukan dengan jelas di frame (beda kasus, bukan spoof).
        setBlockReason(faceLiveness.verdict);
        return;
      }
      navigation.replace('ClockInConfirm', { logType, photoPath, faceLiveness });
    } finally {
      setCheckingLiveness(false);
    }
  };

  const handleSkip = () => {
    navigation.replace('ClockInConfirm', { logType });
  };

  if (!hasPermission) {
    return (
      <Screen>
        <View style={styles.permWrap}>
          <Text style={styles.permTitle}>Izin kamera diperlukan</Text>
          <Text style={styles.permBody}>
            Aplikasi butuh akses kamera untuk mengambil foto selfie sebagai verifikasi presensi.
          </Text>
          <Pressable style={styles.permBtn} onPress={() => requestPermission()}>
            <Text style={styles.permBtnText}>Berikan Izin</Text>
          </Pressable>
          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Lewati foto, lanjut presensi</Text>
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
          <Text style={styles.permBody}>Mempersiapkan kamera…</Text>
          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Lewati foto, lanjut presensi</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {photoPath ? (
        <Image source={{ uri: `file://${photoPath}` }} style={styles.preview} resizeMode="cover" />
      ) : (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!photoPath}
          photo
        />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + tokens.spacing.sp3 }]}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={22} color={tokens.color.white} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>
            {logType === 'IN' ? 'PRESENSI MASUK' : 'PRESENSI PULANG'}
          </Text>
          <Text style={styles.title}>Ambil Selfie</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {!photoPath ? (
        <View style={styles.faceGuideWrap} pointerEvents="none">
          <View style={styles.faceOval} />
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <Text style={styles.stamp}>{liveStamp}</Text>
        </View>
      ) : null}

      {photoPath && blockReason ? (
        <View style={styles.spoofNotice} pointerEvents="none">
          <Text style={styles.spoofNoticeText}>
            {blockReason === 'NoFace'
              ? 'Wajah tidak terdeteksi dengan jelas. Pastikan wajah Anda terlihat penuh dan pencahayaan cukup, lalu ambil ulang.'
              : 'Foto terdeteksi bukan asli. Silakan ambil ulang selfie secara langsung.'}
          </Text>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + tokens.spacing.sp4 }]}>
        {photoPath ? (
          <View style={styles.actionsRow}>
            <Pressable style={styles.retakeBtn} onPress={handleRetake} disabled={checkingLiveness}>
              <RotateCcw size={20} color={tokens.color.white} />
              <Text style={styles.retakeText}>Ambil Ulang</Text>
            </Pressable>
            <Pressable
              style={[styles.useBtn, checkingLiveness && styles.useBtnDisabled]}
              onPress={handleUse}
              disabled={checkingLiveness}
            >
              {checkingLiveness ? (
                <>
                  <ActivityIndicator size="small" color={tokens.color.white} />
                  <Text style={styles.useText}>Memeriksa foto…</Text>
                </>
              ) : (
                <>
                  <Check size={20} color={tokens.color.white} />
                  <Text style={styles.useText}>Pakai Foto Ini</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable onPress={handleSkip} style={styles.skipBtnInline}>
              <Text style={styles.skipText}>Lewati foto</Text>
            </Pressable>
            <Pressable
              style={[styles.shutter, capturing && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={capturing}
              accessibilityLabel="Ambil foto"
            >
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.skipSpacer} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  preview: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.sp4,
    paddingBottom: tokens.spacing.sp3,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { alignItems: 'center', gap: 2 },
  eyebrow: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.yellow300,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '800',
    color: tokens.color.white,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: tokens.spacing.sp4,
    paddingHorizontal: tokens.spacing.sp4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  faceGuideWrap: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  faceOval: {
    width: 240,
    height: 320,
    borderRadius: 160,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: tokens.color.yellow300,
  },
  cornerTL: {
    top: 0,
    left: '50%',
    marginLeft: -120 - 4,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    left: '50%',
    marginLeft: 120 - 24 + 4,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    top: 320 - 24,
    left: '50%',
    marginLeft: -120 - 4,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    top: 320 - 24,
    left: '50%',
    marginLeft: 120 - 24 + 4,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  stamp: {
    marginTop: tokens.spacing.sp3,
    fontFamily: tokens.font.mono,
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.white,
    letterSpacing: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: tokens.radius.sm,
    overflow: 'hidden',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: tokens.color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.6 },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tokens.color.white,
  },
  skipBtnInline: {
    width: 80,
    paddingVertical: 6,
  },
  skipSpacer: { width: 80 },
  skipText: {
    fontSize: tokens.fontSize.small,
    color: tokens.color.white,
    fontWeight: '600',
  },
  actionsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: tokens.spacing.sp3,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  retakeText: { color: tokens.color.white, fontWeight: '700', fontSize: tokens.fontSize.body },
  useBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.green600,
  },
  useBtnDisabled: { opacity: 0.7 },
  useText: { color: tokens.color.white, fontWeight: '700', fontSize: tokens.fontSize.body },
  spoofNotice: {
    position: 'absolute',
    bottom: 132,
    left: tokens.spacing.sp4,
    right: tokens.spacing.sp4,
    backgroundColor: 'rgba(220,38,38,0.92)',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp3,
  },
  spoofNoticeText: {
    color: tokens.color.white,
    fontSize: tokens.fontSize.small,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  permWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp3,
    paddingHorizontal: tokens.spacing.sp4,
  },
  permTitle: { fontSize: tokens.fontSize.h2, fontWeight: '800', color: tokens.semantic.fg1 },
  permBody: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg3,
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    paddingVertical: tokens.spacing.sp3,
    paddingHorizontal: tokens.spacing.sp5,
    backgroundColor: tokens.semantic.brand,
    borderRadius: tokens.radius.md,
  },
  permBtnText: { color: tokens.color.white, fontSize: tokens.fontSize.body, fontWeight: '700' },
  skipBtn: { paddingVertical: tokens.spacing.sp2 },
});