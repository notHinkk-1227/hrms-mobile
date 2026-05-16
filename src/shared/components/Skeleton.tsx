import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius = 6, style }: SkeletonProps): React.JSX.Element {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

interface SkeletonRowProps {
  lines?: number;
}

export function SkeletonRow({ lines = 2 }: SkeletonRowProps): React.JSX.Element {
  return (
    <View style={styles.rowCard}>
      <Skeleton width={'40%'} height={10} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={`l-${i}`} width={i === lines - 1 ? '70%' : '100%'} height={14} style={styles.line} />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }): React.JSX.Element {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={`row-${i}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: tokens.color.ink100 },
  rowCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: 10,
  },
  line: { marginTop: 4 },
  list: { gap: tokens.spacing.sp2 },
});
