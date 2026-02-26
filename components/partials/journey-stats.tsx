import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function JourneyStats() {
    const memories = [
        { id: '7', title: 'Photos', value: '464', icon: 'folder-image' },
        { id: '8', title: 'Video', value: '464', icon: 'video-box' },
        { id: '9', title: 'Stories', value: '893', icon: 'draw-pen' },
        { id: '11', title: 'Check-in', value: '1.254', icon: 'map-marker' },
    ];

    const contributions = [
        { id: '6', title: 'Geo Prices', value: '1.252', icon: 'tag-text' },
        { id: '10', title: 'Signals', value: '74', icon: 'antenna' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.expense}>
                <Text style={styles.expenseTitle}>Total Expense</Text>
                <Text style={styles.expenseValue}>Rp 584.000.353</Text>
                <Text style={[styles.expenseTitle, { marginTop: 4, fontSize: 14, opacity: 0.7 }]}>173 items</Text>
            </View>

            <View style={styles.timeline}>
                <View style={styles.timelineBlock}>
                    <View style={styles.timelineHeader}>
                        <MaterialCommunityIcons name="calendar-today" size={20} />
                        <Text style={styles.expenseTitle}>From</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.timelineValue}>26 Dec 2025</Text>
                        <Text style={[styles.timelineValue, { fontWeight: 'normal', color: '#666' }]}>&bull;</Text>
                        <Text style={[styles.timelineValue, { fontWeight: 'normal', color: '#666' }]}>To</Text>
                        <Text style={styles.timelineValue}>16 Jan 2026</Text>
                    </View>
                </View>

                <View style={[styles.timelineBlock]}>
                    <View style={styles.timelineHeader}>
                        <MaterialCommunityIcons name="map-marker-path" size={20} />
                        <Text style={styles.expenseTitle}>5d 17h</Text>
                    </View>

                    <Text style={styles.timelineValue}>293.4 km</Text>
                </View>
            </View>

            <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
                <Text style={[styles.expenseTitle, styles.sectionTitle]}>Memories</Text>
            </View>

            <FlatList
                data={memories}
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.fixedWidthItem}>
                        <View style={styles.blockRow}>
                            <MaterialCommunityIcons name={item.icon as any} style={styles.icon} color="#1A1A1A" />
                            <View style={styles.content}>
                                <Text style={styles.value}>{item.value}</Text>
                                <Text style={styles.title}>{item.title}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                numColumns={2}
                columnWrapperStyle={{ 
                    justifyContent: 'space-between', 
                    paddingHorizontal: 16,
                }}
            />

            <View style={{ paddingHorizontal: 24, marginBottom: 8, marginTop: 12 }}>
                <Text style={[styles.expenseTitle, styles.sectionTitle]}>Contributions</Text>
            </View>

            <FlatList
                data={contributions}
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.fixedWidthItem}>
                        <View style={styles.blockRow}>
                            <MaterialCommunityIcons name={item.icon as any} style={styles.icon} color="#1A1A1A" />
                            <View style={styles.content}>
                                <Text style={styles.value}>{item.value}</Text>
                                <Text style={styles.title}>{item.title}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                numColumns={2}
                columnWrapperStyle={{ 
                    justifyContent: 'space-between', 
                    paddingHorizontal: 16,
                }}
            />
        </View>
    );
}

export const styles = StyleSheet.create({
    container: {},
    fixedWidthItem: {
        marginBottom: 16,
        width: '50%',
        paddingHorizontal: 8,
    },
    blockRow: {
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: '#e4e4e4',
    },
    title: {
        fontSize: 13,
        color: '#666',
        marginTop: 3,
        textAlign: 'center',
    },
    sectionTitle: {
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 12,
    },
    value: {
        fontWeight: '700',
        fontSize: 18,
        textAlign: 'center',
    },
    content: {},
    icon: {
        fontSize: 24,
        opacity: 0.5,
    },

    /* expense */
    expense: {
        padding: 16,
        paddingBottom: 26,
        marginBottom: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expenseTitle: {
        fontSize: 15,
        color: '#666',
        marginBottom: 4,
    },
    expenseValue: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    /* timeline */
    timeline: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 26,
    },
    timelineBlock: {
        
    },
    timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    timelineValue: {
        fontWeight: '700',
        fontSize: 15,
    }
});