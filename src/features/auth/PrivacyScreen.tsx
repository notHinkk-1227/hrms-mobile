import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from './store';

const BULLETS = [
  {
    title: 'Lokasi GPS',
    body: 'Aplikasi mengambil lokasi GPS Anda saat presensi masuk dan presensi pulang untuk verifikasi kehadiran. Lokasi tidak diambil di luar momen presensi.',
  },
  {
    title: 'Foto Selfie',
    body: 'Aplikasi mengambil foto selfie saat presensi untuk verifikasi identitas. Foto disimpan di server perusahaan Anda.',
  },
  {
    title: 'Data Anda',
    body: 'Semua data karyawan disimpan di server perusahaan Anda, bukan di server Sopwer. Sopwer tidak memiliki akses langsung ke data ini.',
  },
  {
    title: 'Sesuai UU PDP',
    body: 'Pengumpulan data ini sesuai dengan UU Perlindungan Data Pribadi (UU 27/2022). Anda dapat menolak dengan tidak menggunakan fitur presensi.',
  },
] as const;

export function PrivacyScreen(): React.JSX.Element {
  const acceptPrivacy = useAuthStore((s) => s.acceptPrivacy);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PERSETUJUAN</Text>
          <Text style={styles.title}>Privasi & Pengumpulan Data</Text>
          <Text style={styles.body}>
            Sebelum mulai menggunakan aplikasi, mohon baca dan setujui kebijakan privasi berikut.
          </Text>
        </View>
        <View style={styles.bullets}>
          {BULLETS.map((b) => (
            <View key={b.title} style={styles.bulletCard}>
              <Text style={styles.bulletTitle}>{b.title}</Text>
              <Text style={styles.bulletBody}>{b.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.cta}>
        <Button fullWidth onPress={acceptPrivacy}>
          Saya Setuju
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: tokens.spacing.sp4,
    gap: tokens.spacing.sp4,
  },
  header: { gap: tokens.spacing.sp2 },
  eyebrow: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: { fontSize: tokens.fontSize.h1, fontWeight: '800', color: tokens.semantic.fg1 },
  body: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3, lineHeight: 22 },
  bullets: { gap: tokens.spacing.sp3 },
  bulletCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp1_5,
  },
  bulletTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  bulletBody: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3, lineHeight: 20 },
  cta: {
    padding: tokens.spacing.sp4,
    backgroundColor: tokens.semantic.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.line,
  },
});
