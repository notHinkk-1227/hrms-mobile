import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export interface ApproverCardProps {
  name: string;
  role?: string;
  initials?: string;
}

function defaultInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ApproverCard({ name, role = 'Approver Anda', initials }: ApproverCardProps): React.JSX.Element {
  const display = initials ?? defaultInitials(name);
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{display}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.role}>{role}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: tokens.font.display,
    fontSize: 13,
    fontWeight: '700',
    color: tokens.color.blue700,
  },
  body: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: tokens.semantic.fg1 },
  role: { fontSize: 11, color: tokens.semantic.fg3, marginTop: 2 },
});
