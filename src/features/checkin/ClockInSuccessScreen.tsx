import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Gradient } from '@shared/components/Gradient';
import { Screen } from '@shared/components/Screen';
import { VerificationBadge } from '@shared/components/VerificationBadge';
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
    <Gradient colors={[tokens.color.blue700, tokens.color.ink900]} angle={180} style={styles.bg}>
      <Screen style={styles.transparentBg} padded={false}>
        <View style={styles.content}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <CheckCircle2 size={42} color={tokens.color.white} strokeWidth={3} />
            </View>
          </View>

          <Text style={styles.eyebrow}>ABSEN BERHASIL</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.bigTime}>{formatTime(result.serverTimestamp)}</Text>
          <Text style={styles.date}>{formatFullDate(result.serverTimestamp)}</Text>

          <View style={styles.badgeWrap}>
            <VerificationBadge
              status={result.verificationStatus ?? 'Verified'}
              size="lg"
              dark
            />
          </View>

          <View style={styles.infoBox}>
            {result.locationName ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>LOKASI</Text>
                <Text style={styles.infoValue}>{result.locationName}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>NOMOR</Text>
              <Text style={styles.infoValue}>{result.name}</Text>
            </View>
            {result.verificationScore !== undefined ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>SKOR</Text>
                <Text style={styles.infoValue}>{result.verificationScore}/100</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cta}>
          <Button fullWidth onPress={() => navigation.popToTop()} style={styles.ctaBtn}>
            Kembali ke Beranda
          </Button>
        </View>
      </Screen>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  transparentBg: { backgroundColor: 'transparent' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.sp4,
    gap: tokens.spacing.sp2,
  },
  iconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(92, 171, 48, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sp3,
  },
  iconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: tokens.color.green500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    color: tokens.color.yellow300,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    fontSize: tokens.fontSize.h3,
    fontWeight: '700',
    color: tokens.color.white,
    textAlign: 'center',
    marginBottom: tokens.spacing.sp1,
  },
  bigTime: {
    fontFamily: tokens.font.display,
    fontSize: 48,
    color: tokens.color.white,
    fontWeight: '800',
    letterSpacing: -1,
  },
  date: {
    fontSize: tokens.fontSize.body,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: tokens.spacing.sp2,
  },
  badgeWrap: { marginVertical: tokens.spacing.sp2 },
  infoBox: {
    width: '100%',
    padding: tokens.spacing.sp3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.sp2,
    marginTop: tokens.spacing.sp3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoKey: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoValue: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.white,
    fontWeight: '700',
  },
  cta: {
    paddingHorizontal: tokens.spacing.sp4,
    paddingBottom: tokens.spacing.sp4,
  },
  ctaBtn: { backgroundColor: tokens.color.white },
});
