import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';
import { APP_NAME, VERSION } from '@config/appInfo';

/**
 * Sopwer Splash — motion assemble per design "Sopwer Splash (download).html".
 * Tiga segmen (biru/hijau/kuning) muncul dari arah berbeda lalu menyatu ke
 * center; wordmark + tagline + footer fade-up sesudahnya. Total ~2.7 detik
 * sebelum onFinish.
 */

const SEG_BLUE = require('@shared/assets/brand/seg-blue.png');
const SEG_GREEN = require('@shared/assets/brand/seg-green.png');
const SEG_YELLOW = require('@shared/assets/brand/seg-yellow.png');
const WORDMARK = require('@shared/assets/brand/sopwer-wordmark.png');

const LOGO_SIZE = 200;
const SEG_DISTANCE = LOGO_SIZE * 0.55;

// Timing dari design jsx — total ~2700ms (assemble 1720 + hold 600 + exit 420).
const ASSEMBLE_MS = 1720;
const HOLD_MS = 600;
const EXIT_MS = 420;

interface Segment {
  source: ReturnType<typeof require>;
  angle: number;
  delayRatio: number;
  durationRatio: number;
}

const SEGMENTS: Segment[] = [
  { source: SEG_BLUE, angle: Math.PI * 1.2, delayRatio: 0.0, durationRatio: 0.22 },
  { source: SEG_GREEN, angle: Math.PI * 1.8, delayRatio: 0.16, durationRatio: 0.24 },
  { source: SEG_YELLOW, angle: Math.PI * 0.4, delayRatio: 0.32, durationRatio: 0.24 },
];

export interface SplashViewProps {
  /**
   * Fired ketika animasi splash selesai (assemble + hold + exit). RootNavigator
   * pakai ini supaya app baru render setelah motion splash kelar.
   */
  onFinish?: () => void;
}

export function SplashView({ onFinish }: SplashViewProps): React.JSX.Element {
  const progress = useRef(SEGMENTS.map(() => new Animated.Value(0))).current;
  const wordmark = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const footer = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const seqAnims = SEGMENTS.map((seg, i) =>
      Animated.timing(progress[i], {
        toValue: 1,
        delay: seg.delayRatio * ASSEMBLE_MS,
        duration: seg.durationRatio * ASSEMBLE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    const textAnims = [
      Animated.timing(wordmark, {
        toValue: 1,
        delay: 700,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tagline, {
        toValue: 1,
        delay: 1000,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footer, {
        toValue: 1,
        delay: 1200,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ];

    const dotLoop = Animated.loop(
      Animated.stagger(
        180,
        dots.map((d) =>
          Animated.sequence([
            Animated.timing(d, {
              toValue: 1,
              duration: 480,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(d, {
              toValue: 0,
              duration: 720,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );

    Animated.parallel([...seqAnims, ...textAnims]).start();
    dotLoop.start();

    const exitTimer = setTimeout(() => {
      Animated.timing(exit, {
        toValue: 1,
        duration: EXIT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setFinished(true);
        onFinish?.();
      });
    }, ASSEMBLE_MS + HOLD_MS);

    return () => {
      clearTimeout(exitTimer);
      dotLoop.stop();
    };
  }, [progress, wordmark, tagline, footer, exit, dots, onFinish]);

  if (finished) {
    return <View style={styles.container} />;
  }

  const containerOpacity = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const containerScale = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity, transform: [{ scale: containerScale }] }]}
    >
      <View style={styles.dotsBackdrop} pointerEvents="none" />

      <View style={styles.center}>
        <View style={styles.logoBox}>
          {SEGMENTS.map((seg, i) => {
            const p = progress[i];
            const dx = p.interpolate({
              inputRange: [0, 1],
              outputRange: [Math.cos(seg.angle) * SEG_DISTANCE, 0],
            });
            const dy = p.interpolate({
              inputRange: [0, 1],
              outputRange: [Math.sin(seg.angle) * SEG_DISTANCE, 0],
            });
            const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
            return (
              <Animated.Image
                key={i}
                source={seg.source}
                style={[
                  styles.segment,
                  {
                    opacity: p,
                    transform: [{ translateX: dx }, { translateY: dy }, { scale }],
                  },
                ]}
                resizeMode="contain"
              />
            );
          })}
        </View>

        <Animated.View
          style={{
            opacity: wordmark,
            transform: [
              {
                translateY: wordmark.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              },
            ],
          }}
        >
          <Image source={WORDMARK} style={styles.wordmark} resizeMode="contain" />
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: tagline,
              transform: [
                {
                  translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                },
              ],
            },
          ]}
        >
          Maksimalkan Potensi. Dengan Mudah.
        </Animated.Text>
      </View>

      <Animated.View
        style={[
          styles.foot,
          {
            opacity: footer,
            transform: [
              {
                translateY: footer.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              },
            ],
          },
        ]}
      >
        <View style={styles.dotsLoader}>
          {dots.map((d, i) => {
            const color = d.interpolate({
              inputRange: [0, 1],
              outputRange: [tokens.color.ink200, tokens.semantic.brand],
            });
            const sc = d.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
            return (
              <Animated.View
                key={i}
                style={[styles.loaderDot, { backgroundColor: color, transform: [{ scale: sc }] }]}
              />
            );
          })}
        </View>
        <Text style={styles.footText}>{APP_NAME.toUpperCase()} · v{VERSION}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.paper,
    position: 'relative',
    overflow: 'hidden',
  },
  dotsBackdrop: {
    position: 'absolute',
    inset: 0,
    opacity: 0.4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  logoBox: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  wordmark: {
    width: 160,
    height: 32,
  },
  tagline: {
    fontFamily: tokens.font.display,
    fontSize: 13,
    fontWeight: '500',
    color: tokens.color.ink500,
    letterSpacing: -0.13,
    textAlign: 'center',
  },
  foot: {
    paddingBottom: 36,
    alignItems: 'center',
    gap: 14,
  },
  dotsLoader: {
    flexDirection: 'row',
    gap: 6,
  },
  loaderDot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
  },
  footText: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: tokens.color.ink400,
    fontWeight: '600',
  },
});
