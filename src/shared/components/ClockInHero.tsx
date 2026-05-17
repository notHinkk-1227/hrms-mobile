import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Clock, MapPin } from 'lucide-react-native';
import { Gradient } from './Gradient';
import { tokens } from '@shared/theme/tokens';

export type ClockInHeroState = 'idle' | 'in_progress' | 'done' | 'blocked' | 'queued';

export interface ClockInHeroProps {
  state: ClockInHeroState;
  /** Pending sync count for queued state */
  queueCount?: number;
  onPressClockIn: () => void;
  /** Tap pada area atas card (label/time/location) — buka riwayat checkin */
  onPressHistory?: () => void;
  /** Label saat blocked, e.g. "Di luar area kantor" */
  blockedReason?: string;
  /** Baris lokasi (nama + jarak/verifikasi) yang selalu tampil di hero kalau ada */
  locationLine?: string;
}

function tick(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateLong(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const STATE_CONFIG: Record<
  ClockInHeroState,
  {
    colors: [string, string];
    label: string;
    labelColor: string;
    ctaText: string;
    ctaTextColor: string;
    disabled: boolean;
  }
> = {
  idle: {
    colors: [tokens.color.blue500, tokens.color.blue700],
    label: 'SIAP UNTUK PRESENSI',
    labelColor: tokens.color.yellow300,
    ctaText: 'Presensi Masuk',
    ctaTextColor: tokens.color.blue700,
    disabled: false,
  },
  in_progress: {
    colors: [tokens.color.green500, tokens.color.green700],
    label: 'SUDAH PRESENSI MASUK',
    labelColor: tokens.color.yellow300,
    ctaText: 'Presensi Pulang',
    ctaTextColor: tokens.color.green700,
    disabled: false,
  },
  done: {
    colors: [tokens.color.ink700, tokens.color.ink900],
    label: 'SUDAH PRESENSI PULANG',
    labelColor: tokens.color.yellow300,
    ctaText: 'Presensi Masuk Lagi',
    ctaTextColor: tokens.color.ink900,
    disabled: false,
  },
  blocked: {
    colors: [tokens.color.ink800, tokens.color.ink900],
    label: 'TIDAK BISA PRESENSI',
    labelColor: tokens.color.error,
    ctaText: 'Tidak Bisa Presensi',
    ctaTextColor: tokens.color.white,
    disabled: true,
  },
  queued: {
    colors: [tokens.color.blue500, tokens.color.blue700],
    label: 'PRESENSI MENUNGGU SYNC',
    labelColor: tokens.color.yellow300,
    ctaText: 'Presensi Masuk',
    ctaTextColor: tokens.color.blue700,
    disabled: false,
  },
};

export function ClockInHero({
  state,
  queueCount,
  onPressClockIn,
  onPressHistory,
  blockedReason,
  locationLine,
}: ClockInHeroProps): React.JSX.Element {
  const [now, setNow] = useState(tick());
  useEffect(() => {
    const id = setInterval(() => setNow(tick()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cfg = STATE_CONFIG[state];

  return (
    <Gradient colors={cfg.colors} angle={160} style={styles.card}>
      <Pressable
        onPress={onPressHistory}
        disabled={!onPressHistory}
        style={({ pressed }) => [styles.header, pressed && onPressHistory ? styles.headerPressed : null]}
      >
        <View style={styles.topRow}>
          <Text style={[styles.label, { color: cfg.labelColor }]}>{cfg.label}</Text>
          <View style={styles.dateRow}>
            <Text style={styles.date}>{formatDateLong()}</Text>
            {onPressHistory ? (
              <ChevronRight size={14} color="rgba(255,255,255,0.7)" />
            ) : null}
          </View>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.time}>{now}</Text>
          {locationLine ? (
            <View style={styles.locationRow}>
              <MapPin size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLine}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {state === 'blocked' && blockedReason ? (
        <Text style={styles.blockedText}>{blockedReason}</Text>
      ) : null}

      <Pressable
        onPress={onPressClockIn}
        disabled={cfg.disabled}
        style={({ pressed }) => [
          styles.cta,
          cfg.disabled
            ? styles.ctaDisabled
            : { backgroundColor: tokens.color.white },
          pressed && !cfg.disabled && styles.ctaPressed,
        ]}
      >
        <Text style={[styles.ctaText, { color: cfg.ctaTextColor }]}>{cfg.ctaText}</Text>
      </Pressable>

      {state === 'queued' && queueCount && queueCount > 0 ? (
        <View style={styles.queueStrip}>
          <Clock size={14} color={tokens.color.white} />
          <Text style={styles.queueText}>{queueCount} presensi menunggu sync</Text>
        </View>
      ) : null}
    </Gradient>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: tokens.spacing.sp4,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.sp3,
    ...tokens.shadow.md,
  },
  header: { gap: tokens.spacing.sp2, borderRadius: tokens.radius.md },
  headerPressed: { opacity: 0.85 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1 },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  date: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  timeRow: { gap: tokens.spacing.sp1_5 },
  time: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.timeHero,
    color: tokens.color.white,
    fontWeight: '700',
    lineHeight: tokens.lineHeight.timeHero,
    letterSpacing: -1,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1_5 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  blockedText: {
    fontSize: tokens.fontSize.body,
    color: tokens.color.white,
    opacity: 0.9,
    fontWeight: '600',
  },
  cta: {
    marginTop: tokens.spacing.sp3,
    minHeight: 52,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.md,
  },
  ctaDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
  },
  queueStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    marginTop: tokens.spacing.sp3,
    paddingVertical: 8,
    paddingHorizontal: tokens.spacing.sp3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: tokens.radius.sm,
  },
  queueText: { fontSize: 12, color: tokens.color.white, fontWeight: '600' },
});
