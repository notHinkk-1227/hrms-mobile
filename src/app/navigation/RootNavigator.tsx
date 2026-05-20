import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { authEvents } from '@infrastructure/api/authEvents';
import { useFeaturesStore } from '@infrastructure/api/featureDetect';
import { biometricService } from '@infrastructure/biometric/biometricService';
import { pairDeviceQuiet } from '@infrastructure/device/devicePairService';
import { realtimeService } from '@infrastructure/realtime/realtimeService';
import { pushService } from '@infrastructure/push/pushService';
import { parsePushMessage, navigateFromPush } from '@infrastructure/push/pushHandler';
import { useAuthStore } from '@features/auth/store';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { SplashView } from './SplashView';

export function RootNavigator(): React.JSX.Element {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const privacyAccepted = useAuthStore((s) => s.privacyAccepted);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);

  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  const [splashPlayed, setSplashPlayed] = useState(false);

  const hydrateFeatures = useFeaturesStore((s) => s.hydrate);
  const refreshFeatures = useFeaturesStore((s) => s.refresh);

  const navigationRef = useRef<NavigationContainerRef<any> | null>(null);

  useEffect(() => {
    hydrate();
    hydrateFeatures();
  }, [hydrate, hydrateFeatures]);

  // Setelah login: detect backend features (ping sopwer_hrms.api.health.ping).
  // Standard mode kalau 404 / network error.
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      await refreshFeatures();
      const features = useFeaturesStore.getState().features;
      // Auto-pair device kalau enhanced mode dengan device_binding aktif
      if (features.hasSopwerHrms && features.deviceBinding) {
        pairDeviceQuiet().catch(() => undefined);
      }
      // Register FCM token kalau backend support push. Fail-soft kalau native
      // module belum di-link (build dev tanpa google-services.json).
      if (features.hasSopwerHrms && features.push && pushService.isAvailable()) {
        pushService.registerToken().catch(() => undefined);
      }
    })();
  }, [isAuthenticated, refreshFeatures]);

  // FCM listeners — foreground message + tap deep link. Cleanup di unmount.
  useEffect(() => {
    if (!isAuthenticated || !pushService.isAvailable()) return undefined;
    const unsubMsg = pushService.onMessage((remoteMessage) => {
      // Foreground: socket.io sudah handle UI refresh (toast + badge). FCM
      // foreground hanya log untuk debug, tidak duplicate UI.
      console.log('[push] foreground message:', remoteMessage?.data);
    });
    const unsubOpen = pushService.onNotificationOpenedApp((remoteMessage) => {
      const msg = parsePushMessage(remoteMessage);
      navigateFromPush(navigationRef.current, msg);
    });
    const unsubRefresh = pushService.onTokenRefresh(() => {
      pushService.registerToken(true).catch(() => undefined);
    });
    // Cold start dari tap
    pushService.getInitialNotification().then((remoteMessage) => {
      if (!remoteMessage) return;
      const msg = parsePushMessage(remoteMessage);
      // Delay supaya nav stack siap
      setTimeout(() => navigateFromPush(navigationRef.current, msg), 500);
    });
    return () => {
      unsubMsg();
      unsubOpen();
      unsubRefresh();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    return authEvents.onUnauthorized(() => {
      logout();
    });
  }, [logout]);

  // Connect/disconnect realtime socket sesuai auth state
  useEffect(() => {
    if (isAuthenticated) {
      realtimeService.connect();
    } else {
      realtimeService.disconnect();
    }
    return () => {
      realtimeService.disconnect();
    };
  }, [isAuthenticated]);

  // Saat hydrated + sudah login + biometric enabled: prompt sekali, lalu unlock
  useEffect(() => {
    if (!hydrated || biometricChecked) return;
    if (!isAuthenticated || !biometricEnabled) {
      setBiometricChecked(true);
      setBiometricUnlocked(true);
      return;
    }
    (async () => {
      const { available } = await biometricService.isAvailable();
      if (!available) {
        setBiometricUnlocked(true);
        setBiometricChecked(true);
        return;
      }
      const { success } = await biometricService.prompt('Buka kunci Hadir by Sopwer');
      if (success) {
        setBiometricUnlocked(true);
      } else {
        // Gagal/cancel — logout supaya user login ulang dengan password
        logout();
      }
      setBiometricChecked(true);
    })();
  }, [hydrated, biometricChecked, isAuthenticated, biometricEnabled, logout]);

  // Saat user berhasil login (lewat password atau biometric button di
  // LoginScreen), unlock — supaya showMain langsung true tanpa gate biometric
  // splash.
  useEffect(() => {
    if (isAuthenticated && !biometricUnlocked) setBiometricUnlocked(true);
  }, [isAuthenticated, biometricUnlocked]);

  if (!hydrated || !biometricChecked || !splashPlayed) {
    return <SplashView onFinish={() => setSplashPlayed(true)} />;
  }

  const showMain = isAuthenticated && privacyAccepted;

  return (
    <NavigationContainer ref={navigationRef}>
      {showMain ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
