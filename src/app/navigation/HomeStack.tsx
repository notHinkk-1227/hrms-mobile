import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@features/home/HomeScreen';
import { ClockInConfirmScreen } from '@features/checkin/ClockInConfirmScreen';
import { ClockInSuccessScreen } from '@features/checkin/ClockInSuccessScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ClockInConfirm" component={ClockInConfirmScreen} />
      <Stack.Screen
        name="ClockInSuccess"
        component={ClockInSuccessScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
