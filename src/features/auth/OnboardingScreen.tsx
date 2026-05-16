import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import {
  DashboardIllustration,
  DigitalFormIllustration,
  GpsAttendanceIllustration,
} from './illustrations';
import { useAuthStore } from './store';
import type { AuthStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Absen cukup dari HP',
    body: 'Verifikasi lokasi GPS otomatis. Tidak perlu fingerprint rusak atau foto WhatsApp ke supervisor.',
    Illustration: GpsAttendanceIllustration,
  },
  {
    title: 'Cuti, klaim, kasbon',
    body: 'Ajukan semua permohonan langsung dari HP. Atasan dapat notifikasi instan.',
    Illustration: DigitalFormIllustration,
  },
  {
    title: 'Approve permohonan tim',
    body: 'Setujui cuti, klaim, atau kasbon karyawan di mana saja — tap tap selesai.',
    Illustration: DashboardIllustration,
  },
] as const;

export function OnboardingScreen({ navigation }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const markOnboardingSeen = useAuthStore((s) => s.markOnboardingSeen);

  const onScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) {
      setIndex(i);
    }
  };

  const finish = () => {
    markOnboardingSeen();
    navigation.replace('TenantCode');
  };

  const onContinue = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      scrollRef.current?.scrollTo({ x: width * next, animated: true });
      setIndex(next);
    } else {
      finish();
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {SLIDES.map((slide) => {
          const Illustration = slide.Illustration;
          return (
            <View key={slide.title} style={[styles.slide, { width }]}>
              <Illustration />
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          );
        })}
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
        <Button variant="ghost" fullWidth onPress={finish}>
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
