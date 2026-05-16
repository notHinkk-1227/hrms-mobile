import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LogType, ClockInResult } from '@domain/entities/checkin';

export type AuthStackParamList = {
  Onboarding: undefined;
  TenantCode: undefined;
  Login: undefined;
  Privacy: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  ClockInConfirm: { logType: LogType };
  ClockInSuccess: { result: ClockInResult; logType: LogType };
};

export type MainTabsParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  MyRequests: undefined;
  TeamRequests: undefined;
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
