import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

export interface GradientProps {
  colors: [string, string] | [string, string, string];
  /** Direction in degrees (160 = top-left to bottom-right slightly steeper). Default 160. */
  angle?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function angleToPoints(angle: number): { x1: string; y1: string; x2: string; y2: string } {
  const rad = (angle * Math.PI) / 180;
  // Normalize so a "vertical" feel (180 deg) → top to bottom
  const x = Math.sin(rad);
  const y = -Math.cos(rad);
  return {
    x1: `${50 - x * 50}%`,
    y1: `${50 - y * 50}%`,
    x2: `${50 + x * 50}%`,
    y2: `${50 + y * 50}%`,
  };
}

let gradIdSeq = 0;
const nextGradId = () => `lgrad-${++gradIdSeq}`;

export function Gradient({ colors, angle = 160, style, children }: GradientProps): React.JSX.Element {
  const gradId = React.useMemo(() => nextGradId(), []);
  const { x1, y1, x2, y2 } = angleToPoints(angle);
  const stops = colors.map((c, i) => (
    <Stop key={`s-${i}`} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={c} stopOpacity="1" />
  ));

  return (
    <View style={[styles.container, style]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2}>
            {stops}
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});
