import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStack } from './HomeStack';
import { MyRequestsScreen } from '@features/my-requests/MyRequestsScreen';
import { TeamRequestsScreen } from '@features/team-requests/TeamRequestsScreen';
import { ProfileScreen } from '@features/profile/ProfileScreen';
import { BottomNav } from './BottomNav';
import type { MainTabsParamList } from './types';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const renderTabBar = (props: BottomTabBarProps) => <BottomNav {...props} />;

export function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="MyRequests" component={MyRequestsScreen} />
      <Tab.Screen name="TeamRequests" component={TeamRequestsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
