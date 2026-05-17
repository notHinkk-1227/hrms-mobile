import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  title?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  }
  return ctx;
}

interface ToastState extends ToastOptions {
  id: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);
  const topOffset = Math.max(insets.top + tokens.spacing.sp2, 24);

  const dismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: tokens.motion.durationMicro,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  }, [opacity]);

  const show = useCallback<ToastContextValue['show']>(
    (opts) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const id = ++idRef.current;
      const variant = opts.variant ?? 'info';
      setToast({ ...opts, id, variant });
      Animated.timing(opacity, {
        toValue: 1,
        duration: tokens.motion.durationMicro,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(dismiss, opts.durationMs ?? 3500);
    },
    [dismiss, opacity],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View style={[styles.wrapper, { opacity, top: topOffset }]} pointerEvents="box-none">
          <Pressable onPress={dismiss} style={[styles.toast, variantStyle(toast.variant ?? 'info')]}>
            <Icon variant={toast.variant ?? 'info'} />
            <View style={styles.text}>
              {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
              <Text style={styles.message}>{toast.message}</Text>
            </View>
            <X size={18} color={tokens.color.white} />
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

function Icon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case 'success':
      return <CheckCircle2 size={20} color={tokens.color.white} />;
    case 'error':
      return <XCircle size={20} color={tokens.color.white} />;
    case 'warning':
      return <AlertTriangle size={20} color={tokens.color.white} />;
    case 'info':
    default:
      return <Info size={20} color={tokens.color.white} />;
  }
}

function variantStyle(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return { backgroundColor: tokens.color.green600 };
    case 'error':
      return { backgroundColor: tokens.color.error };
    case 'warning':
      return { backgroundColor: tokens.color.yellow500 };
    case 'info':
    default:
      return { backgroundColor: tokens.color.ink800 };
  }
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: tokens.spacing.sp4,
    right: tokens.spacing.sp4,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    padding: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    ...tokens.shadow.lg,
  },
  text: { flex: 1, gap: 2 },
  title: { color: tokens.color.white, fontSize: tokens.fontSize.small, fontWeight: '700' },
  message: { color: tokens.color.white, fontSize: tokens.fontSize.small },
});
