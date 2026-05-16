import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Gradient } from '@shared/components/Gradient';
import { tokens } from '@shared/theme/tokens';

export function SplashView(): React.JSX.Element {
  return (
    <Gradient
      colors={[tokens.color.blue700, tokens.color.ink900]}
      angle={180}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
        </View>
        <Text style={styles.title}>Sopwer HRMS</Text>
        <Text style={styles.tagline}>MAKSIMALKAN POTENSI KARYAWAN</Text>
        <ActivityIndicator color={tokens.color.yellow300} style={styles.spinner} />
        <Text style={styles.caption}>Memuat…</Text>
      </View>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sp3 },
  logoBox: {
    width: 104,
    height: 104,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.color.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.lg,
    marginBottom: tokens.spacing.sp2,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.blue500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontFamily: tokens.font.display,
    fontSize: 40,
    fontWeight: '800',
    color: tokens.color.white,
  },
  title: {
    fontFamily: tokens.font.display,
    fontSize: 28,
    fontWeight: '800',
    color: tokens.color.white,
    letterSpacing: -0.5,
  },
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
});
