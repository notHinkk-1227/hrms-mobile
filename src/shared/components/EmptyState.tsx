import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { tokens } from '@shared/theme/tokens';

export type EmptyStateTone = 'default' | 'error';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void };
  /** 'error' = ikon background merah, judul + subtitle merah. Default = netral. */
  tone?: EmptyStateTone;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  cta,
  tone = 'default',
}: EmptyStateProps): React.JSX.Element {
  const isError = tone === 'error';
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, isError && styles.iconWrapError]}>{icon}</View>
      <Text style={[styles.title, isError && styles.titleError]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, isError && styles.subtitleError]}>{subtitle}</Text>
      ) : null}
      {cta ? (
        <Button onPress={cta.onPress} size="md" variant="outline" style={styles.cta}>
          {cta.label}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.sp6,
    paddingHorizontal: tokens.spacing.sp4,
    gap: tokens.spacing.sp2,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.color.ink50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sp2,
  },
  iconWrapError: {
    backgroundColor: tokens.color.errorTint,
  },
  title: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    textAlign: 'center',
  },
  titleError: {
    color: tokens.color.error,
  },
  subtitle: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  subtitleError: {
    color: tokens.color.error,
  },
  cta: { marginTop: tokens.spacing.sp3 },
});
