import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock, LogIn, LogOut, MapPin, Smartphone } from 'lucide-react-native';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { StatusBadge } from '@shared/components/StatusBadge';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import {
  CheckinAttachment,
  FrappeEmployeeCheckin,
  getCheckin,
  listCheckinAttachments,
} from '@infrastructure/api/checkinClient';
import { ApiError } from '@infrastructure/api/errors';
import type { HomeStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CheckinDetail'>;

function formatTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateLong(iso: string): string {
  return new Date(iso.replace(' ', 'T')).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function resolveFileUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = persist.getString(StorageKeys.TENANT_URL) ?? '';
  if (!base) return path;
  return base.replace(/\/$/, '') + path;
}

export function CheckinDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { name } = route.params;
  const [checkin, setCheckin] = useState<FrappeEmployeeCheckin | null>(null);
  const [attachments, setAttachments] = useState<CheckinAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getCheckin(name).catch<FrappeEmployeeCheckin | null>(() => null),
      listCheckinAttachments(name).catch<CheckinAttachment[]>(() => []),
    ])
      .then(([doc, files]) => {
        if (!active) return;
        if (!doc) {
          setError('Data presensi tidak ditemukan');
        } else {
          setCheckin(doc);
          setAttachments(files);
        }
      })
      .catch((e: ApiError) => {
        if (active) setError(e.message || 'Gagal memuat detail presensi');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [name]);

  const selfie = attachments.find((a) => a.is_image === 1) ?? attachments[0];
  const isIn = checkin?.log_type === 'IN';
  const Icon = isIn ? LogIn : LogOut;
  const iconTint = isIn ? tokens.color.green700 : tokens.color.blue700;
  const iconBg = isIn ? tokens.color.green50 : tokens.color.blue50;

  return (
    <Screen>
      <FormHeader title="Detail Presensi" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList count={3} />
        </View>
      ) : error || !checkin ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Data tidak tersedia'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroCard}>
            <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
              <Icon size={26} color={iconTint} />
            </View>
            <Text style={styles.bigTime}>{formatTime(checkin.time)}</Text>
            <Text style={styles.date}>{formatDateLong(checkin.time)}</Text>
            <View style={styles.badgeWrap}>
              <StatusBadge
                label={isIn ? 'Presensi Masuk' : 'Presensi Pulang'}
                variant={isIn ? 'success' : 'neutral'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FOTO SELFIE</Text>
            {selfie?.is_image === 1 ? (
              <Image
                source={{ uri: resolveFileUrl(selfie.file_url) }}
                style={styles.selfie}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.selfieEmpty}>
                <Text style={styles.selfieEmptyText}>Tidak ada foto presensi.</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INFORMASI</Text>
            <View style={styles.infoCard}>
              {checkin.latitude != null && checkin.longitude != null ? (
                <Row
                  icon={<MapPin size={16} color={tokens.semantic.fg3} />}
                  label="Koordinat GPS"
                  value={`${checkin.latitude.toFixed(6)}, ${checkin.longitude.toFixed(6)}`}
                />
              ) : (
                <Row
                  icon={<MapPin size={16} color={tokens.semantic.fg3} />}
                  label="Koordinat GPS"
                  value="Tidak tersedia"
                />
              )}
              {checkin.shift ? (
                <Row
                  icon={<Clock size={16} color={tokens.semantic.fg3} />}
                  label="Shift"
                  value={checkin.shift}
                />
              ) : null}
              {checkin.device_id ? (
                <Row
                  icon={<Smartphone size={16} color={tokens.semantic.fg3} />}
                  label="Device"
                  value={checkin.device_id}
                />
              ) : null}
              <Row
                icon={<Clock size={16} color={tokens.semantic.fg3} />}
                label="Nomor"
                value={checkin.name}
                mono
              />
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, mono ? styles.rowValueMono : null]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  skeletonWrap: { paddingVertical: tokens.spacing.sp2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.sp4 },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error, textAlign: 'center' },
  heroCard: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.sp4,
    gap: tokens.spacing.sp1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sp2,
  },
  bigTime: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.timeLarge,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    letterSpacing: -1,
  },
  date: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3 },
  badgeWrap: { marginTop: tokens.spacing.sp2 },
  section: { gap: tokens.spacing.sp2 },
  sectionLabel: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
  },
  selfie: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.semantic.surface2,
  },
  selfieEmpty: {
    paddingVertical: tokens.spacing.sp5,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    alignItems: 'center',
  },
  selfieEmptyText: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  infoCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp3 },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  rowValue: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
  rowValueMono: { fontFamily: tokens.font.mono, fontSize: tokens.fontSize.small },
});
