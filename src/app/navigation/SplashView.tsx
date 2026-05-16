import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export function SplashView(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>Sopwer HRMS</Text>
      </View>
      <ActivityIndicator color={tokens.semantic.brand} />
      <Text style={styles.caption}>Memuat…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.bg,
    gap: tokens.spacing.sp4,
  },
  logo: {
    paddingHorizontal: tokens.spacing.sp4,
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.semantic.brand,
  },
  logoText: {
    color: tokens.color.white,
    fontSize: tokens.fontSize.h2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  caption: {
    color: tokens.semantic.fg3,
    fontSize: tokens.fontSize.small,
  },
});
