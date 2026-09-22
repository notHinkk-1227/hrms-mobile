import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LogType, ClockInResult, LivenessSignals } from '@domain/entities/checkin';

export type AuthStackParamList = {
  Onboarding: undefined;
  TenantCode: undefined;
  Login: undefined;
  Privacy: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  ClockInCamera: { logType: LogType };
  ClockInConfirm: { logType: LogType; photoPath?: string; faceLiveness?: LivenessSignals };
  ClockInSuccess: { result: ClockInResult; logType: LogType };
  CheckinHistory: undefined;
  CheckinDetail: { name: string };
  Notifications: undefined;
  Inbox: undefined;
  InboxDetail: { name: string };
};

export type MyRequestsTabParams = {
  filterDoctype?: string;
  mode?: 'mine' | 'team';
};

export type MainTabsParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  MyRequests: MyRequestsTabParams | undefined;
  Task: undefined;
  Profile: undefined;
};

export type FormSuccessParams = {
  doctype: string;
  name: string;
  title: string;
  message?: string;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabsParamList>;
  ApplyLeave: undefined;
  ApplyExpense: undefined;
  ApplyAdvance: undefined;
  RequestAttendance: undefined;
  RequestShift: undefined;
  FormSuccess: FormSuccessParams;
  RequestDetail: { doctype: string; name: string };
  TeamRequestDetail: { doctype: string; name: string };
  SalarySlipList: undefined;
  SalarySlipDetail: { name: string };
  MyAttendance: undefined;
  TodoList: undefined;
  TeamCalendar: undefined;
  EmployeeDirectory: undefined;
  EmployeeDetail: { name: string };
  About: undefined;
  Debug: undefined;
  LivenessCalibration: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}