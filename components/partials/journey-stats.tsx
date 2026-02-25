import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function JourneyStats() {
    const data = [
        { id: '1', title: 'Start', value: '12 Des 2025', icon: 'calendar-today' },
        { id: '2', title: 'End', value: '12 Des 2025', icon: 'calendar-check' },
        { id: '3', title: 'Distances', value: '293.4 km', icon: 'map-marker-distance' },
        { id: '4', title: 'Time', value: '5h 32m', icon: 'clock-outline' },
        { id: '5', title: 'Expense (452 itm)', value: 'Rp 584.000.353', icon: 'currency-usd' },
        { id: '6', title: 'Geo Prices', value: '1.252', icon: 'tag-text' },
        { id: '7', title: 'Photos', value: '464', icon: 'folder-image' },
        { id: '8', title: 'Video', value: '464', icon: 'video-box' },
        { id: '9', title: 'Stories', value: '893', icon: 'draw-pen' },
        { id: '10', title: 'Signals', value: '74', icon: 'antenna' },
    ];

    return (
        <View style={styles.container}>
            <FlatList
                data={data}
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
        borderWidth: 1,
        borderColor: '#d3d3d3',
    },
    title: {
        fontSize: 13,
        color: '#666',
        marginTop: 3,
        textAlign: 'center',
    },
    value: {
        fontWeight: '700',
        fontSize: 16,
        textAlign: 'center',
    },
    content: {},
    icon: {
        fontSize: 30,
        color: '#2f4f4f',
    },
});