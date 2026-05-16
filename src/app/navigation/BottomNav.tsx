import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home as HomeIcon, ListChecks, Plus, User, Users } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';
import { QuickCreateSheet, QuickCreateAction } from '@shared/components/QuickCreateSheet';
import type { MainStackParamList } from './types';

const ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Home: HomeIcon,
  MyRequests: ListChecks,
  TeamRequests: Users,
  Profile: User,
};

const LABELS: Record<string, string> = {
  Home: 'Beranda',
  MyRequests: 'Permohonan',
  TeamRequests: 'Tim',
  Profile: 'Profil',
};

const FAB_AFTER_INDEX = 1; // After "MyRequests" (between MyRequests and TeamRequests)

const QUICK_TO_ROUTE: Record<QuickCreateAction['key'], keyof MainStackParamList> = {
  leave: 'ApplyLeave',
  expense: 'ApplyExpense',
  advance: 'ApplyAdvance',
  'attendance-request': 'RequestAttendance',
  'shift-request': 'RequestShift',
};

interface TabButtonProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
}

function TabButton({ routeName, isFocused, onPress }: TabButtonProps): React.JSX.Element {
  const Icon = ICONS[routeName];
  const color = isFocused ? tokens.semantic.brand : tokens.color.ink300;
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="button">
      <Icon size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{LABELS[routeName]}</Text>
    </Pressable>
  );
}

export function BottomNav({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const parent = useNavigation<NavigationProp<MainStackParamList>>();

  const onSelectAction = (key: QuickCreateAction['key']) => {
    const route = QUICK_TO_ROUTE[key];
    parent.navigate(route as never);
  };

  return (
    <>
      <View
        style={[
          styles.bar,
          { height: 64 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          // Insert FAB after FAB_AFTER_INDEX
          if (index === FAB_AFTER_INDEX + 1) {
            return (
              <React.Fragment key={`fab-${route.key}`}>
                <FabSlot onPress={() => setSheetOpen(true)} />
                <TabButton routeName={route.name} isFocused={isFocused} onPress={onPress} />
              </React.Fragment>
            );
          }
          return (
            <TabButton
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
      <QuickCreateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={onSelectAction}
      />
    </>
  );
}

function FabSlot({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <View style={styles.fabSlot}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="Buat permohonan baru"
      >
        <Plus size={28} color={tokens.color.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: tokens.semantic.surface,
    borderTopColor: tokens.semantic.line,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: '600',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.semantic.brand,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -18 }],
    ...tokens.shadow.lg,
  },
  fabPressed: { backgroundColor: tokens.semantic.brandHover, transform: [{ translateY: -18 }, { scale: 0.96 }] },
});
