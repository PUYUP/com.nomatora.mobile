import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
  },
  tabItemContainer: {
    backgroundColor: '#f5f5dc',
    paddingVertical: 4,
    shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 4,
		elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nofticationBadge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc143c',
    justifyContent: 'center',
    alignItems: 'center',
    top: -4,
    right: -4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  }
});

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: 'index', label: 'Home', icon: 'home' },
    { name: 'explore', label: 'Explore', icon: 'globe-model' },
    { name: 'home', label: 'Track', icon: 'vector-point-select' },
    { name: 'notification', label: 'Alert', icon: 'bell' },
  ];

  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
      paddingTop: 10,
      paddingBottom: insets.bottom + 26,
      paddingHorizontal: 16,
      height: 50 + insets.bottom,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 12,  // ← jarak antar tab
    }}>
      {state.routes.map((route: any, index: number) => {
        const tab = tabs.find(t => t.name === route.name);
        if (!tab) return null;

        const focused = state.index === index;
        const tint = focused ? '#2f4f4f' : '#708090';
        const bgColor = focused ? 'rgba(255,255,255,0.9)' : 'rgba(245,245,220,0.85)';

        // Sisipkan node kustom SEBELUM tab ke-2 (index 2), atau sesuaikan posisinya
        const customNode = index === 2 ? (
          <View key="checkin-node" style={{ flex: 1, position: 'relative', zIndex: 17 }}>
            <TouchableOpacity style={{
              height: 46, 
              borderRadius: 23,
              backgroundColor: '#2f4f4f', 
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.16,
              shadowRadius: 4,
              elevation: 4,
            }}>
              <MaterialCommunityIcons name="map-plus" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14 }}>Check In</Text>
            </TouchableOpacity>
          </View>
        ) : null;

        return (
          <React.Fragment key={route.key}>
            {customNode}
            <TouchableOpacity
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={{ position: 'relative', zIndex: 17 }}
            >
              <View style={[
                styles.tabItemContainer,
                { backgroundColor: bgColor },
              ]}>
                <MaterialCommunityIcons
                  size={24}
                  name={tab.icon as any}
                  color={tint}
                />

                {tab.name === 'notification' && (
                  <View style={styles.nofticationBadge}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>5</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Set the navigation bar style
      NavigationBar.setStyle('dark');
    }
  }, []);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="home" options={{ title: 'Track' }} />
      <Tabs.Screen name="notification" options={{ title: 'Alert' }} />
    </Tabs>
  );
}
