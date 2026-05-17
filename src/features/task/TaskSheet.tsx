import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { BottomSheet } from '@shared/components/BottomSheet';
import { StatusBadge } from '@shared/components/StatusBadge';
import { tokens } from '@shared/theme/tokens';
import { TaskItem } from '@infrastructure/api/taskClient';

interface TaskSheetProps {
  task: TaskItem | null;
  onClose: () => void;
  onComplete: (task: TaskItem) => Promise<void> | void;
}

function stripHtml(s: string | null): string {
  if (!s) return '';
  return s.replace(/<\/?[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function TaskSheet({ task, onClose, onComplete }: TaskSheetProps): React.JSX.Element | null {
  const [completing, setCompleting] = useState(false);
  if (!task) return null;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(task);
      onClose();
    } finally {
      setCompleting(false);
    }
  };

  const desc = stripHtml(task.description);

  return (
    <BottomSheet visible title="Detail Task" onClose={onClose}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.subject}>{task.subject || '(tanpa judul)'}</Text>
        <View style={styles.metaRow}>
          <StatusBadge label={task.status} variant="neutral" />
          {task.priority ? (
            <StatusBadge label={task.priority} variant={task.priority === 'Urgent' ? 'error' : 'warning'} />
          ) : null}
        </View>
        {task.project ? <InfoLine label="PROYEK" value={task.project} /> : null}
        {task.exp_end_date ? <InfoLine label="TENGGAT" value={task.exp_end_date} /> : null}
        {task.progress != null && task.progress > 0 ? (
          <InfoLine label="PROGRES" value={`${task.progress}%`} />
        ) : null}
        {desc ? (
          <View style={styles.descBlock}>
            <Text style={styles.descLabel}>DESKRIPSI</Text>
            <Text style={styles.descText}>{desc}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={handleComplete}
          disabled={completing || task.status === 'Completed'}
          style={({ pressed }) => [
            styles.completeBtn,
            pressed && styles.completeBtnPressed,
            (completing || task.status === 'Completed') && styles.completeBtnDisabled,
          ]}
        >
          <CheckCircle2 size={18} color={tokens.color.white} />
          <Text style={styles.completeBtnText}>
            {task.status === 'Completed' ? 'Sudah Selesai' : 'Tandai Selesai'}
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}

function InfoLine({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 500 },
  subject: {
    fontSize: tokens.fontSize.h4,
    fontWeight: '700',
    color: tokens.semantic.fg1,
    marginBottom: tokens.spacing.sp2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sp2,
    marginBottom: tokens.spacing.sp3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.sp2,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.line,
  },
  infoLabel: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
  },
  infoValue: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg1, fontWeight: '500' },
  descBlock: {
    marginTop: tokens.spacing.sp3,
    gap: tokens.spacing.sp1,
  },
  descLabel: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg3,
  },
  descText: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg2,
    lineHeight: tokens.lineHeight.body,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
    marginTop: tokens.spacing.sp4,
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.green600,
  },
  completeBtnPressed: { opacity: 0.85 },
  completeBtnDisabled: { backgroundColor: tokens.color.ink300 },
  completeBtnText: { color: tokens.color.white, fontWeight: '700', fontSize: tokens.fontSize.body },
});
