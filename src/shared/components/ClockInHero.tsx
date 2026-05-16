import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';
import { Gradient } from './Gradient';
import { tokens } from '@shared/theme/tokens';

export type ClockInHeroState = 'idle' | 'in_progress' | 'blocked' | 'queued';

export interface ClockInHeroProps {
  state: ClockInHeroState;
  /** Last clock-in info — shown di in_progress/idle saat ada history hari ini */
  lastClockIn?: { time: string; locationName?: string };
  /** Pending sync count for queued state */
  queueCount?: number;
  onPressClockIn: () => void;
  /** Label saat blocked, e.g. "Di luar area kantor" */
  blockedReason?: string;
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
    label: 'SIAP UNTUK ABSEN',
    labelColor: tokens.color.yellow300,
    ctaText: 'Absen Masuk',
    ctaTextColor: tokens.color.blue700,
    disabled: false,
  },
  in_progress: {
    colors: [tokens.color.green500, tokens.color.green700],
    label: 'SUDAH ABSEN MASUK',
    labelColor: tokens.color.yellow300,
    ctaText: 'Absen Pulang',
    ctaTextColor: tokens.color.green700,
    disabled: false,
  },
  blocked: {
    colors: [tokens.color.ink800, tokens.color.ink900],
    label: 'TIDAK BISA ABSEN',
    labelColor: tokens.color.error,
    ctaText: 'Tidak Bisa Absen',
    ctaTextColor: tokens.color.white,
    disabled: true,
  },
  queued: {
    colors: [tokens.color.blue500, tokens.color.blue700],
    label: 'ABSEN MENUNGGU SYNC',
    labelColor: tokens.color.yellow300,
    ctaText: 'Absen Masuk',
    ctaTextColor: tokens.color.blue700,
    disabled: false,
  },
};

export function ClockInHero({
  state,
  lastClockIn,
  queueCount,
  onPressClockIn,
  blockedReason,
}: ClockInHeroProps): React.JSX.Element {
  const [now, setNow] = useState(tick());
  useEffect(() => {
    const id = setInterval(() => setNow(tick()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cfg = STATE_CONFIG[state];

  return (
    <Gradient colors={cfg.colors} angle={160} style={styles.card}>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: cfg.labelColor }]}>{cfg.label}</Text>
        <Text style={styles.date}>{formatDateLong()}</Text>
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.time}>{now}</Text>
        {lastClockIn ? (
          <View style={styles.locationRow}>
            <MapPin size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {lastClockIn.locationName ?? 'Lokasi GPS'}
            </Text>
          </View>
        ) : null}
      </View>

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
          <Text style={styles.queueText}>{queueCount} absen menunggu sync</Text>
        </View>
      ) : null}

      {lastClockIn && state !== 'queued' ? (
        <View style={styles.lastInfo}>
          <Clock size={12} color="rgba(255,255,255,0.85)" />
          <Text style={styles.lastInfoText}>
            Absen terakhir {lastClockIn.time}
            {lastClockIn.locationName ? ` · ${lastClockIn.locationName}` : ''}
          </Text>
        </View>
      ) : null}
    </Gradient>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: tokens.spacing.sp4,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.sp2,
    minHeight: 200,
    ...tokens.shadow.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  timeRow: { gap: 6 },
  time: {
    fontFamily: tokens.font.mono,
    fontSize: 56,
    color: tokens.color.white,
    fontWeight: '700',
    lineHeight: 60,
    letterSpacing: -1,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
    gap: 8,
    marginTop: tokens.spacing.sp3,
    paddingVertical: 8,
    paddingHorizontal: tokens.spacing.sp3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: tokens.radius.sm,
  },
  queueText: { fontSize: 12, color: tokens.color.white, fontWeight: '600' },
  lastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: tokens.spacing.sp1,
  },
  lastInfoText: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
});
