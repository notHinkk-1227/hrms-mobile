import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { tokens } from '@shared/theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = false,
  style,
  disabled,
  ...rest
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && pressedStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? tokens.color.white : tokens.semantic.brand} />
      ) : (
        <Text style={[styles.text, textStyles[variant], textSize[size]]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
});

const sizeStyles: Record<Size, ViewStyle> = {
  lg: { height: tokens.touchTarget.comfortable, paddingHorizontal: tokens.spacing.sp4 },
  md: { height: 40, paddingHorizontal: tokens.spacing.sp3 },
  sm: { height: 36, paddingHorizontal: tokens.spacing.sp3 },
};

const textSize: Record<Size, TextStyle> = {
  lg: { fontSize: tokens.fontSize.h4 },
  md: { fontSize: tokens.fontSize.body },
  sm: { fontSize: tokens.fontSize.small },
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: tokens.semantic.brand },
  secondary: { backgroundColor: tokens.color.green500 },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.semantic.brand,
  },
  ghost: { backgroundColor: 'transparent' },
};

const pressedStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: tokens.semantic.brandHover },
  secondary: { backgroundColor: tokens.color.green600 },
  outline: { backgroundColor: tokens.color.blue50 },
  ghost: { backgroundColor: tokens.semantic.surface2 },
};

const textStyles: Record<Variant, TextStyle> = {
  primary: { color: tokens.color.white },
  secondary: { color: tokens.color.white },
  outline: { color: tokens.semantic.brand },
  ghost: { color: tokens.semantic.brand },
};
