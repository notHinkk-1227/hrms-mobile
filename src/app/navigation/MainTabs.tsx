import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { HomeStack } from './HomeStack';
import { MyRequestsScreen } from '@features/my-requests/MyRequestsScreen';
import { TaskListScreen } from '@features/task/TaskListScreen';
import { ProfileScreen } from '@features/profile/ProfileScreen';
import { BottomNav } from './BottomNav';
import type { MainTabsParamList } from './types';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const HIDDEN_NESTED_ROUTES = new Set<string>([
  'ClockInCamera',
  'ClockInConfirm',
  'ClockInSuccess',
]);

const renderTabBar = (props: BottomTabBarProps) => {
  const focusedRouteName =
    props.state.routes[props.state.index] &&
    getFocusedRouteNameFromRoute(props.state.routes[props.state.index]);
  if (focusedRouteName && HIDDEN_NESTED_ROUTES.has(focusedRouteName)) return null;
  return <BottomNav {...props} />;
};

export function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="MyRequests" component={MyRequestsScreen} />
      <Tab.Screen name="Task" component={TaskListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
