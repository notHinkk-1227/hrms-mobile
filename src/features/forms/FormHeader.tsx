import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface FormHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function FormHeader({ title, subtitle, onBack }: FormHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <ArrowLeft size={24} color={tokens.semantic.fg1} />
      </Pressable>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    marginBottom: tokens.spacing.sp4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: tokens.fontSize.h2, fontWeight: '800', color: tokens.semantic.fg1 },
  subtitle: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
});
