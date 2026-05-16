import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export type VerificationStatus = 'Verified' | 'Suspicious' | 'Flagged';

export interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'lg';
  /** Light mode default; dark mode kalau di atas card gelap (Hero, success bg dark) */
  dark?: boolean;
}

const COPY: Record<VerificationStatus, string> = {
  Verified: 'Terverifikasi',
  Suspicious: 'Perlu Verifikasi',
  Flagged: 'Tidak Sah',
};

interface VariantStyle {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
}

function getVariant(status: VerificationStatus, dark: boolean, iconSize: number): VariantStyle {
  switch (status) {
    case 'Verified':
      return dark
        ? {
            bg: 'rgba(255,255,255,0.16)',
            text: tokens.color.white,
            border: 'rgba(255,255,255,0.2)',
            icon: <CheckCircle2 size={iconSize} color={tokens.color.white} />,
          }
        : {
            bg: tokens.color.green50,
            text: tokens.color.green700,
            border: tokens.color.green200,
            icon: <CheckCircle2 size={iconSize} color={tokens.color.green600} />,
          };
    case 'Suspicious':
      return dark
        ? {
            bg: 'rgba(251, 178, 23, 0.22)',
            text: tokens.color.yellow300,
            border: 'rgba(251, 178, 23, 0.4)',
            icon: <AlertCircle size={iconSize} color={tokens.color.yellow300} />,
          }
        : {
            bg: tokens.color.yellow50,
            text: tokens.color.yellow700,
            border: tokens.color.yellow200,
            icon: <AlertCircle size={iconSize} color={tokens.color.yellow600} />,
          };
    case 'Flagged':
      return dark
        ? {
            bg: 'rgba(220, 38, 38, 0.2)',
            text: tokens.color.white,
            border: 'rgba(220, 38, 38, 0.5)',
            icon: <XCircle size={iconSize} color={tokens.color.white} />,
          }
        : {
            bg: tokens.color.errorTint,
            text: tokens.color.error,
            border: tokens.color.error,
            icon: <XCircle size={iconSize} color={tokens.color.error} />,
          };
  }
}

export function VerificationBadge({
  status,
  size = 'sm',
  dark = false,
}: VerificationBadgeProps): React.JSX.Element {
  const iconSize = size === 'lg' ? 16 : 14;
  const variant = getVariant(status, dark, iconSize);
  return (
    <View
      style={[
        styles.badge,
        size === 'lg' ? styles.lg : styles.sm,
        { backgroundColor: variant.bg, borderColor: variant.border },
      ]}
    >
      {variant.icon}
      <Text
        style={[
          styles.text,
          size === 'lg' ? styles.textLg : styles.textSm,
          { color: variant.text },
        ]}
      >
        {COPY[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 12, paddingVertical: 6 },
  lg: { paddingHorizontal: 16, paddingVertical: 10 },
  text: { fontWeight: '600' },
  textSm: { fontSize: 12 },
  textLg: { fontSize: 14 },
});
