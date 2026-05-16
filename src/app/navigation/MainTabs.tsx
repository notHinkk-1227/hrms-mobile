import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home as HomeIcon, ListChecks, Users, User } from 'lucide-react-native';
import { HomeStack } from './HomeStack';
import { MyRequestsScreen } from '@features/my-requests/MyRequestsScreen';
import { TeamRequestsScreen } from '@features/team-requests/TeamRequestsScreen';
import { ProfileScreen } from '@features/profile/ProfileScreen';
import { tokens } from '@shared/theme/tokens';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

type IconProps = { color: string; size: number };

const HomeTabIcon = ({ color, size }: IconProps) => <HomeIcon color={color} size={size} />;
const MyRequestsTabIcon = ({ color, size }: IconProps) => <ListChecks color={color} size={size} />;
const TeamRequestsTabIcon = ({ color, size }: IconProps) => <Users color={color} size={size} />;
const ProfileTabIcon = ({ color, size }: IconProps) => <User color={color} size={size} />;

export function MainTabs(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.semantic.brand,
        tabBarInactiveTintColor: tokens.color.ink300,
        tabBarStyle: {
          backgroundColor: tokens.semantic.surface,
          borderTopColor: tokens.semantic.line,
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: tokens.fontSize.caption,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Beranda', tabBarIcon: HomeTabIcon }} />
      <Tab.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{ tabBarLabel: 'Permohonan', tabBarIcon: MyRequestsTabIcon }}
      />
      <Tab.Screen
        name="TeamRequests"
        component={TeamRequestsScreen}
        options={{ tabBarLabel: 'Tim', tabBarIcon: TeamRequestsTabIcon }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ProfileTabIcon }}
      />
    </Tab.Navigator>
  );
}
