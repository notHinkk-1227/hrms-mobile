import React from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export interface GradientProps {
  colors: [string, string] | [string, string, string];
  angle?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function angleToPoints(angle: number): {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
} {
  const rad = (angle * Math.PI) / 180;

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

export function Gradient({
  colors,
  angle = 160,
  style,
  children,
}: GradientProps): React.JSX.Element {
  const gradId = React.useMemo(() => nextGradId(), []);

  const [size, setSize] = React.useState({
    width: 0,
    height: 0,
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;

    setSize({ width, height });
  };

  const { x1, y1, x2, y2 } = angleToPoints(angle);

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2}>
            {colors.map((c, i) => (
              <Stop
                key={`s-${i}`}
                offset={`${(i / (colors.length - 1)) * 100}%`}
                stopColor={c}
                stopOpacity="1"
              />
            ))}
          </SvgLinearGradient>
        </Defs>

        <Rect
          width={size.width}
          height={size.height}
          fill={`url(#${gradId})`}
        />
      </Svg>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});