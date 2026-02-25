import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const haveTrip: boolean = true; // Ganti dengan kondisi sebenarnya untuk menentukan apakah pengguna memiliki trip atau tidak

  const tabs = [
    { name: 'index', label: 'Home', icon: 'home' },
    { name: 'explore', label: 'Explore', icon: 'globe-model' },
    { name: 'tracker', label: 'Track', icon: 'hiking' },
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
            <TouchableOpacity style={[styles.checkInButton, !haveTrip && { backgroundColor: '#4169e1' }]}>
              {haveTrip ? (
                <>
                  <MaterialCommunityIcons name="map-plus" size={20} />
                  <Text style={{ fontSize: 14 }}>Check In</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="highway" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14 }}>Start Route</Text>
                </>
              )}
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
                    <Text style={styles.notificationText}>5</Text>
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
      <Tabs.Screen name="tracker" options={{ title: 'Track' }} />
      <Tabs.Screen name="notification" options={{ title: 'Alert' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
  },
  tabItemContainer: {
    backgroundColor: '#f5f5dc',
    paddingVertical: 4,
    boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)',
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
    boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)',
  },
  notificationText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  checkInButton: {
    height: 46, 
    borderRadius: 23,
    backgroundColor: '#ffd700', 
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)',
  },
});