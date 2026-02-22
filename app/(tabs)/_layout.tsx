import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const styles = StyleSheet.create({
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 64,

    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  iconSlot: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
    <Tabs
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
          backgroundColor: 'transparent',
          marginHorizontal: 8,
        },
        tabBarBackground: () => null,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => renderTab('Home', 'house.fill', focused),
          tabBarButton: (props) => (
            <View style={{ flex: 1, backgroundColor: 'red', height: 30 }}></View>
          )
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
