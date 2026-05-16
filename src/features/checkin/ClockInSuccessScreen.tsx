import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import type { HomeStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ClockInSuccess'>;

function formatTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ClockInSuccessScreen({ navigation, route }: Props): React.JSX.Element {
  const { result, logType } = route.params;
  const title = logType === 'IN' ? 'Absen Masuk Berhasil' : 'Absen Pulang Berhasil';

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CheckCircle2 size={80} color={tokens.color.green500} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.bigTimeBox}>
          <Text style={styles.bigTime}>{formatTime(result.serverTimestamp)}</Text>
          <Text style={styles.date}>{formatFullDate(result.serverTimestamp)}</Text>
        </View>
        {result.locationName ? (
          <Text style={styles.location}>📍 {result.locationName}</Text>
        ) : null}
        <View style={styles.ref}>
          <Text style={styles.refLabel}>NOMOR ABSEN</Text>
          <Text style={styles.refValue}>{result.name}</Text>
        </View>
      </View>
      <Button fullWidth onPress={() => navigation.popToTop()}>
        Kembali ke Beranda
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp3,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.green50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sp3,
  },
  title: {
    fontSize: tokens.fontSize.h2,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    textAlign: 'center',
  },
  bigTimeBox: { alignItems: 'center', gap: 4 },
  bigTime: {
    fontSize: 64,
    fontWeight: '800',
    color: tokens.color.green700,
    fontFamily: tokens.font.mono,
  },
  date: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3 },
  location: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg2 },
  ref: {
    marginTop: tokens.spacing.sp4,
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sp3,
    paddingVertical: tokens.spacing.sp2,
    backgroundColor: tokens.semantic.surface2,
    borderRadius: tokens.radius.md,
  },
  refLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  refValue: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg1,
    fontFamily: tokens.font.mono,
  },
});
