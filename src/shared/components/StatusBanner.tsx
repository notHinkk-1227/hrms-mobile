import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export type BannerStatus = 'approved' | 'pending' | 'rejected' | 'draft';

export interface StatusBannerProps {
  status: BannerStatus;
  title: string;
  subtitle?: string;
}

const CONFIG: Record<
  BannerStatus,
  { bg: string; border: string; label: string; labelColor: string; titleColor: string; subColor: string; icon: (size: number, color: string) => React.ReactNode }
> = {
  approved: {
    bg: tokens.color.green50,
    border: tokens.color.green200,
    label: 'DISETUJUI',
    labelColor: tokens.color.green700,
    titleColor: tokens.color.green700,
    subColor: tokens.color.green600,
    icon: (size, color) => <CheckCircle2 size={size} color={color} strokeWidth={2.5} />,
  },
  pending: {
    bg: tokens.color.blue50,
    border: tokens.color.blue100,
    label: 'MENUNGGU',
    labelColor: tokens.color.blue700,
    titleColor: tokens.color.blue700,
    subColor: tokens.color.blue600,
    icon: (size, color) => <Clock size={size} color={color} strokeWidth={2.5} />,
  },
  rejected: {
    bg: tokens.color.errorTint,
    border: tokens.color.error,
    label: 'DITOLAK',
    labelColor: tokens.color.error,
    titleColor: tokens.color.error,
    subColor: tokens.color.error,
    icon: (size, color) => <XCircle size={size} color={color} strokeWidth={2.5} />,
  },
  draft: {
    bg: tokens.color.yellow50,
    border: tokens.color.yellow100,
    label: 'DRAF',
    labelColor: tokens.color.yellow700,
    titleColor: tokens.color.yellow700,
    subColor: tokens.color.yellow600,
    icon: (size, color) => <AlertCircle size={size} color={color} strokeWidth={2.5} />,
  },
};

export function StatusBanner({ status, title, subtitle }: StatusBannerProps): React.JSX.Element {
  const cfg = CONFIG[status];
  return (
    <View style={[styles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={styles.iconWrap}>{cfg.icon(28, cfg.labelColor)}</View>
      <View style={styles.text}>
        <Text style={[styles.label, { color: cfg.labelColor }]}>{cfg.label}</Text>
        <Text style={[styles.title, { color: cfg.titleColor }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: cfg.subColor }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    padding: tokens.spacing.sp3,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  iconWrap: {},
  text: { flex: 1, gap: 2 },
  label: {
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: { fontSize: tokens.fontSize.h4, fontWeight: '700' },
  sub: { fontSize: tokens.fontSize.small },
});
