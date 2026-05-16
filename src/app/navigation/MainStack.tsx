import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { ApplyLeaveScreen } from '@features/leave/ApplyLeaveScreen';
import { ApplyExpenseScreen } from '@features/expense/ApplyExpenseScreen';
import { ApplyAdvanceScreen } from '@features/advance/ApplyAdvanceScreen';
import { RequestAttendanceScreen } from '@features/attendance-request/RequestAttendanceScreen';
import { RequestShiftScreen } from '@features/shift-request/RequestShiftScreen';
import { FormSuccessScreen } from '@features/forms/FormSuccessScreen';
import { RequestDetailScreen } from '@features/my-requests/RequestDetailScreen';
import { TeamRequestDetailScreen } from '@features/team-requests/TeamRequestDetailScreen';
import { SalarySlipListScreen } from '@features/salary-slip/SalarySlipListScreen';
import { SalarySlipDetailScreen } from '@features/salary-slip/SalarySlipDetailScreen';
import { MyAttendanceScreen } from '@features/attendance/MyAttendanceScreen';
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
      <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
      <Stack.Screen name="TeamRequestDetail" component={TeamRequestDetailScreen} />
      <Stack.Screen name="SalarySlipList" component={SalarySlipListScreen} />
      <Stack.Screen name="SalarySlipDetail" component={SalarySlipDetailScreen} />
      <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} />
    </Stack.Navigator>
  );
}
