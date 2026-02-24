import { SlidePointData } from '@/models/location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format as formatDate } from 'date-fns';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Carousel from "react-native-reanimated-carousel";
import { DashedLine } from '../ui/dashed-line';

const SAMPLES: SlidePointData[] = [
    {
        latitude: -6.1993066979615294,
        longitude: 106.80059008229979,
        title: 'Makan sate di Monas bareng Vetel',
        type: 'poi',
        description: 'Monumen Nasional, ikon Jakarta',
        placeName: 'Gambir, Central Jakarta',
        arrivedAt: '2026-02-23T08:00:00Z',
    },
    {
        latitude: -6.197749445570561,
        longitude: 106.79634146318625,
        title: 'Sate Khas Senayan',
        type: 'restaurant',
        description: 'Restoran sate legendaris',
        placeName: 'Jl. Asia Afrika, Senayan',
        arrivedAt: '2026-02-23T09:00:00Z',
    },
    {
        latitude: -6.197749445570561,
        longitude: 106.79634146318625,
        title: 'Restoran sate legendaris',
        type: 'expense',
        description: 'Restoran sate legendaris',
        placeName: 'Jl. Asia Afrika, Senayan',
        arrivedAt: '2026-02-23T09:00:00Z',
    },
    {
        latitude: -6.193994955085802,
        longitude: 106.7940562211111,
        title: 'Plaza Senayan',
        type: 'mall',
        placeName: 'Jl. Asia Afrika, Senayan',
        arrivedAt: '2026-02-23T10:00:00Z',
    },
    {
        latitude: -6.183765966320194,
        longitude: 106.7903011284815,
        title: 'Stasiun Palmerah',
        type: 'station',
        description: 'Stasiun KRL Palmerah',
        placeName: 'Jl. Palmerah Utara',
        arrivedAt: '2026-02-23T11:00:00Z',
    },
    {
        latitude: -6.165428708566159,
        longitude: 106.78182152873754,
        title: 'Gelora Bung Karno',
        type: 'stadium',
        placeName: 'Senayan, Jakarta',
        arrivedAt: '2026-02-23T12:00:00Z',
    },
    {
        latitude: -6.207360786794562,
        longitude: 106.71416761925691,
        title: 'Pantai Indah Kapuk',
        type: 'beach',
        placeName: 'PIK, North Jakarta',
        arrivedAt: '2026-02-23T13:00:00Z',
    },
    {
        latitude: -6.213013701358019,
        longitude: 106.73431637343074,
        title: 'Taman Wisata Alam Mangrove',
        type: 'park',
        placeName: 'Pantai Indah Kapuk',
        arrivedAt: '2026-02-23T14:00:00Z',
    },
    {
        latitude: -6.124514553307727,
        longitude: 106.58507724480036,
        title: 'Bandara Soekarno-Hatta',
        type: 'airport',
        description: 'Bandara Internasional utama',
        placeName: 'Tangerang, Banten',
        arrivedAt: '2026-02-23T15:00:00Z',
    },
];

type SlideItem = SlidePointData | { type: 'origin' | 'destination' };

const data: SlideItem[] = [
    { type: 'origin' }, // item pertama
    ...SAMPLES,
    { type: 'destination' }, // item terakhir
];

