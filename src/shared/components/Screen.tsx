import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '@shared/theme/tokens';

export interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Default true — include bottom safe area inset supaya tidak ketutup nav bar Android. */
  bottomInset?: boolean;
}

export function Screen({
  children,
  style,
  padded = true,
  bottomInset = true,
}: ScreenProps): React.JSX.Element {
  const edges: Edge[] = bottomInset ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right'];
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View style={[styles.container, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.semantic.bg },
  container: { flex: 1, backgroundColor: tokens.semantic.bg },
  padded: { paddingHorizontal: tokens.spacing.sp4, paddingVertical: tokens.spacing.sp4 },
});
