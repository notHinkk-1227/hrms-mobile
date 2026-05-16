import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export type StatusVariant = 'success' | 'warning' | 'error' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
}

const COLOR_MAP: Record<
  StatusVariant,
  { bg: string; fg: string; border: string }
> = {
  success: { bg: tokens.color.green50, fg: tokens.color.green700, border: tokens.color.green200 },
  warning: { bg: tokens.color.yellow50, fg: tokens.color.yellow700, border: tokens.color.yellow200 },
  error: { bg: tokens.color.errorTint, fg: tokens.color.error, border: tokens.color.error },
  neutral: { bg: tokens.color.ink50, fg: tokens.color.ink600, border: tokens.color.ink200 },
};

export function StatusBadge({ label, variant }: StatusBadgeProps): React.JSX.Element {
  const c = COLOR_MAP[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.spacing.sp2,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: tokens.fontSize.caption,
    fontWeight: '700',
  },
});
