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
  /** Jam clock-in terakhir (format HH:MM). Tampil di state in_progress/done */
  checkInTime?: string;
  /** Indicator GPS aktif/tidak — pin icon di pojok kanan atas */
  gpsActive?: boolean;
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
    label: 'SUDAH MASUK',
    labelColor: tokens.color.yellow300,
    ctaText: 'Presensi Pulang',
    ctaTextColor: tokens.color.green700,
    disabled: false,
  },
  done: {
    // Pakai gradient blue sama dengan idle — supaya visually konsisten dengan
    // state "siap untuk presensi". Setelah pulang user mulai cycle baru.
    colors: [tokens.color.blue500, tokens.color.blue700],
    label: 'SUDAH PULANG',
    labelColor: tokens.color.yellow300,
    ctaText: 'Presensi Masuk Lagi',
    ctaTextColor: tokens.color.blue700,
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
  checkInTime,
  gpsActive,
}: ClockInHeroProps): React.JSX.Element {
  const [now, setNow] = useState(tick());
  useEffect(() => {
    const id = setInterval(() => setNow(tick()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cfg = STATE_CONFIG[state];
  const checkedIn = state === 'in_progress' || state === 'done';
  // Saat sudah presensi: tampilkan jam clock-in sebagai big time (lebih relevan
  // daripada current time yang sudah ada di status bar OS). Saat idle/blocked:
  // current time live update.
  const bigTimeText = checkedIn && checkInTime ? checkInTime : now;
  const subLabel = checkedIn
    ? state === 'in_progress'
      ? 'Jam masuk'
      : 'Jam pulang'
    : null;

  return (
    <Gradient colors={cfg.colors} angle={160} style={styles.card}>
      <Pressable
        onPress={onPressHistory}
        disabled={!onPressHistory}
        style={({ pressed }) => [styles.header, pressed && onPressHistory ? styles.headerPressed : null]}
      >
        <View style={styles.topRow}>
          <Text
            style={[styles.label, { color: cfg.labelColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {cfg.label}
          </Text>
          <View style={styles.dateRow}>
            <Text style={styles.date} numberOfLines={1}>
              {formatDateLong()}
            </Text>
            {onPressHistory ? (
              <ChevronRight size={14} color="rgba(255,255,255,0.7)" />
            ) : null}
          </View>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.time}>{bigTimeText}</Text>
          {subLabel ? <Text style={styles.subTime}>{subLabel}</Text> : null}
          <View style={styles.metaRow}>
            {gpsActive ? (
              <View style={styles.gpsPill}>
                <MapPin size={10} color={tokens.color.green300} />
                <Text style={styles.gpsText}>GPS AKTIF</Text>
              </View>
            ) : null}
            {locationLine ? (
              <View style={styles.locationRow}>
                <MapPin size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationLine}
                </Text>
              </View>
            ) : null}
          </View>
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
    ...tokens.shadow.sm,
  },
  header: { gap: tokens.spacing.sp2, borderRadius: tokens.radius.md },
  headerPressed: { opacity: 0.85 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1, flexShrink: 0 },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    flexShrink: 1,
  },
  date: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  timeRow: { gap: tokens.spacing.sp1_5 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    flexWrap: 'wrap',
  },
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
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(99,217,132,0.18)',
  },
  gpsText: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: tokens.color.green300,
  },
  subTime: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: -tokens.spacing.sp1,
  },
  blockedText: {
    fontSize: tokens.fontSize.body,
    color: tokens.color.white,
    opacity: 0.9,
    fontWeight: '600',
  },
  cta: {
    marginTop: tokens.spacing.sp2,
    minHeight: 48,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
