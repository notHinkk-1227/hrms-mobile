import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { ApplyLeaveScreen } from '@features/leave/ApplyLeaveScreen';
import { ApplyExpenseScreen } from '@features/expense/ApplyExpenseScreen';
import { ApplyAdvanceScreen } from '@features/advance/ApplyAdvanceScreen';
import { RequestAttendanceScreen } from '@features/attendance-request/RequestAttendanceScreen';
import { RequestShiftScreen } from '@features/shift-request/RequestShiftScreen';
import { FormSuccessScreen } from '@features/forms/FormSuccessScreen';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
      <Stack.Screen name="ApplyExpense" component={ApplyExpenseScreen} />
      <Stack.Screen name="ApplyAdvance" component={ApplyAdvanceScreen} />
      <Stack.Screen name="RequestAttendance" component={RequestAttendanceScreen} />
      <Stack.Screen name="RequestShift" component={RequestShiftScreen} />
      <Stack.Screen
        name="FormSuccess"
        component={FormSuccessScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
