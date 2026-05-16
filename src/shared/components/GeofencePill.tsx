import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, MapPin } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export type GeofenceState = 'inside' | 'outside' | 'unknown';

export interface GeofencePillProps {
  state: GeofenceState;
  /** Lokasi terdekat name + distance (e.g. "Kantor Pusat · 28 m") */
  label: string;
  compact?: boolean;
}

const CONFIG: Record<GeofenceState, { bg: string; dot: string; text: string }> = {
  inside: {
    bg: 'rgba(92, 171, 48, 0.95)',
    dot: tokens.color.green100,
    text: tokens.color.white,
  },
  outside: {
    bg: 'rgba(220, 38, 38, 0.95)',
    dot: tokens.color.yellow300,
    text: tokens.color.white,
  },
  unknown: {
    bg: 'rgba(15, 23, 42, 0.85)',
    dot: tokens.color.yellow400,
    text: tokens.color.white,
  },
};

export function GeofencePill({ state, label, compact = false }: GeofencePillProps): React.JSX.Element {
  const cfg = CONFIG[state];
  return (
    <View
      style={[
        styles.pill,
        compact ? styles.pillCompact : styles.pillLarge,
        { backgroundColor: cfg.bg },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: cfg.dot }]} />
      {state === 'outside' ? (
        <AlertCircle size={compact ? 12 : 14} color={cfg.text} />
      ) : (
        <MapPin size={compact ? 12 : 14} color={cfg.text} />
      )}
      <Text style={[styles.text, { color: cfg.text }, compact ? styles.textCompact : null]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: tokens.radius.full,
    alignSelf: 'flex-start',
  },
  pillCompact: { paddingHorizontal: 13, paddingVertical: 6 },
  pillLarge: { paddingHorizontal: 16, paddingVertical: 10 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  text: { fontWeight: '600', fontSize: 12 },
  textCompact: { fontSize: 11 },
});
