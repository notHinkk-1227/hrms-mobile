import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { authEvents } from '@infrastructure/api/authEvents';
import { useFeaturesStore } from '@infrastructure/api/featureDetect';
import { biometricService } from '@infrastructure/biometric/biometricService';
import { pairDeviceQuiet } from '@infrastructure/device/devicePairService';
import { realtimeService } from '@infrastructure/realtime/realtimeService';
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

  const hydrateFeatures = useFeaturesStore((s) => s.hydrate);
  const refreshFeatures = useFeaturesStore((s) => s.refresh);

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
      // Auto-pair device kalau enhanced mode dengan device_binding aktif
      const features = useFeaturesStore.getState().features;
      if (features.hasSopwerHrms && features.deviceBinding) {
        pairDeviceQuiet().catch(() => undefined);
      }
    })();
  }, [isAuthenticated, refreshFeatures]);

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

  if (!hydrated || !biometricChecked) {
    return <SplashView />;
  }

  const showMain = isAuthenticated && privacyAccepted;

  return <NavigationContainer>{showMain ? <MainStack /> : <AuthStack />}</NavigationContainer>;
}
