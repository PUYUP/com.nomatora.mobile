import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 16,
    minWidth: 100,
    display: 'flex',
  },
  tabItemContainer: {
    backgroundColor: '#f5f5dc',
    borderRadius: 22,
    paddingVertical: 6,
    shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 4,
		elevation: 4,
  },
  iconSlot: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
	const renderTab = (label: string, icon: string, focused: boolean) => {
		const tint = focused ? '#2f4f4f' : '#708090';
    const bgColor = focused ? '#FFF' : '#f5f5f5';
		return (
			<View style={styles.tabItem}>
        <View style={[styles.tabItemContainer, { backgroundColor: bgColor }]}>
          <View style={styles.iconSlot}>
            <MaterialCommunityIcons size={28} name={icon as any} color={tint} />
          </View>
          <Text style={[styles.label, { color: tint }]}>{label}</Text>
        </View>
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
          height: 106,
          paddingTop: 24,
        },
        tabBarItemStyle: {
          flex: 1,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.25)']}
            style={{ height: 106 }}
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => renderTab('Home', 'home', focused),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => renderTab('Explore', 'globe-model', focused),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Track',
          tabBarIcon: ({ focused }) => renderTab('Track', 'vector-point-select', focused),
        }}
      />
    </Tabs>
  );
}
