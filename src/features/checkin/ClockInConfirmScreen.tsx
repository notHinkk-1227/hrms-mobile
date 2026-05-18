import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertCircle, Camera as CameraIcon, CheckCircle2, MapPin, RefreshCw } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { StickyCta } from '@shared/components/StickyCta';
import { TextField } from '@shared/components/TextField';
import { useToast } from '@shared/components/Toast';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { ClockInUseCase, ClockInPreview } from '@domain/usecases/clockIn';
import { locationService } from '@infrastructure/location/locationService';
import { checkinClient, getAllowedLocationsForToday } from '@infrastructure/api/checkinClient';
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

interface PhotoHeroProps {
  photoPath: string | undefined;
  preview: ClockInPreview;
  onReplace: () => void;
}

/**
 * Foto selfie full-width sebagai hero, dengan info GPS + lokasi overlay
 * menempel di pojok bawah foto. Kalau tidak ada foto, render placeholder
 * dengan icon kamera + tap untuk ambil.
 */
function PhotoHero({ photoPath, preview, onReplace }: PhotoHeroProps): React.JSX.Element {
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
      {/* Top-right action button */}
      <Pressable
        onPress={onReplace}
        style={styles.replaceBtn}
        hitSlop={8}
        accessibilityLabel={photoPath ? 'Ganti foto selfie' : 'Ambil foto selfie'}
      >
        <RefreshCw size={14} color="#FFFFFF" />
        <Text style={styles.replaceBtnText}>{photoPath ? 'Ganti' : 'Ambil'}</Text>
      </Pressable>

      {/* Overlay info bawah */}
      <View style={styles.overlay}>
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
          <Text style={styles.overlayLocationName} numberOfLines={1}>
            {locationName}
          </Text>
        </View>
        <View style={styles.overlayDivider} />
        <Text style={styles.overlayCoord}>
          {lat}, {lon}
        </Text>
        <Text style={styles.overlayCoordMeta}>Akurasi ±{accuracy} m</Text>
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

  const [preview, setPreview] = useState<ClockInPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reasonOutside, setReasonOutside] = useState('');
  const features = useFeaturesStore((s) => s.features);
  const isOutside = !!(preview?.nearest && !preview.nearest.inside);
  const showReasonField =
    features.hasSopwerHrms && features.geofence && isOutside;
  const reasonRequired = showReasonField && features.softBlockOutsideGeofence;

  const loadPreview = useCallback(async () => {
    if (!employee?.name) {
      setError('Data karyawan tidak ditemukan');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
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
      let selfieBase64: string | undefined;
      if (photoPath && features.hasSopwerHrms) {
        try {
          selfieBase64 = await fileToBase64(photoPath);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Foto selfie tidak terbaca';
          toast.show({ variant: 'error', title: 'Foto selfie tidak terbaca', message: msg });
          setSubmitting(false);
          return;
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
        // Standard mode — backend tidak handle selfie, upload manual.
        if (photoPath && outcome.result.name && !features.hasSopwerHrms) {
          const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
          try {
            await uploadFile({
              uri,
              name: `selfie-${outcome.result.name}.jpg`,
              type: 'image/jpeg',
              attachToDoctype: 'Employee Checkin',
              attachToName: outcome.result.name,
              isPrivate: true,
            });
          } catch (uploadErr) {
            const msg = uploadErr instanceof Error ? uploadErr.message : 'Upload foto gagal';
            toast.show({
              variant: 'warning',
              title: 'Foto selfie tidak tersimpan',
              message: msg,
            });
          }
        }
        navigation.replace('ClockInSuccess', { result: outcome.result, logType });
      } else if (outcome.kind === 'out_of_geofence') {
        Alert.alert(
          'Di luar area kantor',
          `Anda berada ${formatDistance(outcome.nearest?.distanceM ?? 0)} dari ${
            outcome.nearest?.name ?? 'lokasi kantor'
          }. Tetap kirim presensi?`,
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Tetap Kirim', onPress: () => doSubmit(true) },
          ],
        );
      } else {
        Alert.alert('Gagal presensi', outcome.kind === 'error' ? outcome.message : 'Coba lagi');
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
          <View style={styles.errorBox}>
            <AlertCircle size={20} color={tokens.color.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={loadPreview} variant="outline" size="md">
              Coba Lagi
            </Button>
          </View>
        ) : preview ? (
          <View style={styles.previewBox}>
            <PhotoHero
              photoPath={photoPath}
              preview={preview}
              onReplace={() => navigation.replace('ClockInCamera', { logType })}
            />

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
  errorBox: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.sp2,
    alignItems: 'flex-start',
  },
  errorText: { fontSize: tokens.fontSize.body, color: tokens.color.error },
  previewBox: { gap: tokens.spacing.sp3, flex: 1 },
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
    gap: tokens.spacing.sp1,
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
