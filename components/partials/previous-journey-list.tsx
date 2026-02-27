import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PreviousJourneyList() {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerText}>Past Journeys</Text>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="history" size={16} color="#333" />
                    <Text style={{ opacity: 0.7 }}>View history</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listColumn}>
                <TouchableOpacity style={styles.itemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={styles.contentBlock}>
                            <Text style={styles.itemTitle} numberOfLines={2}>Semalam di Antara Laut dan Savana, Sarae Nduha TN Gunung Tambora</Text>
                        </View>

                        <View style={styles.dateBlock}>
                            <Text style={styles.itemDate}>15 Dec 2026</Text>
                            <Text style={styles.itemSubDate}>To &bull; 27 Dec 26</Text>
                        </View>
                    </View>

                    <View style={{ justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Text style={styles.itemMeta}>Rp 24.5 jt • 8 items</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialCommunityIcons name="map-marker-path" size={16} style={styles.itemMeta} />
                            <Text style={styles.itemMeta}>128.7 km</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.itemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={styles.contentBlock}>
                            <Text style={styles.itemTitle} numberOfLines={2}>ROVERHOOD | Tiara Camp Citeko, Puncak Bogor</Text>
                        </View>

                        <View style={styles.dateBlock}>
                            <Text style={styles.itemDate}>15 Dec 2026</Text>
                            <Text style={styles.itemSubDate}>To &bull; 27 Dec 26</Text>
                        </View>
                    </View>

                    <View style={{ justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Text style={styles.itemMeta}>Rp 24.5 jt • 21 items</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialCommunityIcons name="map-marker-path" size={16} style={styles.itemMeta} />
                            <Text style={styles.itemMeta}>128.7 km</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: '#333',
        paddingLeft: 2,
        marginBottom: 4,
    },
    listColumn: {
        flexDirection: 'column',
        gap: 16,
    },
    itemRow: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        boxShadow: '0px 1px 4px 0px rgba(0, 0, 0, 0.1)',
    },
    itemTitle: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    itemMeta: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    contentBlock: {
        maxWidth: '65%',
    },
    dateBlock: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    itemDate: {
        fontSize: 14,
        marginBottom: 2,
    },
    itemSubDate: {
        color: '#666',
        fontSize: 12,
        textAlign: 'right',
    }
});