import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { authEvents } from '@infrastructure/api/authEvents';
import { useAuthStore } from '@features/auth/store';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { SplashView } from './SplashView';

export function RootNavigator(): React.JSX.Element {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const privacyAccepted = useAuthStore((s) => s.privacyAccepted);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    return authEvents.onUnauthorized(() => {
      logout();
    });
  }, [logout]);

  if (!hydrated) {
    return <SplashView />;
  }

  const showMain = isAuthenticated && privacyAccepted;

  return <NavigationContainer>{showMain ? <MainStack /> : <AuthStack />}</NavigationContainer>;
}
