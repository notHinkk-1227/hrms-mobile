import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock, ImageOff, LogIn, LogOut, MapPin, Smartphone } from 'lucide-react-native';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { StatusBadge } from '@shared/components/StatusBadge';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { getAuthImageSource } from '@shared/utils/imageAuth';
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

export function CheckinDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { name } = route.params;

  const [checkin, setCheckin] = useState<FrappeEmployeeCheckin | null>(null);
  const [attachments, setAttachments] = useState<CheckinAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selfieError, setSelfieError] = useState(false);

  // IMPORTANT
  const [imageRatio, setImageRatio] = useState(1);

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
        if (active) {
          setError(e.message || 'Gagal memuat detail presensi');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [name]);

  const selfie = attachments.find((a) => a.is_image === 1) ?? attachments[0];

  // GET ORIGINAL IMAGE RATIO
  useEffect(() => {
    if (!selfie?.file_url) return;

    const source = getAuthImageSource(selfie.file_url);

    const uri =
      source && 'uri' in source
        ? source.uri
        : selfie.file_url;

    Image.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) {
          setImageRatio(width / height);
        }
      },
      () => {
        setImageRatio(1);
      }
    );
  }, [selfie]);

  const isIn = checkin?.log_type === 'IN';

  const Icon = isIn ? LogIn : LogOut;

  const iconTint = isIn ? tokens.color.green700 : tokens.color.blue700;

  const iconBg = isIn ? tokens.color.green50 : tokens.color.blue50;

  return (
    <Screen bottomInset={false}>
      <FormHeader
        title="Detail Presensi"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList count={3} />
        </View>
      ) : error || !checkin ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error ?? 'Data tidak tersedia'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroRow}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: iconBg },
              ]}
            >
              <Icon size={22} color={iconTint} />
            </View>

            <View style={styles.heroText}>
              <Text style={styles.bigTime}>
                {formatTime(checkin.time)}
              </Text>

              <Text style={styles.date}>
                {formatDateLong(checkin.time)}
              </Text>
            </View>

            <StatusBadge
              label={isIn ? 'Masuk' : 'Pulang'}
              variant={isIn ? 'success' : 'neutral'}
            />
          </View>

          {/* SELFIE */}
          {selfie?.is_image === 1 && !selfieError ? (
            <Image
              source={
                getAuthImageSource(selfie.file_url) ??
                { uri: selfie.file_url }
              }
              style={[
                styles.selfieCompact,
                {
                  aspectRatio: imageRatio,
                },
              ]}
              resizeMode="contain"
              onError={() => setSelfieError(true)}
            />
          ) : (
            <View style={styles.selfieEmpty}>
              <ImageOff
                size={20}
                color={tokens.semantic.fg3}
              />

              <Text style={styles.selfieEmptyText}>
                {selfieError
                  ? 'Foto tidak dapat dimuat'
                  : 'Tanpa foto'}
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            {checkin.latitude != null &&
            checkin.longitude != null ? (
              <Row
                icon={
                  <MapPin
                    size={14}
                    color={tokens.semantic.fg3}
                  />
                }
                label="GPS"
                value={`${checkin.latitude.toFixed(5)}, ${checkin.longitude.toFixed(5)}`}
                mono
              />
            ) : null}

            {checkin.shift ? (
              <Row
                icon={
                  <Clock
                    size={14}
                    color={tokens.semantic.fg3}
                  />
                }
                label="Shift"
                value={checkin.shift}
              />
            ) : null}

            {checkin.device_id ? (
              <Row
                icon={
                  <Smartphone
                    size={14}
                    color={tokens.semantic.fg3}
                  />
                }
                label="Device"
                value={checkin.device_id}
              />
            ) : null}

            <Row
              icon={
                <Clock
                  size={14}
                  color={tokens.semantic.fg3}
                />
              }
              label="ID"
              value={checkin.name}
              mono
            />
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
      <View style={styles.rowIcon}>
        {icon}
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>
          {label}
        </Text>

        <Text
          style={[
            styles.rowValue,
            mono ? styles.rowValueMono : null,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: tokens.spacing.sp3,
    paddingBottom: tokens.spacing.sp4,
  },

  skeletonWrap: {
    paddingVertical: tokens.spacing.sp2,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.sp4,
  },

  errorText: {
    fontSize: tokens.fontSize.small,
    color: tokens.color.error,
    textAlign: 'center',
  },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp2,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroText: {
    flex: 1,
  },

  bigTime: {
    fontFamily: tokens.font.display,
    fontSize: 32,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  date: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
  },

  // FIXED SELFIE STYLE
  selfieCompact: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.semantic.surface2,
    overflow: 'hidden',
  },

  selfieEmpty: {
    paddingVertical: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
  },

  selfieEmptyText: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
  },

  infoCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
  },

  rowIcon: {
    width: 20,
    alignItems: 'center',
  },

  rowText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rowLabel: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontWeight: '600',
  },

  rowValue: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg1,
    fontWeight: '500',
  },

  rowValueMono: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.caption,
  },
});