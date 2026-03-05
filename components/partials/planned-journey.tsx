import { useGetQuery } from "@/redux/tracking/tracking-api";
import { format } from "date-fns";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PlannedJourney() {
    const [userId, setUserId] = useState<string>('');
    const { data, error, isLoading } = useGetQuery({ user_id: userId }, { skip: !userId });

    setTimeout(() => {
        setUserId('current-user-id'); // Simulate setting a user ID after some async operation
    }, 1000);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerText}>My Plans</Text>
            </View>

            <View style={styles.listColumn}>
                {isLoading && <Text>Loading...</Text>}
                {data && data.length === 0 && <Text>No planned journeys found.</Text>}
                {data && data.map((journey) => (
                    <TouchableOpacity key={journey.id} style={styles.itemRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.calendarBlock}>
                                <View style={styles.calendarHeader}>
                                    <Text style={styles.calendarMonth}>{new Date(journey.started_at).toLocaleString('default', { month: 'short' })}</Text>
                                </View>
                                <View style={styles.calendarDate}>
                                    <Text style={styles.calendarDateText}>{new Date(journey.started_at).getDate()}</Text>
                                </View>
                            </View>

                            <View style={styles.contentBlock}>
                                <Text style={styles.itemTitle} numberOfLines={2}>{journey.name}</Text>

                                <View style={styles.dateBlock}>
                                    <Text style={styles.itemDate}>{format(new Date(journey.started_at), 'MMM dd, yyyy')}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
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
        fontWeight: '700',
    },
    itemMeta: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    contentBlock: {
        flex: 1,
    },
    dateBlock: {
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        marginTop: 2,
    },
    itemDate: {
        fontSize: 13,
        marginBottom: 2,
        color: '#666',
    },
    itemSubDate: {
        color: '#666',
        fontSize: 12,
        textAlign: 'right',
    },
    calendarBlock: {
        width: 48,
        height: 52,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarHeader: {
        backgroundColor: '#ffd700',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: 24,
    },
    calendarMonth: {
        fontSize: 12,
        color: '#333',
        textTransform: 'uppercase',
    },
    calendarDate: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarDateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
});