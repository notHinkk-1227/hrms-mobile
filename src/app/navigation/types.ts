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

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
