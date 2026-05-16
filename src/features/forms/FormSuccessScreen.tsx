import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { tokens } from '@shared/theme/tokens';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'FormSuccess'>;

export function FormSuccessScreen({ navigation, route }: Props): React.JSX.Element {
  const { title, name, message } = route.params;

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CheckCircle2 size={80} color={tokens.color.green500} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.ref}>
          <Text style={styles.refLabel}>NOMOR PERMOHONAN</Text>
          <Text style={styles.refValue}>{name}</Text>
        </View>
      </View>
      <View style={styles.cta}>
        <Button fullWidth onPress={() => navigation.popToTop()}>
          Kembali ke Beranda
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp3,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.green50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sp3,
  },
  title: {
    fontSize: tokens.fontSize.h1,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    textAlign: 'center',
  },
  message: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg3,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: tokens.spacing.sp4,
  },
  ref: {
    marginTop: tokens.spacing.sp4,
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sp4,
    paddingVertical: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface2,
    borderRadius: tokens.radius.md,
  },
  refLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  refValue: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg1,
    fontFamily: tokens.font.mono,
    fontWeight: '700',
  },
  cta: { gap: tokens.spacing.sp2 },
});
