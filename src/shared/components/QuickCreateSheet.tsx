import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Calendar,
  ChevronRight,
  FileText,
  RefreshCw,
  Replace,
  Wallet,
  X,
} from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface QuickCreateAction {
  key: 'leave' | 'expense' | 'advance' | 'attendance-request' | 'shift-request';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tileBg: string;
}

const ACTIONS: QuickCreateAction[] = [
  {
    key: 'leave',
    title: 'Ajukan Cuti',
    subtitle: 'Cuti tahunan, sakit, izin',
    icon: <Calendar size={17} color={tokens.color.blue700} />,
    tileBg: tokens.color.blue50,
  },
  {
    key: 'expense',
    title: 'Klaim Reimbursement',
    subtitle: 'Multi-item dengan struk',
    icon: <FileText size={17} color={tokens.color.green700} />,
    tileBg: tokens.color.green50,
  },
  {
    key: 'advance',
    title: 'Kasbon',
    subtitle: 'Uang muka dari perusahaan',
    icon: <Wallet size={17} color={tokens.color.yellow700} />,
    tileBg: tokens.color.yellow50,
  },
  {
    key: 'attendance-request',
    title: 'Koreksi Absen',
    subtitle: 'WFH atau dinas luar',
    icon: <RefreshCw size={17} color={tokens.semantic.fg2} />,
    tileBg: tokens.color.ink50,
  },
  {
    key: 'shift-request',
    title: 'Ganti Shift',
    subtitle: 'Pindah atau tukar shift',
    icon: <Replace size={17} color={tokens.semantic.fg2} />,
    tileBg: tokens.color.ink50,
  },
];

export interface QuickCreateSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (action: QuickCreateAction['key']) => void;
}

export function QuickCreateSheet({ open, onClose, onSelect }: QuickCreateSheetProps): React.JSX.Element {
  const pick = (key: QuickCreateAction['key']) => {
    onClose();
    onSelect(key);
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Buat Permohonan</Text>
              <Text style={styles.headerSub}>Pilih jenis permohonan</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={tokens.semantic.fg2} />
            </Pressable>
          </View>
          <View style={styles.grid}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => pick(a.key)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={[styles.tile, { backgroundColor: a.tileBg }]}>{a.icon}</View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  <Text style={styles.cardSub}>{a.subtitle}</Text>
                </View>
                <ChevronRight size={16} color={tokens.semantic.fg4} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: tokens.semantic.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    paddingBottom: tokens.spacing.sp5,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.ink200,
    alignSelf: 'center',
    marginTop: tokens.spacing.sp2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.sp4,
    paddingVertical: tokens.spacing.sp3,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  headerTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  headerSub: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  grid: { padding: tokens.spacing.sp3, gap: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minHeight: 56,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    borderRadius: tokens.radius.md,
  },
  cardPressed: {
    borderColor: tokens.semantic.brand,
    ...tokens.shadow.sm,
  },
  tile: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: tokens.semantic.fg1 },
  cardSub: { fontSize: 11, color: tokens.semantic.fg3, marginTop: 2 },
});
