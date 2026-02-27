import CurrentJourney from '@/components/partials/current-journey';
import EmptyJourney from '@/components/partials/empty-journey';
import PreviousJourneyList from '@/components/partials/previous-journey-list';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom']}>
            <ScrollView 
                contentContainerStyle={{ backgroundColor: '#fff', paddingBottom: 64, paddingTop: insets.top + 16, zIndex: 9999, position: 'relative' }} 
                showsVerticalScrollIndicator={false}
            >
                {/* <LinearGradient
                    colors={['rgba(0, 0, 0, 0.10)', 'rgba(0, 0, 0, 0.05)', 'transparent']}
                    style={styles.background}
                /> */}
                
                <View style={{ position: 'relative', zIndex: 10 }}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <MaterialCommunityIcons name="account" size={24} color="#fff" />
                        </View>
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={styles.profileName}>Hi, Nomatora!</Text>
                            <Text style={styles.fansBadge}>Supporter</Text>
                        </View>
                    </View>
                    
                    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                        {1 > 0 && <CurrentJourney />}
                        {1 > 10 && <EmptyJourney />}
                    </View>

                    {1 > 0 && 
                        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
                            <PreviousJourneyList />
                        </View>
                    }
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

export const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 'auto',
        pointerEvents: 'none',
        height: '30%',
        zIndex: 10,
    },

    /* profile */
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#2f4f4f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: 14,
        color: '#333',
        fontFamily: 'Inter_500Medium',
    },
    fansBadge: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Inter_400Regular',
    },
});