import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@shared/components/Button';
import { BottomSheet } from '@shared/components/BottomSheet';
import { tokens } from '@shared/theme/tokens';
import type { TodoItem } from '@infrastructure/api/hrmsClient';

export interface TodoSheetProps {
  todo: TodoItem | null;
  onClose: () => void;
  onDone: (todo: TodoItem) => Promise<void> | void;
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function priorityColor(p: string): string {
  switch (p) {
    case 'High':
      return tokens.color.error;
    case 'Medium':
      return tokens.color.yellow500;
    default:
      return tokens.color.ink300;
  }
}

function priorityLabel(p: string): string {
  switch (p) {
    case 'High':
      return 'Tinggi';
    case 'Medium':
      return 'Sedang';
    case 'Low':
      return 'Rendah';
    default:
      return p;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Tanpa tenggat';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function TodoSheet({ todo, onClose, onDone }: TodoSheetProps): React.JSX.Element {
  const [submitting, setSubmitting] = useState(false);

  const handleDone = async () => {
    if (!todo) return;
    setSubmitting(true);
    try {
      await onDone(todo);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={!!todo} title="Detail Tugas" onClose={onClose}>
      {todo ? (
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor(todo.priority) }]} />
            <Text style={styles.priorityText}>{priorityLabel(todo.priority).toUpperCase()}</Text>
          </View>
          <Text style={styles.date}>{formatDate(todo.date)}</Text>
          {todo.assigned_by_full_name ? (
            <Text style={styles.from}>Dari: {todo.assigned_by_full_name}</Text>
          ) : null}
          <Text style={styles.description}>{stripHtml(todo.description ?? '')}</Text>
          {todo.reference_type && todo.reference_name ? (
            <Text style={styles.ref}>
              Terkait: {todo.reference_type} / {todo.reference_name}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button variant="outline" onPress={onClose} style={styles.btnCancel}>
              Tutup
            </Button>
            <Button onPress={handleDone} loading={submitting} style={styles.btnDone}>
              Tandai Selesai
            </Button>
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.sp2, paddingBottom: tokens.spacing.sp2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp1_5 },
  priorityDot: { width: 12, height: 12, borderRadius: 6 },
  priorityText: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    fontWeight: '700',
    letterSpacing: 1,
    color: tokens.semantic.fg2,
  },
  date: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '600' },
  from: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  description: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg1,
    lineHeight: 22,
    marginTop: tokens.spacing.sp2,
  },
  ref: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    fontFamily: tokens.font.mono,
    marginTop: tokens.spacing.sp2,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.spacing.sp2,
    marginTop: tokens.spacing.sp3,
  },
  btnCancel: { flex: 1 },
  btnDone: { flex: 2 },
});
