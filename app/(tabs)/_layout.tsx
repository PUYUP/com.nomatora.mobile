import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  iconSlot: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flexDirection: 'row', paddingBottom: insets.bottom, backgroundColor: 'transparent' }}>
      {state.routes.map((route: { key: string | number; name: any; }, index: React.Key | null | undefined) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={index}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: isFocused ? '#e0e0e0' : '#ffffff' }}
          >
            <Text style={{ color: isFocused ? '#673ab7' : '#222' }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

	const renderTab = (label: string, icon: string, focused: boolean) => {
		const tint = focused ? '#fff' : 'rgba(255,255,255,0.7)';
		return (
			<View style={styles.tabItem}>
				<View style={styles.iconSlot}>
					<IconSymbol size={24} name={icon as any} color={tint} />
				</View>
				<Text style={[styles.label, { color: tint }]}>{label}</Text>
			</View>
		);
	};

  return (
    <Tabs tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 72,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          backgroundColor: 'red',
          marginHorizontal: 8,
        },
        tabBarBackground: () => null,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => renderTab('Home', 'house.fill', focused),
          tabBarButton: (props) => <Text>A</Text>
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => renderTab('Explore', 'paperplane.fill', focused),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'New home',
          tabBarIcon: ({ focused }) => renderTab('New home', 'house.fill', focused),
        }}
      />
    </Tabs>
  );
}
