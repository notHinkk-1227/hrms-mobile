import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@shared/theme/tokens';

export interface StickyCtaProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sticky bottom CTA wrapper. Bottom inset = max(safe-area, 0).
 * Saat keyboard open di iOS, container lift dengan keyboard height supaya CTA
 * tidak ketutup. Di Android dengan adjustResize, root window sudah shrink jadi
 * tidak perlu manual lift.
 */
export function StickyCta({ children, style }: StickyCtaProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardOffset(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardOffset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const paddingBottom = keyboardOffset > 0 ? keyboardOffset + 12 : insets.bottom + tokens.spacing.sp4;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: tokens.spacing.sp4,
    paddingTop: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.line,
  },
});
