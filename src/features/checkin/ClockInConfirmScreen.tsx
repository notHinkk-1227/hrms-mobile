import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertCircle, MapPin, Navigation } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { GeofencePill } from '@shared/components/GeofencePill';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { ClockInUseCase, ClockInPreview } from '@domain/usecases/clockIn';
import { locationService } from '@infrastructure/location/locationService';
import { checkinClient, getAllowedLocationsForToday } from '@infrastructure/api/checkinClient';
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

export function ClockInConfirmScreen({ navigation, route }: Props): React.JSX.Element {
  const { logType } = route.params;
  const employee = useAuthStore((s) => s.employee);

  const [preview, setPreview] = useState<ClockInPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const outcome = await useCase.submit(
        {
          logType,
          employee: employee.name,
          deviceId,
          deviceFingerprint: fingerprint,
          overrideOutOfGeofence: override,
        },
        preview,
      );

      if (outcome.kind === 'success') {
        navigation.replace('ClockInSuccess', { result: outcome.result, logType });
      } else if (outcome.kind === 'out_of_geofence') {
        Alert.alert(
          'Di luar area kantor',
          `Anda berada ${formatDistance(outcome.nearest?.distanceM ?? 0)} dari ${
            outcome.nearest?.name ?? 'lokasi kantor'
          }. Tetap absen?`,
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Tetap Absen', onPress: () => doSubmit(true) },
          ],
        );
      } else {
        Alert.alert('Gagal absen', outcome.kind === 'error' ? outcome.message : 'Coba lagi');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const title = logType === 'IN' ? 'Absen Masuk' : 'Absen Pulang';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>KONFIRMASI</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>
          Pastikan lokasi Anda sesuai sebelum mengirim absen.
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
          <View style={styles.coordCard}>
            <View style={styles.coordRow}>
              <Navigation size={16} color={tokens.semantic.brand} />
              <Text style={styles.coordLabel}>Koordinat GPS</Text>
            </View>
            <Text style={styles.coordValue}>
              {preview.coordinate.latitude.toFixed(6)}, {preview.coordinate.longitude.toFixed(6)}
            </Text>
            <Text style={styles.coordMeta}>
              Akurasi ±{Math.round(preview.coordinate.accuracyMeters)} m
            </Text>
          </View>

          {preview.nearest ? (
            <View>
              <GeofencePill
                state={preview.nearest.inside ? 'inside' : 'outside'}
                label={`${preview.nearest.locationName ?? preview.nearest.name} · ${formatDistance(preview.nearest.distanceM)}`}
              />
              <View
                style={[
                  styles.locationCard,
                  preview.nearest.inside ? styles.locationInside : styles.locationOutside,
                ]}
              >
                <View style={styles.locationDetailRow}>
                  <MapPin size={14} color={tokens.semantic.fg3} />
                  <Text style={styles.locationName}>
                    {preview.nearest.locationName ?? preview.nearest.name}
                  </Text>
                </View>
                <Text style={styles.locationDistance}>
                  {preview.nearest.inside
                    ? `Anda di dalam radius geofence.`
                    : `Anda ${formatDistance(preview.nearest.distanceM)} dari titik referensi.`}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.locationCard, styles.locationNone]}>
              <View style={styles.locationRow}>
                <AlertCircle size={20} color={tokens.color.yellow700} />
                <Text style={[styles.locationStatus, { color: tokens.color.yellow700 }]}>
                  Tidak ada lokasi shift hari ini
                </Text>
              </View>
              <Text style={styles.locationDistance}>Absen tetap bisa dikirim.</Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.cta}>
        <Button fullWidth onPress={() => doSubmit(false)} loading={submitting} disabled={!preview || loading}>
          Kirim Absen
        </Button>
        <Button variant="ghost" fullWidth onPress={() => navigation.goBack()} disabled={submitting}>
          Batal
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
  coordCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: 6,
  },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1 },
  coordLabel: { fontSize: tokens.fontSize.small, fontWeight: '600', color: tokens.semantic.fg2 },
  coordValue: {
    fontSize: tokens.fontSize.body,
    fontFamily: tokens.font.mono,
    color: tokens.semantic.fg1,
  },
  coordMeta: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  locationCard: {
    marginTop: tokens.spacing.sp2,
    padding: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 6,
  },
  locationInside: {
    backgroundColor: tokens.color.green50,
    borderColor: tokens.color.green200,
  },
  locationOutside: {
    backgroundColor: tokens.color.errorTint,
    borderColor: tokens.color.error,
  },
  locationNone: {
    backgroundColor: tokens.color.yellow50,
    borderColor: tokens.color.yellow200,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp2 },
  locationStatus: { fontSize: tokens.fontSize.h4, fontWeight: '700' },
  locationDetailRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1 },
  locationName: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '600' },
  locationDistance: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  cta: { gap: tokens.spacing.sp2, marginTop: tokens.spacing.sp4 },
});
