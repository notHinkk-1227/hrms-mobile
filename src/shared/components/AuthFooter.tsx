import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';
import { APP_NAME, COMPANY_NAME, COMPANY_TAGLINE, getVersionLabel } from '@config/appInfo';

export function AuthFooter(): React.JSX.Element {
  const year = new Date().getFullYear();
  return (
    <View style={styles.footer}>
      <Text style={styles.version}>{getVersionLabel()}</Text>
      <Text style={styles.copyright}>
        © {year} {COMPANY_NAME}
      </Text>
      <Text style={styles.tagline}>
        {APP_NAME} · {COMPANY_TAGLINE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 'auto',
    paddingTop: tokens.spacing.sp4,
    alignItems: 'center',
    gap: tokens.spacing.sp1,
  },
  version: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.brand,
    fontWeight: '700',
    letterSpacing: 1,
  },
  copyright: {
    fontSize: tokens.fontSize.caption,
    color: tokens.semantic.fg3,
    fontWeight: '600',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