const RenderPlaceholder = () => {
    const [containerWidth, setContainerWidth] = useState(0);
    const ITEM_WIDTH = containerWidth / 2.15;

    return (
        <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} style={styles.placeholderContainer}>
            <View style={[styles.glassCard, styles.glassCardCentered, { height: (ITEM_WIDTH / 2) + 10 }]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="home-export-outline" size={32} style={styles.iconColor} />
                </View>
                <Text style={[styles.title, styles.titleBold, styles.titleTopSpacing]} numberOfLines={1}>Paal Merah Kota Jambi</Text>
                <Text style={[styles.title, styles.titleTopSpacing]} numberOfLines={1}>9 Des 25</Text>
            </View>

            <View style={styles.connectorFlex}>
                <DashedLine color="#fff" dashWidth={5} dashHeight={2} gap={4} />
            </View>

            <TouchableOpacity style={styles.slipInPoint}>
                <MaterialCommunityIcons name="plus" size={22} />
            </TouchableOpacity>

            <View style={styles.connectorFlex}>
                <DashedLine color="#fff" dashWidth={5} dashHeight={2} gap={4} />
            </View>

            <View style={[styles.glassCard, { height: (ITEM_WIDTH / 2) + 10 }]}>
                <Text style={styles.titleWhite}>Wandering...</Text>
                <TouchableOpacity style={styles.setDestinationButton}>
                    <Text>Set dest</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export function SlidePoints() {
    const [containerWidth, setContainerWidth] = useState(0);
    const ITEM_WIDTH = containerWidth / 2.15;
    const PEEK_RIGHT = ITEM_WIDTH * 0.5;

    return (
        <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            {containerWidth > 0 && data.length > 3 && (
                <Carousel
                    loop={false}
                    snapEnabled
                    pagingEnabled={false}
                    data={data}
                    width={ITEM_WIDTH + 34}
                    height={(ITEM_WIDTH / 2) + 10}
                    maxScrollDistancePerSwipe={ITEM_WIDTH + 34}
                    withAnimation={{
                        type: 'spring',
                        config: {
                            damping: 15,
                            mass: 1,
                            stiffness: 120,
                            overshootClamping: false,
                        },
                    }}
                    style={{
                        width: containerWidth + PEEK_RIGHT,
                        overflow: 'visible',
                    }}
                    renderItem={({ item, index }) => {
                        if ('type' in item && item.type === 'origin') {
                            return (
                                <View style={styles.itemRow}>
                                    <View style={[styles.glassCard, styles.glassCardCentered, styles.glassCardFixed, { height: (ITEM_WIDTH / 2) + 10 }]}>
                                        <View style={styles.iconContainer}>
                                            <MaterialCommunityIcons name="home-export-outline" size={32} style={styles.iconColor} />
                                        </View>
                                        <Text style={[styles.title, styles.titleBold, styles.titleTopSpacing]} numberOfLines={1}>Paal Merah Kota Jambi</Text>
                                        <Text style={[styles.title, styles.titleTopSpacing]} numberOfLines={1}>9 Des 25</Text>
                                    </View>

                                    <View style={styles.connectorOrigin}>
                                        <DashedLine color="#fff" dashWidth={5} dashHeight={2} gap={4} />
                                    </View>

                                    <TouchableOpacity style={styles.slipInPoint}>
                                        <MaterialCommunityIcons name="plus" size={22} />
                                    </TouchableOpacity>
                                </View>
                            );
                        }

                        if ('type' in item && item.type === 'destination') {
                            return (
                                <View style={styles.itemRow}>
                                    <View style={styles.connectorDestination}>
                                        <DashedLine color="#fff" dashWidth={5} dashHeight={2} gap={4} />
                                    </View>

                                    <View style={[styles.glassCard, styles.glassCardFixed, { height: (ITEM_WIDTH / 2) + 10 }]}>
                                        <Text style={styles.titleWhite}>Wandering...</Text>
                                        <TouchableOpacity style={styles.setDestinationButton}>
                                            <Text>Set dest</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }

                        const slidePoint = item as SlidePointData;
                        return (
                            <View style={styles.itemRow}>
                                <View style={[styles.glassCard, styles.glassCardPoint, { width: ITEM_WIDTH - 10, height: (ITEM_WIDTH / 2) + 10 }]}>
                                    <Text style={[styles.title, styles.titleBold, styles.titleLarge]} numberOfLines={2}>{slidePoint.title}</Text>
                                    <View style={styles.cardFooter}>
                                        <View style={styles.metaBlock}>
                                            <View style={styles.metaItem}>
                                                <MaterialCommunityIcons name="image-multiple" size={16} color="#fff" />
                                                <Text style={[styles.title, styles.titleSmall]} numberOfLines={1}>3</Text>
                                            </View>

                                            <View style={styles.metaItem}>
                                                <MaterialCommunityIcons name="video-box" size={16} color="#fff" />
                                                <Text style={[styles.title, styles.titleSmall]} numberOfLines={1}>50 m</Text>
                                            </View>
                                        </View>

                                        {slidePoint.arrivedAt && (
                                            <Text style={styles.title}>
                                                {formatDate(new Date(slidePoint.arrivedAt), 'd MMM yy, HH:mm')}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.slipInPoint}>
                                    <MaterialCommunityIcons name="plus" size={22} />
                                </TouchableOpacity>
                            </View>
                        )
                    }}
                    onSnapToItem={(index) => console.log("current index:", index)}
                />
            )}

            {data.length <= 3 && (
                <RenderPlaceholder />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // Glass card — shared base for all cards
    glassCard: {
        width: 114,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    glassCardCentered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    glassCardFixed: {
        // explicit 114 width already in glassCard; alias kept for readability
    },
    glassCardPoint: {
        marginRight: 6,
        flexDirection: 'column',
    },

    // Row layout
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // Connectors
    connectorFlex: {
        flex: 1,
    },
    connectorOrigin: {
        width: 44,
        marginRight: 4,
    },
    connectorDestination: {
        width: 34,
        marginRight: 4,
    },

    // Slip-in button
    slipInPoint: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffd700',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 4,
        elevation: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Icon
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconColor: {
        color: 'white',
    },

    // Text
    title: {
        fontSize: 12,
        color: 'white',
    },
    titleWhite: {
        color: 'white',
    },
    titleBold: {
        fontWeight: '700',
    },
    titleLarge: {
        fontSize: 14,
    },
    titleSmall: {
        fontSize: 12,
    },
    titleTopSpacing: {
        marginTop: 4,
    },

    // Point card internals
    cardFooter: {
        marginTop: 'auto',
    },
    metaBlock: {
        gap: 8,
        marginBottom: 2,
        flexDirection: 'row',
    },
    metaItem: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },

    // Destination button
    setDestinationButton: {
        backgroundColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
        marginTop: 10,
    },

    // Placeholder layout
    placeholderContainer: {
        flex: 1,
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
    },
});