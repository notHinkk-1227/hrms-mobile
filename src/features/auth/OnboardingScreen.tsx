import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from './store';
import type { AuthStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Absen dengan GPS',
    body: 'Verifikasi lokasi otomatis saat absen, tanpa fingerprint rusak atau foto WhatsApp.',
    accent: tokens.semantic.brand,
  },
  {
    title: 'Form Digital',
    body: 'Ajukan cuti, klaim reimbursement, kasbon, langsung dari HP. Approval cepat.',
    accent: tokens.color.green500,
  },
  {
    title: 'Dashboard di Genggaman',
    body: 'Lihat slip gaji, sisa cuti, riwayat absen kapan saja. Tidak perlu tanya HR.',
    accent: tokens.color.yellow400,
  },
] as const;

export function OnboardingScreen({ navigation }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const markOnboardingSeen = useAuthStore((s) => s.markOnboardingSeen);

  const onScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) {
      setIndex(i);
    }
  };

  const onContinue = () => {
    markOnboardingSeen();
    navigation.replace('TenantCode');
  };

  return (
    <Screen padded={false}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={[styles.illustration, { backgroundColor: slide.accent }]}>
              <Text style={styles.illustrationText}>{slide.title.split(' ')[0]}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.cta}>
        <Button fullWidth onPress={onContinue}>
          {index === SLIDES.length - 1 ? 'Mulai' : 'Lanjut'}
        </Button>
        <Button variant="ghost" fullWidth onPress={onContinue}>
          Lewati
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.sp4,
    gap: tokens.spacing.sp4,
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationText: {
    color: tokens.color.white,
    fontSize: tokens.fontSize.h1,
    fontWeight: '800',
  },
  title: {
    fontSize: tokens.fontSize.h1,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    textAlign: 'center',
  },
  body: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg3,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
    paddingVertical: tokens.spacing.sp3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.ink200,
  },
  dotActive: { backgroundColor: tokens.semantic.brand, width: 24 },
  cta: {
    paddingHorizontal: tokens.spacing.sp4,
    paddingBottom: tokens.spacing.sp4,
    gap: tokens.spacing.sp2,
  },
});
