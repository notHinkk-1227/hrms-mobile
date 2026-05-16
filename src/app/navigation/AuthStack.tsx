import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@features/auth/OnboardingScreen';
import { TenantCodeScreen } from '@features/auth/TenantCodeScreen';
import { LoginScreen } from '@features/auth/LoginScreen';
import { PrivacyScreen } from '@features/auth/PrivacyScreen';
import { useAuthStore, isTenantCacheFresh } from '@features/auth/store';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

function pickInitialRoute(): keyof AuthStackParamList {
  const state = useAuthStore.getState();
  if (!state.onboardingSeen) {
    return 'Onboarding';
  }
  if (!state.tenantUrl || !isTenantCacheFresh(state.tenantResolvedAt)) {
    return 'TenantCode';
  }
  return 'Login';
}

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName={pickInitialRoute()}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="TenantCode" component={TenantCodeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
