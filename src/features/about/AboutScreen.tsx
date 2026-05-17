import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, Globe, Mail } from 'lucide-react-native';
import { Screen } from '@shared/components/Screen';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import {
  APP_NAME,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  getVersionLabel,
} from '@config/appInfo';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'About'>;

const LOGO_FULL = require('@shared/assets/brand/logo-full.png');

const CURRENT_YEAR = new Date().getFullYear();

export function AboutScreen({ navigation }: Props): React.JSX.Element {
  return (
    <Screen>
      <FormHeader title="Tentang Aplikasi" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.logoCard}>
            <Image source={LOGO_FULL} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.version}>{getVersionLabel()}</Text>
          <Text style={styles.tagline}>{COMPANY_TAGLINE}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TENTANG</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              {APP_NAME} adalah aplikasi HRMS mobile dari {COMPANY_NAME} yang
              memudahkan karyawan mengelola presensi, cuti, klaim, kasbon, dan
              permohonan lain langsung dari ponsel. Dirancang untuk
              perusahaan operasional yang butuh manajemen kehadiran yang cepat,
              akurat, dan terverifikasi.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PENGEMBANG</Text>
          <View style={styles.card}>
            <Row
              icon={<Building2 size={18} color={tokens.semantic.fg3} />}
              label="Perusahaan"
              value={COMPANY_NAME}
            />
            <Row
              icon={<Globe size={18} color={tokens.semantic.fg3} />}
              label="Website"
              value="sopwer.id"
              onPress={() =>
                Linking.openURL('https://sopwer.id').catch(() => undefined)
              }
            />
            <Row
              icon={<Mail size={18} color={tokens.semantic.fg3} />}
              label="Email"
              value="halo@sopwer.id"
              onPress={() =>
                Linking.openURL('mailto:halo@sopwer.id').catch(() => undefined)
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HAK CIPTA</Text>
          <View style={styles.card}>
            <Text style={styles.copyright}>
              © {CURRENT_YEAR} {COMPANY_NAME}.{'\n'}
              Seluruh hak dilindungi.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}

function Row({ icon, label, value, onPress }: RowProps): React.JSX.Element {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, onPress && styles.rowValueLink]}>{value}</Text>
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} hitSlop={4}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  hero: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.sp4,
    gap: tokens.spacing.sp2,
  },
  logoCard: {
    width: 240,
    paddingVertical: tokens.spacing.sp3,
    paddingHorizontal: tokens.spacing.sp3,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.semantic.surface,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    alignItems: 'center',
  },
  logoImage: { width: 200, height: 78 },
  appName: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h2,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    marginTop: tokens.spacing.sp2,
  },
  version: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.small,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
  },
  tagline: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: tokens.semantic.brand,
    textTransform: 'uppercase',
    marginTop: tokens.spacing.sp1,
  },
  section: { gap: tokens.spacing.sp2 },
  sectionLabel: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
  },
  card: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp3,
  },
  body: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg2,
    lineHeight: tokens.lineHeight.body,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp3 },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { flex: 1, gap: tokens.spacing.sp1 },
  rowLabel: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  rowValue: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
  rowValueLink: { color: tokens.semantic.brand },
  copyright: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    textAlign: 'center',
    lineHeight: tokens.lineHeight.small,
  },
});
