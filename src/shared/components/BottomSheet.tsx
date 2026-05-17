import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface BottomSheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Hide header X button (default false). */
  hideClose?: boolean;
}

/**
 * Generic bottom sheet wrapper — pattern mirip Select.tsx tapi tanpa content
 * spesifik. Pakai untuk ActionSheet, ToDo description, calendar detail dst.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  hideClose,
}: BottomSheetProps): React.JSX.Element {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          {title || !hideClose ? (
            <View style={styles.header}>
              <Text style={styles.title}>{title ?? ''}</Text>
              {!hideClose ? (
                <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Tutup">
                  <X size={20} color={tokens.semantic.fg2} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <View style={styles.content}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.semantic.surface,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.spacing.sp2,
    paddingBottom: tokens.spacing.sp5,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.semantic.line,
    marginBottom: tokens.spacing.sp2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.sp4,
    paddingBottom: tokens.spacing.sp2,
  },
  title: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.spacing.sp4,
  },
});
