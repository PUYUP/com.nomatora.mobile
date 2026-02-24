import { StyleSheet, Text, View } from "react-native";

export function JourneyStats() {
    return (
        <View style={styles.container}>
            <View style={styles.blockContainer}>
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Distance</Text>
                    <Text style={styles.blockValue}>12.5 km</Text>
                </View>

                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Time</Text>
                    <Text style={styles.blockValue}>1h 30m</Text>
                </View>

                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Expense (Rp)</Text>
                    <Text style={styles.blockValue}>4.330.000</Text>
                </View>
            </View>

            <View style={styles.blockContainer}>
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Stories</Text>
                    <Text style={styles.blockValue}>42</Text>
                </View>

                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Photos</Text>
                    <Text style={styles.blockValue}>341</Text>
                </View>

                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Videos</Text>
                    <Text style={styles.blockValue}>65</Text>
                </View>
            </View>
        </View>
    );
}

export const styles = StyleSheet.create({
    container: {
        
    },
    blockContainer: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    block: {
        flexDirection: 'column',
        padding: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 8,
        boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)',
        minWidth: 86,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 1)',
    },
    blockTitle: {
        fontSize: 10,
        color: '#555',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    blockValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
    },
});