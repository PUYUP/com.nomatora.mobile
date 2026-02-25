import LocatorMapbox from "@/components/partials/locator-mapbox";
import { SlidePoints } from "@/components/partials/slide-points";
import { getCurrentLocation } from "@/libs/location";
import { CoordsData, PlaceData } from "@/models/location";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function Home() {
    const insets = useSafeAreaInsets();
    const [currentLocation, setCurrentLocation] = useState<CoordsData | null>(null);

    const places: PlaceData[] = [
        {
            properties: { name: 'Dummy 1' },
            geometry: {
                coordinate: { latitude: -6.1993066979615294, longitude: 106.80059008229979 }, // [lat, lng]
            },
        },
        {
            properties: { name: 'Dummy 2' },
            geometry: {
                coordinate: { latitude: -6.197749445570561, longitude: 106.79634146318625 }, // [lat, lng]
            },
        },
        {
            properties: { name: 'Dummy 3' },
            geometry: {
                coordinate: { latitude: -6.193994955085802, longitude: 106.7940562211111 }, // [lat, lng]
            },
        },
        {
            properties: { name: 'Dummy 4' },
            geometry: {
                coordinate: { latitude: -6.183765966320194, longitude: 106.7903011284815 }, // [lat, lng]
            },
        },
        {
            properties: { name: 'Dummy 5' },
            geometry: {
                coordinate: { latitude: -6.165428708566159, longitude: 106.78182152873754 }, // [lat, lng]
            },
        },
        {
            properties: { name: 'Dummy 6' },
            geometry: {
                coordinate: { latitude: -6.207360786794562, longitude: 106.71416761925691 }, // [lat, lng]
            },
        },
        {
            properties: { name: 'Dummy 7' },
            geometry: {
                coordinate: { latitude: -6.213013701358019, longitude: 106.73431637343074 }, // [lat, lng]
            },
        },
        {
            properties: { name: 'Dummy 8' },
            geometry: {
                coordinate: { latitude: -6.124514553307727, longitude: 106.58507724480036 }, // [lat, lng]
            },
        }, 
    ];

    useEffect(() => {
        const onMount = async () => {
            try {
                const currentLocation = await getCurrentLocation();
                if (currentLocation.ok && currentLocation.data) {
                    setCurrentLocation(currentLocation.data);

                    // push current location to places list
                    places.unshift({
                        properties: { name: 'Current Location' },
                        geometry: {
                            coordinate: {
                                latitude: currentLocation.data.latitude,
                                longitude: currentLocation.data.longitude,
                            },
                        },
                    });
                }
            } catch (error) {
                console.error('Error fetching location:', error);
            }
        };
        onMount();
    }, []);

    return (
        <>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['left', 'right']}>
                <View style={{ flex: 1 }}>
                    {currentLocation && (
                        <View style={{ flex: 1 }}>
                            <LocatorMapbox
                                requestId="tracking-location"
                                purpose="tracking"
                                initialLat={currentLocation ? currentLocation.latitude : 0}
                                initialLng={currentLocation ? currentLocation.longitude : 0}
                                initialPlaceName=""
                                onConfirm={(loc) => console.log('confirmed', loc)}
                                places={places}
                                mapType={'standard'}
                                fitBounds={false}
                                controlPosition={{ top: insets.top + 16, right: 16 }}
                                mapPadding={{ bottom: 0, top: 0, right: 0, left: 0 }}
                                isSelecting={false}
                                radiusCircle={{ radiusMeters: 250 }}
                            />
                        </View>
                    )}
                </View>

                {/* <View style={[styles.statsContainer, { top: insets.top + 16 }]}>
                    <JourneyStats />
                </View> */}

                <View style={[styles.titleContainer, { top: insets.top + 16 }]}>
                    <Text style={styles.title}>Nomatora</Text>
                </View>

                <View style={[styles.slidePointContainer, { bottom: insets.bottom + 90 }]}>
                    <SlidePoints />
                </View>

                <LinearGradient
                    colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.1)', 'transparent']}
                    style={{
                        position: 'absolute',
                        height: 50,
                        left: 0,
                        right: 0,
                        top: 0,
                        zIndex: 120, // ✅ lebih tinggi dari map (115)
                        pointerEvents: 'none', // ✅ agar tidak block touch event
                    }}
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.15)']}
                    style={{
                        position: 'absolute',
                        height: 240,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 120, // ✅ lebih tinggi dari map (115)
                        pointerEvents: 'none', // ✅ agar tidak block touch event
                    }}
                />
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    slidePointContainer: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 130,
    },
    statsContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 130,
        width: '70%',
    },
    titleContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 'auto',
        zIndex: 230,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 20,
        boxShadow: '0px 2px 8px 0px rgba(0, 0, 0, 0.16)',
    },
    title: {
        fontSize: 22,
        fontFamily: "ZalandoSansExpanded_900Black",
    }
});