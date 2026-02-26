import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SonarCircle from '../ui/sonar-circle';

export default function CurrentJourney() {
    const insets = useSafeAreaInsets();
    
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <LinearGradient
                    colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.1)', 'transparent']}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={styles.background}
                />
                
                <View style={styles.header}>
                    <View style={{ flexDirection: 'column', maxWidth: '90%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }} >
                            <SonarCircle coreColor="#32cd32" waveColor="#90ee90" coreSize={8} maxScale={5} duration={5000} />
                            <Text style={[styles.subtitle, { marginLeft: 2 }]}>LIVE</Text>
                            <Text>&bull;</Text>
                            <Text style={[styles.subtitle, { textTransform: 'none' }]}>Last check-in 2h ago</Text>
                        </View>
                        <Text style={styles.title}>Camping Bersama Menyambut Ramadhan</Text>
                    </View>

                    <TouchableOpacity style={styles.switchButton}>
                        <MaterialCommunityIcons name="dots-horizontal" size={22} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.timelineBlock}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="calendar-today" size={18} />
                        <Text style={styles.timelineValue}>26 Dec 2025</Text>
                        <Text style={[styles.timelineValue, { fontWeight: 'normal', color: '#666' }]}>&bull;</Text>
                        <Text style={[styles.timelineValue, { fontWeight: 'normal', color: '#666' }]}>To</Text>
                        <Text style={styles.timelineValue}>Ongoing</Text>
                    </View>
                </View>

                <View style={[styles.timelineBlock, { marginTop: 5 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="timetable" size={18} />
                        <Text style={[styles.timelineValue, { fontWeight: 'normal' }]}>Day 6 on the road</Text>
                    </View>
                </View>

                <View style={[styles.timelineBlock, { marginTop: 5 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="lock-outline" size={18} />
                        <Text style={[styles.timelineValue, { fontWeight: 'normal' }]}>Private</Text>
                    </View>
                </View>

                <View style={[styles.statsRow, { justifyContent: 'space-between'}]}>
                    <View style={styles.expenseRow}>
                        <Text style={styles.expenseTitle}>Rp 584.000.353</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.subtitle, styles.expenseSubtitle, { textTransform: 'none', fontSize: 12 }]}>
                                Total expense
                            </Text>

                            <Text style={[styles.subtitle, styles.expenseSubtitle, { textTransform: 'none', fontSize: 12 }]}>&bull;</Text>
                            <Text style={[styles.subtitle, styles.expenseSubtitle, { textTransform: 'none', fontSize: 12 }]}>172 items</Text>
                        </View>
                    </View>

                    <View style={styles.expenseRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialCommunityIcons name="map-marker-path" size={20} style={{ opacity: 0.8 }} />
                            <Text style={[styles.expenseTitle, { opacity: 0.8 }]}>238.7</Text>
                            <Text style={[styles.expenseTitle, { fontWeight: 'normal', fontSize: 14 }]}>km</Text>
                        </View>
                        <Text style={[styles.subtitle, styles.expenseSubtitle, { textTransform: 'none', fontSize: 12 }]}>Distances</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

export const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 0,
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 22,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 18,
        position: 'relative',
        flexDirection: 'column',
        zIndex: 15,
        justifyContent: 'flex-end',
        borderRadius: 22,
        boxShadow: '0px 1px 4px 0px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 18,
        color: '#000',
        fontFamily: 'Inter_400Regular',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 12,
        textTransform: 'uppercase',
        color: '#666',
        fontFamily: 'Inter_500Medium',
    },

    /* header */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    switchButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -6,
        boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.16)',
        opacity: 0.8,
    },

    /* timeline */
    timeline: {
        flexDirection: 'row',
    },
    timelineBlock: {
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    timelineValue: {
        fontWeight: '700',
        fontSize: 14,
    },

    /* stats */
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 16,
        marginTop: 4,
    },

    /* expense row */
    expenseRow: {
    
    },
    expenseTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    expenseSubtitle: {
        marginTop: 4,
        color: '#666',
    },
});