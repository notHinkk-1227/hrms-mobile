import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Copy, ExternalLink, MessageCircle, Phone } from 'lucide-react-native';
import { BottomSheet } from '@shared/components/BottomSheet';
import { tokens } from '@shared/theme/tokens';
import { useToast } from '@shared/components/Toast';
import {
  copyToClipboard,
  dialPhone,
  formatPhoneDisplay,
  openWhatsApp,
} from '@shared/utils/contactActions';
import type { EmployeeContact } from '@infrastructure/api/employeeClient';

export interface EmployeeActionSheetProps {
  contact: EmployeeContact | null;
  onClose: () => void;
  onOpenDetail: (name: string) => void;
}

export function EmployeeActionSheet({
  contact,
  onClose,
  onOpenDetail,
}: EmployeeActionSheetProps): React.JSX.Element {
  const toast = useToast();
  const phone = contact?.cell_number ?? null;

  const handleWA = () => {
    if (!phone) return;
    openWhatsApp(phone).catch(() => toast.show({ variant: 'error', message: 'Gagal buka WhatsApp' }));
    onClose();
  };
  const handleCall = () => {
    if (!phone) return;
    dialPhone(phone).catch(() => toast.show({ variant: 'error', message: 'Gagal panggil nomor' }));
    onClose();
  };
  const handleCopy = () => {
    if (!phone) return;
    copyToClipboard(phone);
    toast.show({ variant: 'success', message: 'Nomor disalin' });
    onClose();
  };
  const handleDetail = () => {
    if (!contact) return;
    onClose();
    onOpenDetail(contact.name);
  };

  return (
    <BottomSheet visible={!!contact} title={contact?.employee_name ?? 'Karyawan'} onClose={onClose}>
      {contact ? (
        <View style={styles.body}>
          {contact.designation || contact.department ? (
            <Text style={styles.subtitle}>
              {[contact.designation, contact.department].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {phone ? (
            <Text style={styles.phone}>{formatPhoneDisplay(phone)}</Text>
          ) : (
            <Text style={styles.phoneEmpty}>Nomor HP tidak tersedia</Text>
          )}

          {phone ? (
            <View style={styles.actions}>
              <ActionButton
                icon={<MessageCircle size={20} color={tokens.color.green700} />}
                label="WhatsApp"
                bg={tokens.color.green50}
                onPress={handleWA}
              />
              <ActionButton
                icon={<Phone size={20} color={tokens.color.blue700} />}
                label="Telepon"
                bg={tokens.color.blue50}
                onPress={handleCall}
              />
              <ActionButton
                icon={<Copy size={20} color={tokens.color.yellow700} />}
                label="Salin"
                bg={tokens.color.yellow50}
                onPress={handleCopy}
              />
              <ActionButton
                icon={<ExternalLink size={20} color={tokens.semantic.fg2} />}
                label="Detail"
                bg={tokens.color.ink50}
                onPress={handleDetail}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <ActionButton
                icon={<ExternalLink size={20} color={tokens.semantic.fg2} />}
                label="Detail"
                bg={tokens.color.ink50}
                onPress={handleDetail}
                wide
              />
            </View>
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  bg: string;
  onPress: () => void;
  wide?: boolean;
}
function ActionButton({ icon, label, bg, onPress, wide }: ActionButtonProps): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg },
        wide ? styles.actionBtnWide : null,
        pressed ? styles.actionPressed : null,
      ]}
      onPress={onPress}
    >
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.sp3, paddingBottom: tokens.spacing.sp2 },
  subtitle: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg2 },
  phone: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.h3,
    fontWeight: '800',
    color: tokens.semantic.fg1,
  },
  phoneEmpty: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg3, fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sp2 },
  actionBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: tokens.spacing.sp1_5,
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
  },
  actionBtnWide: { flexBasis: '100%' },
  actionPressed: { opacity: 0.85 },
  actionLabel: { fontSize: tokens.fontSize.small, fontWeight: '600', color: tokens.semantic.fg1 },
});
