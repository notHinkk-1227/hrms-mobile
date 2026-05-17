import { StyleSheet, TextStyle } from 'react-native';
import { tokens } from './tokens';

/**
 * Shared text patterns yang dipakai berulang di banyak screen.
 * Hindari duplikasi style — import dari sini.
 */

export const eyebrowStyle: TextStyle = {
  fontFamily: tokens.font.mono,
  fontSize: tokens.fontSize.eyebrow,
  fontWeight: '700',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: tokens.semantic.fg3,
};

export const sectionLabelStyle: TextStyle = {
  fontFamily: tokens.font.mono,
  fontSize: tokens.fontSize.eyebrow,
  fontWeight: '700',
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: tokens.semantic.fg3,
};

export const monoTextStyle: TextStyle = {
  fontFamily: tokens.font.mono,
};

export const textStyles = StyleSheet.create({
  eyebrow: eyebrowStyle,
  sectionLabel: sectionLabelStyle,
});
