import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';

export function MyRequestsScreen(): React.JSX.Element {
  return (
    <Screen>
      <Text style={styles.title}>Permohonan Saya</Text>
      <Text style={styles.body}>Belum ada permohonan. Fitur ini aktif mulai Fase 3.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1, marginBottom: tokens.spacing.sp2 },
  body: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3 },
});
