import { SlidePointData } from '@/models/location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format as formatDate } from 'date-fns';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Carousel from "react-native-reanimated-carousel";
import { DashedLine } from '../ui/dashed-line';
import { SignalBar } from './signal-bar';

const SAMPLES: SlidePointData[] = [
    {
        latitude: -6.1993066979615294,
        longitude: 106.80059008229979,
        title: 'Makan sate di Monas bareng Vetel',
        type: 'expense',
        description: 'Monumen Nasional, ikon Jakarta',
        placeName: 'Gambir, Central Jakarta',
        arrivedAt: '2026-02-23T08:00:00Z',
    },
    {
        latitude: -6.197749445570561,
        longitude: 106.79634146318625,
        title: 'Cilok',
        type: 'geoprice',
        description: 'Restoran sate legendaris',
        placeName: 'Jl. Asia Afrika, Senayan',
        arrivedAt: '2026-02-23T09:00:00Z',
        meta: {
            price: 15000,
            currency: 'IDR',
            items: [
                { name: 'Cilok original', price: 7000 },
                { name: 'Cilok keju', price: 8000 },
                { name: 'Cilok pedas', price: 9000 },
                { name: 'Cilok bakar', price: 10000 },
                { name: 'Cilok isi daging', price: 12000 },
                { name: 'Cilok isi sosis', price: 11000 },
            ],
        }
    },
    {
        latitude: -6.197749445570561,
        longitude: 106.79634146318625,
        title: 'Air es kelapa',
        type: 'geoprice',
        description: 'Restoran sate legendaris',
        placeName: 'Jl. Asia Afrika, Senayan',
        arrivedAt: '2026-02-23T09:00:00Z',
        meta: {
            price: 10000,
            currency: 'IDR',
            items: [ 
                { name: 'Air es kelapa', price: 10000 },
            ],
        }
    },
    {
        latitude: -6.197749445570561,
        longitude: 106.79634146318625,
        title: 'Jl. Asia Afrika, Senayan',
        type: 'expense',
        description: 'Restoran sate legendaris',
        placeName: 'Jl. Asia Afrika, Senayan',
        arrivedAt: '2026-02-23T09:00:00Z',
    },
    {
        latitude: -6.193994955085802,
        longitude: 106.7940562211111,
        title: 'tangkuban perahu senja bersama vetel',
        type: 'story',
        placeName: 'Jl. Asia Afrika, Senayan',
        arrivedAt: '2026-02-23T10:00:00Z',
    },
    {
        latitude: -6.165428708566159,
        longitude: 106.78182152873754,
        title: '87 dBm',
        type: 'network',
        placeName: 'Senayan, Jakarta',
        arrivedAt: '2026-02-23T12:00:00Z',
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

const RenderPlaceholder = ({ height }: { height: number }) => {
    return (
        <View style={styles.placeholderContainer}>
            <View style={[styles.glassCard, styles.glassCardCentered, { height: height }]}>
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

            <View style={[styles.glassCard, { height: height }]}>
                <Text style={styles.titleWhite}>Wandering...</Text>
                <TouchableOpacity style={styles.setDestinationButton}>
                    <Text style={{ textTransform: 'uppercase', fontSize: 13 }}>Set dest</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

/**
 * Expense card
 */
const RenderExpenseCard = ({ slidePoint, width, height }: { slidePoint: SlidePointData; width: number; height: number }) => {
    return (
        <View style={styles.itemRow}>
            <View style={[styles.glassCard, styles.glassCardPoint, { width: width, height: height }]}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, styles.titleBold, styles.titleLarge, styles.headerTitle]} numberOfLines={2}>
                        {slidePoint.title}
                    </Text>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="food-fork-drink" size={20} color="#fff" />
                    </View>
                </View>
                
                <View style={styles.cardFooter}>
                    <View style={styles.metaBlock}>
                        <Text style={[styles.title, styles.titleSmall, styles.titleBold]} numberOfLines={1}>Rp 345.000</Text>
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
}

/**
 * Story card
 */
const RenderStoryCard = ({ slidePoint, width, height }: { slidePoint: SlidePointData; width: number; height: number }) => {
    return (
        <View style={styles.itemRow}>
            <View style={[styles.glassCard, styles.glassCardPoint, { width: width, height: height }]}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, styles.titleBold, styles.titleLarge, styles.headerTitle]} numberOfLines={2}>
                        {slidePoint.title}
                    </Text>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="draw-pen" size={20} color="#fff" />
                    </View>
                </View>
                
                <View style={styles.cardFooter}>
                    <View style={styles.metaBlock}>
                        <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="image-multiple" size={16} color="#fff" />
                            <Text style={[styles.title, styles.titleSmall]} numberOfLines={1}>3</Text>
                        </View>

                        <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="video-box" size={16} color="#fff" />
                            <Text style={[styles.title, styles.titleSmall]} numberOfLines={1}>50 min</Text>
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
}

/**
 * Network card
 */
const RenderNetworkCard = ({ slidePoint, width, height }: { slidePoint: SlidePointData; width: number; height: number }) => {
    return (
        <View style={styles.itemRow}>
            <View style={[styles.glassCard, styles.glassCardPoint, { width: width, height: height }]}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <SignalBar rawStrength={1} />
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="antenna" size={20} color="#fff" />
                    </View>
                </View>
                
                <View style={styles.cardFooter}>
                    <View style={styles.metaBlock}>
                        <Text style={[styles.title, styles.titleBold]}>Telkomsel</Text>
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
}

/**
 * Geo price card
 */
const RenderGeoPriceCard = ({ slidePoint, width, height }: { slidePoint: SlidePointData; width: number; height: number }) => {
    return (
        <View style={styles.itemRow}>
            <View style={[styles.glassCard, styles.glassCardPoint, { width: width, height: height }]}>
                <View style={styles.headerRow}>
                    {slidePoint.meta?.items?.length <= 1 && (
                        <Text style={[styles.title, styles.titleBold, styles.titleLarge]} numberOfLines={2}>{slidePoint.title}</Text>
                    )}

                    {slidePoint.meta?.items?.length > 1 && (
                        <View style={{ width: '80%' }}>
                            {slidePoint?.meta?.items?.slice(0, 2).map((item: any, index: number) => (
                                <View key={index}>
                                    <Text style={[styles.title, styles.titleBold, styles.titleLarge]} numberOfLines={1}>{item.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="tag-text" size={20} color="#fff" />
                    </View>
                </View>
                
                <View style={styles.cardFooter}>
                    {slidePoint.meta?.items?.length <= 1 && (
                        <View style={styles.metaBlock}>
                            <Text style={[styles.title, styles.titleSmall, styles.titleBold]} numberOfLines={1}>
                                Rp {slidePoint.meta?.price?.toLocaleString('id-ID')}
                            </Text>
                        </View>
                    )}
                    
                    {slidePoint.meta?.items?.length > 1 && (
                        <View style={styles.metaBlock}>
                            <View style={styles.metaItem}>
                                <MaterialCommunityIcons name="invoice-list-outline" size={16} color="#fff" />
                                <Text style={[styles.title, styles.titleSmall]} numberOfLines={1}>3 items</Text>
                            </View>
                        </View>
                    )}

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
}

export function SlidePoints() {
    const [containerWidth, setContainerWidth] = useState(0);
    const ITEM_WIDTH = containerWidth / 2.15;
    const PEEK_RIGHT = ITEM_WIDTH * 0.5;
    const width = ITEM_WIDTH + 34; // for carousel width
    const cardWidth = ITEM_WIDTH - 10;
    const cardHeight = (ITEM_WIDTH / 2) + 16;

    return (
        <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            {containerWidth > 0 && data.length > 2 && (
                <Carousel
                    loop={false}
                    snapEnabled
                    pagingEnabled={false}
                    data={data}
                    width={width}
                    height={cardHeight}
                    maxScrollDistancePerSwipe={width}
                    onSnapToItem={(index) => console.log("current index:", index)}
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
                        // variable
                        const slidePoint = item as SlidePointData;

                        if ('type' in item && item.type === 'origin') {
                            return (
                                <View style={styles.itemRow}>
                                    <View style={[styles.glassCard, styles.glassCardCentered, styles.glassCardFixed, { height: cardHeight }]}>
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

                                    <View style={[styles.glassCard, styles.glassCardFixed, { height: cardHeight }]}>
                                        <Text style={styles.titleWhite}>Wandering...</Text>
                                        <TouchableOpacity style={styles.setDestinationButton}>
                                            <Text style={{ textTransform: 'uppercase', fontSize: 13 }}>Set dest</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }

                        if ('type' in item && item.type === 'expense') {
                            return (
                                <RenderExpenseCard slidePoint={slidePoint} width={cardWidth} height={cardHeight} />
                            );
                        }

                        if ('type' in item && item.type === 'geoprice') {
                            return (
                                <RenderGeoPriceCard slidePoint={slidePoint} width={cardWidth} height={cardHeight} />
                            );
                        }

                        if ('type' in item && item.type === 'story') {
                            return (
                                <RenderStoryCard slidePoint={slidePoint} width={cardWidth} height={cardHeight} />
                            );
                        }

                        if ('type' in item && item.type === 'network') {
                            return (
                                <RenderNetworkCard slidePoint={slidePoint} width={cardWidth} height={cardHeight} />
                            );
                        }

                        return (
                            <View style={styles.itemRow}>
                                <View style={[styles.glassCard, styles.glassCardPoint, { width: cardWidth, height: cardHeight }]}>
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
                />
            )}

            {data.length <= 3 && (
                <RenderPlaceholder height={cardHeight} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // Glass card — shared base for all cards
    glassCard: {
        width: 114,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 16,
        padding: 12,
        boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)',
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
        boxShadow: '0px 2px 8px 0px rgba(0, 0, 0, 0.16)',
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
        paddingHorizontal: 6,
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

    // Expense card
    headerRow: {
        flexDirection: 'row',
    },
    headerTitle: {
        flex: 1,
        paddingRight: 26,
    },
    headerIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: -4,
        right: -4,
    }
});