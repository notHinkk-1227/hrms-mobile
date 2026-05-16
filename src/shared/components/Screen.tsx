import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '@shared/theme/tokens';

export interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Screen({ children, style, padded = true }: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={[styles.container, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.semantic.bg },
  container: { flex: 1, backgroundColor: tokens.semantic.bg },
  padded: { paddingHorizontal: tokens.spacing.sp4, paddingVertical: tokens.spacing.sp4 },
});
