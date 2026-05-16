import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export type BalanceCardVariant = 'green' | 'yellow' | 'blue';

export interface BalanceCardProps {
  variant: BalanceCardVariant;
  icon: React.ReactNode;
  title: string;
  value: string;
  endLabel?: string;
  endValue?: string;
}

const VARIANT_STYLE: Record<
  BalanceCardVariant,
  { bg: string; border: string; titleColor: string; valueColor: string; endColor: string; iconBg: string }
> = {
  green: {
    bg: tokens.color.green50,
    border: tokens.color.green100,
    titleColor: tokens.color.green700,
    valueColor: tokens.semantic.fg1,
    endColor: tokens.color.green700,
    iconBg: tokens.color.green100,
  },
  yellow: {
    bg: tokens.color.yellow50,
    border: tokens.color.yellow100,
    titleColor: tokens.color.yellow700,
    valueColor: tokens.semantic.fg1,
    endColor: tokens.color.yellow700,
    iconBg: tokens.color.yellow100,
  },
  blue: {
    bg: tokens.color.blue50,
    border: tokens.color.blue100,
    titleColor: tokens.color.blue700,
    valueColor: tokens.semantic.fg1,
    endColor: tokens.color.blue700,
    iconBg: tokens.color.blue100,
  },
};

export function BalanceCard({
  variant,
  icon,
  title,
  value,
  endLabel,
  endValue,
}: BalanceCardProps): React.JSX.Element {
  const v = VARIANT_STYLE[variant];
  return (
    <View style={[styles.card, { backgroundColor: v.bg, borderColor: v.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: v.iconBg }]}>{icon}</View>
      <View style={styles.meta}>
        <Text style={[styles.title, { color: v.titleColor }]}>{title}</Text>
        <Text style={[styles.value, { color: v.valueColor }]}>{value}</Text>
      </View>
      {endLabel && endValue ? (
        <View style={styles.end}>
          <Text style={[styles.endLabel, { color: v.endColor }]}>{endLabel}</Text>
          <Text style={[styles.endValue, { color: v.endColor }]}>{endValue}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.spacing.sp2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  title: {
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: tokens.fontSize.h2,
    fontWeight: '800',
    marginTop: 2,
  },
  end: { alignItems: 'flex-end' },
  endLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  endValue: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    fontWeight: '700',
  },
});
