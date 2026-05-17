import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, Copy, Mail, MessageCircle, Phone, User } from 'lucide-react-native';
import { Avatar } from '@shared/components/Avatar';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { useToast } from '@shared/components/Toast';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import {
  EmployeeContact,
  getEmployeeContact,
} from '@infrastructure/api/employeeClient';
import { ApiError } from '@infrastructure/api/errors';
import {
  copyToClipboard,
  dialPhone,
  formatPhoneDisplay,
  openWhatsApp,
} from '@shared/utils/contactActions';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'EmployeeDetail'>;

export function EmployeeDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const toast = useToast();
  const { name } = route.params;
  const [contact, setContact] = useState<EmployeeContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getEmployeeContact(name)
      .then((data) => {
        if (active) setContact(data);
      })
      .catch((e: ApiError) => {
        if (active) setError(e.message || 'Gagal memuat data karyawan');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [name]);

  const phone = contact?.cell_number ?? null;
  const email = contact?.company_email ?? contact?.personal_email ?? null;

  return (
    <Screen>
      <FormHeader title="Karyawan" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList count={3} />
        </View>
      ) : error || !contact ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Karyawan tidak ditemukan'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroWrap}>
            <Avatar name={contact.employee_name} imageUri={contact.image} size="xl" />
            <Text style={styles.name}>{contact.employee_name}</Text>
            {contact.designation ? (
              <Text style={styles.designation}>{contact.designation}</Text>
            ) : null}
            {contact.department ? (
              <Text style={styles.department}>{contact.department}</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>KONTAK</Text>
            <View style={styles.card}>
              {phone ? (
                <>
                  <View style={styles.field}>
                    <View style={styles.fieldHead}>
                      <Phone size={16} color={tokens.semantic.fg3} />
                      <Text style={styles.fieldLabel}>Nomor HP</Text>
                    </View>
                    <Text style={styles.fieldValue}>{formatPhoneDisplay(phone)}</Text>
                    <View style={styles.actionsRow}>
                      <ActionPill
                        icon={<MessageCircle size={14} color={tokens.color.green700} />}
                        label="WhatsApp"
                        bg={tokens.color.green50}
                        onPress={() =>
                          openWhatsApp(phone).catch(() =>
                            toast.show({ variant: 'error', message: 'Gagal buka WhatsApp' }),
                          )
                        }
                      />
                      <ActionPill
                        icon={<Phone size={14} color={tokens.color.blue700} />}
                        label="Telepon"
                        bg={tokens.color.blue50}
                        onPress={() =>
                          dialPhone(phone).catch(() =>
                            toast.show({ variant: 'error', message: 'Gagal panggil' }),
                          )
                        }
                      />
                      <ActionPill
                        icon={<Copy size={14} color={tokens.color.yellow700} />}
                        label="Salin"
                        bg={tokens.color.yellow50}
                        onPress={() => {
                          copyToClipboard(phone);
                          toast.show({ variant: 'success', message: 'Nomor disalin' });
                        }}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.empty}>Nomor HP tidak tersedia</Text>
              )}

              {email ? (
                <View style={styles.field}>
                  <View style={styles.fieldHead}>
                    <Mail size={16} color={tokens.semantic.fg3} />
                    <Text style={styles.fieldLabel}>Email</Text>
                  </View>
                  <Text style={styles.fieldValue}>{email}</Text>
                  <View style={styles.actionsRow}>
                    <ActionPill
                      icon={<Copy size={14} color={tokens.color.yellow700} />}
                      label="Salin"
                      bg={tokens.color.yellow50}
                      onPress={() => {
                        copyToClipboard(email);
                        toast.show({ variant: 'success', message: 'Email disalin' });
                      }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INFORMASI</Text>
            <View style={styles.card}>
              {contact.designation ? (
                <Row icon={<User size={16} color={tokens.semantic.fg3} />} label="Jabatan" value={contact.designation} />
              ) : null}
              {contact.department ? (
                <Row icon={<Building2 size={16} color={tokens.semantic.fg3} />} label="Departemen" value={contact.department} />
              ) : null}
              {contact.branch ? (
                <Row icon={<Building2 size={16} color={tokens.semantic.fg3} />} label="Cabang" value={contact.branch} />
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionPill({
  icon,
  label,
  bg,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pill, { backgroundColor: bg }, pressed && styles.pillPressed]}
      onPress={onPress}
    >
      {icon}
      <Text style={styles.pillLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: tokens.spacing.sp5, gap: tokens.spacing.sp4 },
  skeletonWrap: { paddingVertical: tokens.spacing.sp2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.sp4 },
  errorText: { fontSize: tokens.fontSize.small, color: tokens.color.error, textAlign: 'center' },
  heroWrap: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.sp4,
    gap: tokens.spacing.sp2,
  },
  name: {
    fontFamily: tokens.font.display,
    fontSize: tokens.fontSize.h2,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    textAlign: 'center',
  },
  designation: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg2, fontWeight: '600' },
  department: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
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
  field: { gap: tokens.spacing.sp1 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1_5 },
  fieldLabel: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3, fontWeight: '600' },
  fieldValue: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
  empty: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: tokens.spacing.sp2, marginTop: tokens.spacing.sp1, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1_5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: tokens.radius.full },
  pillPressed: { opacity: 0.85 },
  pillLabel: { fontSize: tokens.fontSize.small, fontWeight: '600', color: tokens.semantic.fg1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp3 },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  rowValue: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
});
