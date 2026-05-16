import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { tokens } from '@shared/theme/tokens';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, cta }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  title: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  cta: { marginTop: tokens.spacing.sp3 },
});
