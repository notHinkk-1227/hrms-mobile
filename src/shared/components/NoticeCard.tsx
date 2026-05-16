import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Info } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export type NoticeVariant = 'info' | 'warning' | 'error';

export interface NoticeCardProps {
  variant?: NoticeVariant;
  title?: string;
  body: string;
}

const CONFIG: Record<
  NoticeVariant,
  { bg: string; border: string; titleColor: string; bodyColor: string; icon: React.ReactNode }
> = {
  info: {
    bg: tokens.color.blue50,
    border: tokens.color.blue100,
    titleColor: tokens.color.blue700,
    bodyColor: tokens.color.blue700,
    icon: <Info size={18} color={tokens.color.blue600} strokeWidth={2.5} />,
  },
  warning: {
    bg: tokens.color.yellow50,
    border: tokens.color.yellow100,
    titleColor: tokens.color.yellow700,
    bodyColor: tokens.color.yellow700,
    icon: <AlertCircle size={18} color={tokens.color.yellow600} strokeWidth={2.5} />,
  },
  error: {
    bg: tokens.color.errorTint,
    border: tokens.color.error,
    titleColor: tokens.color.error,
    bodyColor: tokens.color.error,
    icon: <AlertCircle size={18} color={tokens.color.error} strokeWidth={2.5} />,
  },
};

export function NoticeCard({ variant = 'info', title, body }: NoticeCardProps): React.JSX.Element {
  const cfg = CONFIG[variant];
  return (
    <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={styles.iconWrap}>{cfg.icon}</View>
      <View style={styles.text}>
        {title ? <Text style={[styles.title, { color: cfg.titleColor }]}>{title}</Text> : null}
        <Text style={[styles.body, { color: cfg.bodyColor }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: tokens.spacing.sp2,
    padding: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  iconWrap: { marginTop: 2 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: tokens.fontSize.small, fontWeight: '700' },
  body: { fontSize: tokens.fontSize.small, lineHeight: 18 },
});
