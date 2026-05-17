import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@features/home/HomeScreen';
import { ClockInCameraScreen } from '@features/checkin/ClockInCameraScreen';
import { ClockInConfirmScreen } from '@features/checkin/ClockInConfirmScreen';
import { ClockInSuccessScreen } from '@features/checkin/ClockInSuccessScreen';
import { CheckinHistoryScreen } from '@features/checkin/CheckinHistoryScreen';
import { CheckinDetailScreen } from '@features/checkin/CheckinDetailScreen';
import { NotificationsScreen } from '@features/notifications/NotificationsScreen';
import { InboxListScreen } from '@features/inbox/InboxListScreen';
import { InboxDetailScreen } from '@features/inbox/InboxDetailScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ClockInCamera" component={ClockInCameraScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="ClockInConfirm" component={ClockInConfirmScreen} />
      <Stack.Screen
        name="ClockInSuccess"
        component={ClockInSuccessScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="CheckinHistory" component={CheckinHistoryScreen} />
      <Stack.Screen name="CheckinDetail" component={CheckinDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Inbox" component={InboxListScreen} />
      <Stack.Screen name="InboxDetail" component={InboxDetailScreen} />
    </Stack.Navigator>
  );
}
