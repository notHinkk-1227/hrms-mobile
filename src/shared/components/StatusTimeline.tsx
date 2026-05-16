import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Clock, X } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export type TimelineStepStatus = 'done' | 'current' | 'future' | 'rejected';

export interface TimelineStep {
  status: TimelineStepStatus;
  title: string;
  subtitle?: string;
  actorName?: string;
  actorInitials?: string;
}

export interface StatusTimelineProps {
  steps: TimelineStep[];
}

function Dot({ status }: { status: TimelineStepStatus }) {
  if (status === 'done') {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Check size={11} color={tokens.color.white} strokeWidth={3} />
      </View>
    );
  }
  if (status === 'current') {
    return (
      <View style={[styles.dot, styles.dotCurrent]}>
        <Clock size={10} color={tokens.color.white} />
      </View>
    );
  }
  if (status === 'rejected') {
    return (
      <View style={[styles.dot, styles.dotRejected]}>
        <X size={11} color={tokens.color.white} strokeWidth={3} />
      </View>
    );
  }
  // future
  return <View style={[styles.dot, styles.dotFuture]} />;
}

function Connector({ status, isLast }: { status: TimelineStepStatus; isLast: boolean }) {
  if (isLast) return null;
  let color: string = tokens.color.ink200;
  let opacity = 1;
  if (status === 'done') color = tokens.color.green300;
  if (status === 'rejected') {
    color = tokens.color.error;
    opacity = 0.4;
  }
  return <View style={[styles.connector, { backgroundColor: color, opacity }]} />;
}

export function StatusTimeline({ steps }: StatusTimelineProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <View key={`step-${idx}`} style={styles.row}>
            <View style={styles.rail}>
              <Dot status={step.status} />
              <Connector status={step.status} isLast={isLast} />
            </View>
            <View style={styles.meta}>
              <Text style={styles.title}>{step.title}</Text>
              {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
              {step.actorName ? (
                <View style={styles.actorRow}>
                  {step.actorInitials ? (
                    <View style={styles.actorAvatar}>
                      <Text style={styles.actorInitials}>{step.actorInitials}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.actorName}>{step.actorName}</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  row: { flexDirection: 'row', gap: tokens.spacing.sp3 },
  rail: { alignItems: 'center', width: 18 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: tokens.color.green500 },
  dotCurrent: {
    backgroundColor: tokens.semantic.brand,
    // box-shadow workaround via border
    borderWidth: 4,
    borderColor: tokens.color.blue100,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  dotFuture: {
    backgroundColor: tokens.semantic.surface,
    borderWidth: 1.5,
    borderColor: tokens.color.ink200,
  },
  dotRejected: { backgroundColor: tokens.color.error },
  connector: { width: 2, flex: 1, marginTop: 4, minHeight: 24 },
  meta: {
    flex: 1,
    paddingBottom: tokens.spacing.sp3,
    gap: 4,
  },
  title: { fontSize: 13, fontWeight: '600', color: tokens.semantic.fg1 },
  subtitle: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    color: tokens.semantic.fg3,
    letterSpacing: 0.4,
  },
  actorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  actorAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: tokens.color.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorInitials: {
    fontFamily: tokens.font.display,
    fontSize: 8,
    fontWeight: '700',
    color: tokens.color.blue700,
  },
  actorName: { fontSize: 12, color: tokens.semantic.fg2 },
});
