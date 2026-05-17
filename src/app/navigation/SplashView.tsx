import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Gradient } from '@shared/components/Gradient';
import { tokens } from '@shared/theme/tokens';
import { COMPANY_NAME, getVersionLabel } from '@config/appInfo';

const LOGO_FULL = require('@shared/assets/brand/logo-full.png');

export function SplashView(): React.JSX.Element {
  return (
    <Gradient
      colors={[tokens.color.blue700, tokens.color.ink900]}
      angle={180}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.logoCard}>
          <Image source={LOGO_FULL} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.tagline}>MAKSIMALKAN POTENSI KARYAWAN</Text>
        <ActivityIndicator color={tokens.color.yellow300} style={styles.spinner} />
        <Text style={styles.caption}>Memuat…</Text>
      </View>
      <View style={styles.versionWrap} pointerEvents="none">
        <Text style={styles.versionText}>{getVersionLabel()}</Text>
        <Text style={styles.copyright}>
          © {new Date().getFullYear()} {COMPANY_NAME}
        </Text>
      </View>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sp3 },
  logoCard: {
    width: 280,
    paddingVertical: tokens.spacing.sp4,
    paddingHorizontal: tokens.spacing.sp4,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.color.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.lg,
    marginBottom: tokens.spacing.sp2,
  },
  logoImage: { width: 240, height: 93 },
  tagline: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.yellow300,
    letterSpacing: 1.8,
  },
  spinner: { marginTop: tokens.spacing.sp3 },
  caption: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: tokens.fontSize.small,
  },
  versionWrap: {
    position: 'absolute',
    bottom: tokens.spacing.sp5,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: tokens.spacing.sp1,
  },
  versionText: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.color.yellow300,
  },
  copyright: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
