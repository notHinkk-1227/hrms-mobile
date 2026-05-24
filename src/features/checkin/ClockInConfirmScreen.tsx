import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ViewShot, { captureRef, type ViewShotRef } from 'react-native-view-shot';
import { AlertCircle, Camera as CameraIcon, CheckCircle2, MapPin, RefreshCw } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { NoticeCard } from '@shared/components/NoticeCard';
import { OSMStaticImage } from '@shared/components/OSMStaticImage';
import { Screen } from '@shared/components/Screen';
import { StickyCta } from '@shared/components/StickyCta';
import { TextField } from '@shared/components/TextField';
import { useToast } from '@shared/components/Toast';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { ClockInUseCase, ClockInPreview } from '@domain/usecases/clockIn';
import { analytics } from '@infrastructure/analytics';
import { locationService } from '@infrastructure/location/locationService';
import { addReasonComment, checkinClient, getAllowedLocationsForToday } from '@infrastructure/api/checkinClient';
import { useFeaturesStore } from '@infrastructure/api/featureDetect';
import { uploadFile } from '@infrastructure/api/uploadClient';
import { getDeviceFingerprint, getDeviceId } from '@infrastructure/device/deviceInfo';
import type { HomeStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ClockInConfirm'>;

const useCase = new ClockInUseCase({
  locationPort: locationService,
  checkinPort: checkinClient,
  fetchAllowedLocations: getAllowedLocationsForToday,
});

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Ubah error mentah dari GPS/network jadi pesan singkat berbahasa Indonesia
 * yang mudah dipahami pengguna. Heuristik berdasarkan kata kunci di message.
 */
function humanizePreviewError(raw: string): { title: string; body: string } {
  const m = raw.toLowerCase();
  if (m.includes('permission') || m.includes('denied') || m.includes('izin')) {
    return {
      title: 'Izin lokasi belum aktif',
      body: 'Aktifkan izin lokasi untuk aplikasi di pengaturan, lalu coba lagi.',
    };
  }
  if (m.includes('location services') || m.includes('disabled') || m.includes('gps')) {
    return {
      title: 'GPS belum menyala',
      body: 'Nyalakan layanan lokasi (GPS) di perangkat Anda lalu coba lagi.',
    };
  }
  if (m.includes('timeout') || m.includes('timed out')) {
    return {
      title: 'Sinyal GPS lemah',
      body: 'Pindah ke tempat terbuka atau dekat jendela, lalu coba ambil lokasi lagi.',
    };
  }
  if (m.includes('network') || m.includes('connection') || m.includes('koneksi')) {
    return {
      title: 'Tidak ada koneksi',
      body: 'Periksa koneksi internet Anda, lalu coba lagi.',
    };
  }
  return {
    title: 'Gagal mengambil lokasi',
    body: raw,
  };
}

interface PhotoHeroProps {
  photoPath: string | undefined;
  preview: ClockInPreview;
  onReplace: () => void;
  onMapReady?: () => void;
  onSelfieReady?: () => void;
}

/**
 * Foto selfie full-width sebagai hero, dengan info GPS + lokasi overlay
 * menempel di pojok bawah foto. Kalau tidak ada foto, render placeholder
 * dengan icon kamera + tap untuk ambil.
 */
function PhotoHero({ photoPath, preview, onReplace, onMapReady, onSelfieReady }: PhotoHeroProps): React.JSX.Element {
  const inside = !!(preview.nearest && preview.nearest.inside);
  const outside = !!(preview.nearest && !preview.nearest.inside);
  const lat = preview.coordinate.latitude.toFixed(6);
  const lon = preview.coordinate.longitude.toFixed(6);
  const accuracy = Math.round(preview.coordinate.accuracyMeters);

  let statusLabel: string;
  let statusColor: string;
  if (inside) {
    statusLabel = 'DI DALAM RADIUS';
    statusColor = tokens.color.green300;
  } else if (outside) {
    statusLabel = `${formatDistance(preview.nearest!.distanceM)} DARI TITIK`;
    statusColor = '#FFB4B4';
  } else {
    statusLabel = 'TANPA LOKASI SHIFT';
    statusColor = '#FFE08A';
  }
  const locationName =
    preview.nearest?.locationName ?? preview.nearest?.name ?? 'Lokasi GPS';

  const content = (
    <>
      {/* Overlay info bawah: info text di kiri + map thumb di kanan */}
      <View style={styles.overlay}>
        <View style={styles.overlayInfo}>
          <View style={styles.overlayTopRow}>
            {inside ? (
              <CheckCircle2 size={18} color={tokens.color.green300} />
            ) : outside ? (
              <AlertCircle size={18} color="#FFB4B4" />
            ) : (
              <AlertCircle size={18} color="#FFE08A" />
            )}
            <Text style={[styles.overlayStatus, { color: statusColor }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
          <View style={styles.overlayLocationRow}>
            <MapPin size={16} color="#FFFFFF" />
            <Text style={styles.overlayLocationName} numberOfLines={2}>
              {locationName}
            </Text>
          </View>
          <View style={styles.overlayDivider} />
          <Text style={styles.overlayCoord}>
            {lat}, {lon}
          </Text>
          <Text style={styles.overlayCoordMeta}>Akurasi ±{accuracy} m</Text>
        </View>
        <View style={styles.overlayMap}>
          <OSMStaticImage
            latitude={preview.coordinate.latitude}
            longitude={preview.coordinate.longitude}
            size={84}
            zoom={16}
            onReady={onMapReady}
          />
        </View>
      </View>
    </>
  );

  if (!photoPath) {
    return (
      <Pressable onPress={onReplace} style={styles.heroPlaceholder} accessibilityRole="button">
        <View style={styles.placeholderCenter}>
          <CameraIcon size={36} color="#FFFFFF" />
          <Text style={styles.placeholderText}>Tap untuk ambil selfie</Text>
        </View>
        {content}
      </Pressable>
    );
  }

  return (
    <ImageBackground
      source={{ uri: `file://${photoPath}` }}
      style={styles.heroPhoto}
      imageStyle={styles.heroImage}
      onLoad={onSelfieReady}
      onError={onSelfieReady}
    >
      {content}
    </ImageBackground>
  );
}

/** Read file path → data URI base64 string. Pakai fetch + FileReader (no native dep). */
async function fileToBase64(path: string): Promise<string> {
  const uri = path.startsWith('file://') ? path : `file://${path}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Hasil baca file bukan string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Gagal baca foto selfie'));
    reader.readAsDataURL(blob);
  });
}

export function ClockInConfirmScreen({ navigation, route }: Props): React.JSX.Element {
  const { logType, photoPath } = route.params;
  const employee = useAuthStore((s) => s.employee);
  const toast = useToast();
  const shotRef = useRef<ViewShotRef>(null);

  const [preview, setPreview] = useState<ClockInPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reasonOutside, setReasonOutside] = useState('');
  const mapReadyRef = useRef(false);
  // Selfie photo bitmap decoded? Kalau tidak ada photoPath, langsung true
  // (placeholder Pressable tidak punya Image untuk di-load).
  const selfieReadyRef = useRef(!photoPath);
  const features = useFeaturesStore((s) => s.features);
  const isOutside = !!(preview?.nearest && !preview.nearest.inside);
  // Vanilla mode (tanpa sopwer_hrms): reason juga ditampilkan saat di luar zona
  // sebagai bukti soft-policy. Disimpan via Frappe Comment post-success
  // (lihat addReasonComment call di blok success di bawah). Per locked
  // decision plan dual-mode: vanilla PERMISSIVE, izinkan submit + reason wajib.
  const showReasonField = features.geofence && isOutside;
  const reasonRequired =
    showReasonField &&
    (features.hasSopwerHrms ? features.softBlockOutsideGeofence : true);

  const loadPreview = useCallback(async () => {
    if (!employee?.name) {
      setError('Data karyawan tidak ditemukan');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // Koordinat baru → tile map akan re-fetch, reset readiness.
    mapReadyRef.current = false;
    selfieReadyRef.current = !photoPath;
    try {
      const result = await useCase.preview(employee.name);
      setPreview(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal ambil lokasi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [employee?.name]);

  /**
   * Tunggu sampai (1) OSMStaticImage tile resolved, DAN (2) selfie ImageBackground
   * bitmap decoded. Tanpa kedua-duanya ready, captureRef bisa throw "Unable to
   * snapshot view" di Android PixelCopy → fallback ke raw selfie + warning toast.
   * Di physical device, decode photo dari file:// bisa 100–500ms; Carto tile
   * 1–3 detik. Polling 100ms, timeout 5s.
   */
  const waitForCaptureReady = useCallback(async (timeoutMs = 5000): Promise<void> => {
    const isReady = () => mapReadyRef.current && selfieReadyRef.current;
    if (isReady()) {
      // 1 frame buffer supaya layout settle sebelum PixelCopy snapshot.
      await new Promise<void>((r) => {
        setTimeout(r, 50);
      });
      return;
    }
    const start = Date.now();
    while (!isReady()) {
      if (Date.now() - start > timeoutMs) return;
      await new Promise<void>((r) => {
        setTimeout(r, 100);
      });
    }
    await new Promise<void>((r) => {
      setTimeout(r, 50);
    });
  }, []);

  const handleMapReady = useCallback(() => {
    mapReadyRef.current = true;
  }, []);

  const handleSelfieReady = useCallback(() => {
    selfieReadyRef.current = true;
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const doSubmit = async (override = false) => {
    if (!preview || !employee?.name) return;
    setSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      const fingerprint = await getDeviceFingerprint();

      // Enhanced mode (sopwer_hrms) — backend wajib selfie_base64 di payload
      // clock_in, lalu save file sendiri via decode_selfie + db.set_value.
      // Standard mode — submit dulu, upload selfie multipart setelah doc dibuat.
      //
      // Foto yang dikirim = COMPOSITE (selfie + overlay info + map thumbnail)
      // di-capture dari preview ViewShot, bukan raw selfie. Kalau capture gagal,
      // fallback ke raw selfie supaya presensi tetap bisa terkirim.
      let selfieBase64: string | undefined;
      if (photoPath && features.hasSopwerHrms) {
        try {
          // Tunggu OSM tile load selesai (max 5s) supaya capture deterministik
          // di physical device — bukan race terhadap timeout magic number.
          await waitForCaptureReady(5000);
          selfieBase64 = await captureRef(shotRef, {
            format: 'jpg',
            quality: 0.9,
            result: 'data-uri',
          });
        } catch (captureErr) {
          console.warn('[ClockIn] captureRef enhanced failed:', captureErr);
          const errMsg =
            captureErr instanceof Error ? captureErr.message : String(captureErr);
          try {
            selfieBase64 = await fileToBase64(photoPath);
            toast.show({
              variant: 'warning',
              title: 'Stempel info tidak dibuat',
              message: `Foto tetap dikirim tanpa overlay lokasi. (Error: ${errMsg})`,
              durationMs: 8000,
            });
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : 'File foto selfie tidak dapat dibaca.';
            toast.show({
              variant: 'error',
              title: 'Foto selfie bermasalah',
              message: `${msg} Coba ambil ulang foto.`,
              durationMs: 5000,
            });
            setSubmitting(false);
            return;
          }
        }
      }

      const outcome = await useCase.submit(
        {
          logType,
          employee: employee.name,
          deviceId,
          deviceFingerprint: fingerprint,
          overrideOutOfGeofence: override,
          reasonOutsideLocation: reasonOutside.trim() || undefined,
          selfieBase64,
        },
        preview,
      );

      if (outcome.kind === 'success') {
        // Vanilla mode: kalau ada reason (mode di luar zona), post sebagai
        // Frappe Comment ke Employee Checkin record. Non-fatal — checkin
        // sudah landed, reason cuma audit trail untuk HR review.
        if (
          !features.hasSopwerHrms &&
          outcome.result.name &&
          reasonOutside.trim().length > 0
        ) {
          addReasonComment(outcome.result.name, reasonOutside.trim()).catch(() => {
            toast.show({
              variant: 'warning',
              title: 'Alasan belum tersimpan',
              message: 'Presensi berhasil tapi catatan alasan gagal diunggah.',
            });
          });
        }
        // Standard mode — backend tidak handle selfie, upload composite manual.
        if (photoPath && outcome.result.name && !features.hasSopwerHrms) {
          let uploadUri: string;
          try {
            await waitForCaptureReady(5000);
            uploadUri = await captureRef(shotRef, {
              format: 'jpg',
              quality: 0.9,
              result: 'tmpfile',
            });
          } catch (captureErr) {
            console.warn('[ClockIn] captureRef vanilla failed:', captureErr);
            const errMsg =
              captureErr instanceof Error ? captureErr.message : String(captureErr);
            uploadUri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
            toast.show({
              variant: 'warning',
              title: 'Stempel info tidak dibuat',
              message: `Foto diunggah tanpa overlay lokasi. (Error: ${errMsg})`,
              durationMs: 8000,
            });
          }
          try {
            await uploadFile({
              uri: uploadUri,
              name: `selfie-${outcome.result.name}.jpg`,
              type: 'image/jpeg',
              attachToDoctype: 'Employee Checkin',
              attachToName: outcome.result.name,
              isPrivate: true,
            });
          } catch (uploadErr) {
            const msg =
              uploadErr instanceof Error ? uploadErr.message : 'Upload foto gagal.';
            toast.show({
              variant: 'warning',
              title: 'Foto belum tersimpan',
              message: `Presensi berhasil, namun foto gagal terunggah: ${msg}`,
              durationMs: 5000,
            });
          }
        }
        analytics.logEvent(logType === 'IN' ? 'clock_in' : 'clock_out', {
          gps_accuracy_meters: Math.round(preview.coordinate.accuracyMeters),
          override_out_of_geofence: override ? 1 : 0,
        }).catch(() => undefined);
        navigation.replace('ClockInSuccess', { result: outcome.result, logType });
      } else if (outcome.kind === 'out_of_geofence') {
        const distance = formatDistance(outcome.nearest?.distanceM ?? 0);
        const place = outcome.nearest?.name ?? 'lokasi kantor';
        Alert.alert(
          'Anda di luar radius',
          `Posisi Anda ${distance} dari ${place}. Tetap kirim presensi?`,
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Tetap Kirim', style: 'destructive', onPress: () => doSubmit(true) },
          ],
        );
      } else {
        const msg =
          outcome.kind === 'error' && outcome.message
            ? outcome.message
            : 'Coba lagi beberapa saat lagi.';
        toast.show({
          variant: 'error',
          title: 'Presensi gagal dikirim',
          message: msg,
          durationMs: 5000,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const title = logType === 'IN' ? 'Presensi Masuk' : 'Presensi Pulang';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>KONFIRMASI</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>
            Pastikan lokasi Anda sesuai sebelum mengirim presensi.
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.semantic.brand} size="large" />
            <Text style={styles.loadingText}>Mengambil lokasi GPS…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorWrap}>
            {(() => {
              const e = humanizePreviewError(error);
              return <NoticeCard variant="error" title={e.title} body={e.body} />;
            })()}
            <Button onPress={loadPreview} variant="outline" size="md">
              Coba Lagi
            </Button>
          </View>
        ) : preview ? (
          <View style={styles.previewBox}>
            <View style={styles.heroWrap}>
              <ViewShot
                ref={shotRef}
                options={{ format: 'jpg', quality: 0.9 }}
                style={styles.shotWrap}
              >
                <PhotoHero
                  photoPath={photoPath}
                  preview={preview}
                  onReplace={() => navigation.replace('ClockInCamera', { logType })}
                  onMapReady={handleMapReady}
                  onSelfieReady={handleSelfieReady}
                />
              </ViewShot>
              {/* Tombol Ganti di luar ViewShot supaya tidak ikut ter-capture */}
              {photoPath ? (
                <Pressable
                  onPress={() => navigation.replace('ClockInCamera', { logType })}
                  style={styles.replaceBtn}
                  hitSlop={8}
                  accessibilityLabel="Ganti foto selfie"
                >
                  <RefreshCw size={14} color="#FFFFFF" />
                  <Text style={styles.replaceBtnText}>Ganti</Text>
                </Pressable>
              ) : null}
            </View>

            {showReasonField ? (
              <View style={styles.reasonBox}>
                <TextField
                  label={`Alasan presensi di luar lokasi${reasonRequired ? ' *' : ''}`}
                  value={reasonOutside}
                  onChangeText={setReasonOutside}
                  placeholder="Contoh: kunjungan klien, kerja lapangan, dst"
                  multiline
                  numberOfLines={3}
                  hint="Diteruskan ke HR untuk review presensi Anda."
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <StickyCta>
        <View style={styles.ctaRow}>
          <Button
            variant="outline"
            style={styles.ctaCancel}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            style={styles.ctaSubmit}
            onPress={() => doSubmit(false)}
            loading={submitting}
            disabled={
              !preview || loading || (reasonRequired && reasonOutside.trim().length === 0)
            }
          >
            Kirim Presensi
          </Button>
        </View>
      </StickyCta>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: tokens.spacing.sp4,
    paddingBottom: tokens.spacing.formCtaSpace,
  },
  ctaRow: { flexDirection: 'row', gap: tokens.spacing.sp2 },
  ctaCancel: { flex: 1 },
  ctaSubmit: { flex: 2 },
  header: { gap: tokens.spacing.sp2 },
  eyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  body: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3, lineHeight: 22 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp3,
  },
  loadingText: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3 },
  errorWrap: {
    gap: tokens.spacing.sp3,
    alignItems: 'stretch',
  },
  previewBox: { gap: tokens.spacing.sp3, flex: 1 },
  heroWrap: {
    position: 'relative',
  },
  shotWrap: {
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: tokens.semantic.surface2,
  },
  heroPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: tokens.semantic.surface2,
  },
  heroImage: {
    borderRadius: tokens.radius.lg,
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  placeholderCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.body,
    fontWeight: '600',
  },
  replaceBtn: {
    position: 'absolute',
    top: tokens.spacing.sp2,
    right: tokens.spacing.sp2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1,
    paddingHorizontal: tokens.spacing.sp2,
    paddingVertical: tokens.spacing.sp1,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  replaceBtnText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.small,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp3,
    backgroundColor: 'rgba(0,0,0,0.62)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sp3,
  },
  overlayInfo: {
    flex: 1,
    gap: tokens.spacing.sp1,
    minWidth: 0,
  },
  overlayMap: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  overlayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1_5,
  },
  overlayStatus: {
    fontSize: tokens.fontSize.small,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  overlayLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp1_5,
  },
  overlayLocationName: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.h3,
    fontWeight: '700',
    flex: 1,
  },
  overlayDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: tokens.spacing.sp1,
  },
  overlayCoord: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.small,
    fontFamily: tokens.font.mono,
    letterSpacing: 0.5,
  },
  overlayCoordMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: tokens.fontSize.caption,
  },
  reasonBox: { marginTop: tokens.spacing.sp1 },
});
