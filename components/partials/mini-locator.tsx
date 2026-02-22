import AnimatedOval from '@/components/ui/animated-oval';
import MapMarker from '@/components/ui/mappin';
import { getCurrentLocation, isLocationServiceEnabled, openAppSettings, openLocationSettings, reverseGeocodeLocation } from '@/libs/location';
import { PlaceData } from '@/models/location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Image, Platform, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MapView, { Callout, EdgePadding, Marker, Polyline, Region } from 'react-native-maps';
import { useDispatch } from 'react-redux';

type MiniLocatorProps = {
	requestId: string;
	purpose?: string;
	initialLat?: string | number;
	initialLng?: string | number;
	initialPlaceName?: string;
	mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'none';
	containerStyle?: StyleProp<ViewStyle>;
	onConfirm?: (payload: { latitude: string; longitude: string; placeName: string; purpose?: string }) => void;
	places?: PlaceData[];
	fitPlacesToMap?: boolean;
	controlPosition?: { top?: number; right?: number; bottom?: number; left?: number };
	mapPadding?: Partial<EdgePadding>;
};

type PlaceCoord = {
	latitude: number;
	longitude: number;
	title: string;
};

/**
 * Custom marker (static view).
 */
export const customMarker = (coord: PlaceCoord, index: number, total: number) => {
	if (!coord) return null;
	const isFirst = index === 0;
	const isLast = total > 1 && index === total - 1;
	const markerStyle = isFirst ? styles.startMarker : isLast ? styles.endMarker : null;
	const asset = isFirst
		? require('../../assets/markers/destination-green.png')
		: isLast
			? require('../../assets/markers/destination.png')
			: require('../../assets/markers/destination-blue.png');

	return (
		<View style={[styles.customMarker, markerStyle]}>
			<Image source={asset} style={{ width: 40, height: 40 }} />
		</View>
	);
};

export default function MiniLocator({
	requestId,
	purpose,
	initialLat,
	initialLng,
	initialPlaceName,
	mapType,
	containerStyle,
	onConfirm,
    places,
    fitPlacesToMap = true,
	controlPosition,
	mapPadding,
}: MiniLocatorProps) {
	const appState = useRef(AppState.currentState);
	const dispatch = useDispatch();
	const initialDelta = 0.05;
	const [track, setTrack] = useState(true);
	const [region, setRegion] = useState<Region | null>(null);
	const [centerCoords, setCenterCoords] = useState<{ latitude: number; longitude: number } | null>(null);
	const [placeName, setPlaceName] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [isReverseGeocodingLoading, setIsReverseGeocodingLoading] = useState(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const [isRequestingPermission, setIsRequestingPermission] = useState(true);
	const [isLocationNotEnabled, setIsLocationNotEnabled] = useState(true);
	const [mapLayout, setMapLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
	const [localPlaces, setLocalPlaces] = useState<PlaceData[]>(places ?? []);
	const [hasUserRecentered, setHasUserRecentered] = useState(false);
	const [isRecentering, setIsRecentering] = useState(false);
	const [XYPoint, setXYPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const pinScale = useRef(new Animated.Value(1)).current;
	const pinTranslate = useRef(new Animated.Value(0)).current;
	const mapRef = useRef<MapView | null>(null);
	const lastRegionRef = useRef<Region | null>(null);
	const isDraggingRef = useRef(false);
	const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hasInitialized = useRef(false);
	const initialCoord = useMemo(() => {
		if (initialLat === undefined || initialLng === undefined) return null;
		const lat = Number(initialLat);
		const lng = Number(initialLng);
		if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
		return {
			latitude: lat,
			longitude: lng,
			title: initialPlaceName || 'Initial location',
		};
	}, [initialLat, initialLng, initialPlaceName]);

	const resolvedMapPadding: EdgePadding = useMemo(
		() => ({ top: 0, right: 0, bottom: 150, left: 0, ...mapPadding }),
		[mapPadding],
	);

	useEffect(() => {
		setLocalPlaces(places ?? []);
		setHasUserRecentered(false);
	}, [places]);

	const placeCoords = useMemo(() => {
		const mapped: PlaceCoord[] = (localPlaces ?? []).map((p) => ({
			latitude: p.geometry.coordinate.latitude,
			longitude: p.geometry.coordinate.longitude,
			title: p.properties.name,
		}));
		if (!hasUserRecentered && initialCoord) {
			mapped.push(initialCoord);
		}
		return mapped;
	}, [localPlaces, initialCoord, hasUserRecentered]);

	const broadcastLocation = useCallback(
		(latitude: number, longitude: number, name: string) => {
			const payload = {
				latitude: String(latitude),
				longitude: String(longitude),
				placeName: name ?? '',
				purpose: purpose ?? '',
			};

			dispatch({
				type: 'mapPicker/setLocation',
				payload: {
					requestId: requestId,
					location: payload,
				},
			});

			onConfirm?.(payload);
		},
		[dispatch, onConfirm, purpose, requestId],
	);

	const initializeLocationFlow = useCallback(async () => {
		setIsLoading(true);
		setPermissionError(null);
		setIsRequestingPermission(true);

		const locationEnabled = await isLocationServiceEnabled();
		setIsLocationNotEnabled(!locationEnabled);

		if (!locationEnabled) {
			setPermissionError('Location services are disabled. Enable location services then press Refresh.');
			setIsRequestingPermission(false);
			setIsLoading(false);
			hasInitialized.current = true;
			return;
		}

		const parsedLat = initialLat ? Number(initialLat) : null;
		const parsedLng = initialLng ? Number(initialLng) : null;
		const saved: any = null; // placeholder for future persistence

		if (parsedLat && parsedLng) {
			const nextRegion: Region = {
				latitude: parsedLat,
				longitude: parsedLng,
				latitudeDelta: initialDelta,
				longitudeDelta: initialDelta,
			};
			setRegion(nextRegion);
			lastRegionRef.current = nextRegion;
			setCenterCoords({ latitude: parsedLat, longitude: parsedLng });
			const place = initialPlaceName ?? '';
			setPlaceName(place);
			broadcastLocation(parsedLat, parsedLng, place);

			setIsRequestingPermission(false);
			setIsLoading(false);
			hasInitialized.current = true;
			return;
		}

		if (saved) {
			const nextRegion: Region = {
				latitude: saved.latitude,
				longitude: saved.longitude,
				latitudeDelta: initialDelta,
				longitudeDelta: initialDelta,
			};
			setRegion(nextRegion);
			lastRegionRef.current = nextRegion;
			setCenterCoords({ latitude: saved.latitude, longitude: saved.longitude });
			setPlaceName(saved.placeName ?? '');
			broadcastLocation(saved.latitude, saved.longitude, saved.placeName ?? '');

			setIsRequestingPermission(false);
			setIsLoading(false);
			hasInitialized.current = true;
			return;
		}

		const location = await getCurrentLocation();
		if (location.ok) {
			const nextRegion: Region = {
				latitude: location.data.latitude,
				longitude: location.data.longitude,
				latitudeDelta: initialDelta,
				longitudeDelta: initialDelta,
			};
			setRegion(nextRegion);
			lastRegionRef.current = nextRegion;
			setCenterCoords({ latitude: location.data.latitude, longitude: location.data.longitude });
			const geocoded = await reverseGeocodeLocation(location.data.latitude, location.data.longitude);
			const place = geocoded.ok ? geocoded.data.name : '';
			setPlaceName(place);
			broadcastLocation(location.data.latitude, location.data.longitude, place);

			setIsRequestingPermission(false);
		} else {
			setPermissionError(location.error.message + '. Press button below to grant permission.' || 'Location permission is required.');
			setIsRequestingPermission(false);
		}
		setIsLoading(false);
		hasInitialized.current = true;
	}, [initialLat, initialLng, initialPlaceName, initialDelta]);

	useEffect(() => {
		initializeLocationFlow();
	}, [initializeLocationFlow]);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', async (nextAppState) => {
			if (
				appState.current.match(/inactive|background/) &&
				nextAppState === 'active'
			) {
				const locationEnabled = await isLocationServiceEnabled();
				setIsLocationNotEnabled(!locationEnabled);

				if (locationEnabled) {
					locationRefreshHandler();
				}
			}

			appState.current = nextAppState;
		});

		return () => {
			subscription.remove();
		};
	}, [initializeLocationFlow]);

	useEffect(() => {
		return () => {
			if (geoDebounceRef.current) {
				clearTimeout(geoDebounceRef.current);
				geoDebounceRef.current = null;
			}
		};
	}, []);

	const updateLocationFromCoords = async (latitude: number, longitude: number) => {
		const geocoded = await reverseGeocodeLocation(latitude, longitude);
		const place = geocoded.ok ? geocoded.data.name : '';
		setPlaceName(place);
		broadcastLocation(latitude, longitude, place);
		setIsReverseGeocodingLoading(false);
	};

	const handleRegionChangeComplete = async (nextRegion: Region) => {
		setIsReverseGeocodingLoading(true);

		if (isDraggingRef.current) {
			isDraggingRef.current = false;
			Animated.spring(pinScale, {
				toValue: 1,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}).start();
			Animated.spring(pinTranslate, {
				toValue: 0,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}).start();
		}
		if (!hasInitialized.current) {
            setIsReverseGeocodingLoading(false);
            return;
		}

		const pinAnchorOffsetPx = 8;
		let center = { latitude: nextRegion.latitude, longitude: nextRegion.longitude };
		try {
			if (mapRef.current && mapLayout.width && mapLayout.height) {
				const point = {
					x: mapLayout.width / 2,
					y: mapLayout.height / 2 + pinAnchorOffsetPx,
				};
				center = await mapRef.current.coordinateForPoint(point);
			} else {
				const camera = await mapRef.current?.getCamera();
				if (camera?.center) {
					center = camera.center;
				}
			}
		} catch (err) {
			// fallback to nextRegion center
		}

		lastRegionRef.current = nextRegion;
		setRegion(nextRegion);
		setCenterCoords(center);

		if (geoDebounceRef.current) {
			clearTimeout(geoDebounceRef.current);
		}
		geoDebounceRef.current = setTimeout(() => {
			updateLocationFromCoords(center.latitude, center.longitude).finally(() => {
				setIsReverseGeocodingLoading(false);
			});
		}, 1000);
	};

	const lastPlace = useMemo(() => {
		if (!localPlaces.length) return null;
		return localPlaces[localPlaces.length - 1];
	}, [localPlaces]);

	const handleRegionChange = async (region: Region) => {
		if (!isDraggingRef.current) {
			isDraggingRef.current = true;
			Animated.spring(pinScale, {
				toValue: 1.1,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}).start();
			Animated.spring(pinTranslate, {
				toValue: -6,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}).start();
		}

		if (geoDebounceRef.current) {
			clearTimeout(geoDebounceRef.current);
			geoDebounceRef.current = null;
		}

		if (mapRef.current && lastPlace) {
			const point = await mapRef.current.pointForCoordinate({
				latitude: initialCoord ? initialCoord.latitude : lastPlace.geometry.coordinate.latitude,
				longitude: initialCoord ? initialCoord.longitude : lastPlace.geometry.coordinate.longitude,
			});

			setXYPoint((prev) => ({ ...prev, x: point.x, y: point.y }));
		}
	};

	const zoomBy = (factor: number) => {
		const currentRegion = lastRegionRef.current || region;
		if (!currentRegion || !mapRef.current) {
			return;
		}
		const MIN_DELTA = 0.00005;
		const MAX_LAT_DELTA = 170;
		const MAX_LNG_DELTA = 360;
		const nextRegion: Region = {
			...currentRegion,
			latitude: Math.max(-85, Math.min(85, currentRegion.latitude)),
			longitude: Math.max(-180, Math.min(180, currentRegion.longitude)),
			latitudeDelta: Math.min(MAX_LAT_DELTA, Math.max(MIN_DELTA, currentRegion.latitudeDelta * factor)),
			longitudeDelta: Math.min(MAX_LNG_DELTA, Math.max(MIN_DELTA, currentRegion.longitudeDelta * factor)),
		};
		mapRef.current.animateToRegion(nextRegion, 180);
		lastRegionRef.current = nextRegion;
	};

	const recenterToUserLocation = async () => {
		setIsRecentering(true);
		const location = await getCurrentLocation();
		if (!location.ok) {
			setIsRecentering(false);
			return;
		}

		const { latitude, longitude } = location.data;
		const geocoded = await reverseGeocodeLocation(latitude, longitude);
		const name = geocoded.ok ? geocoded.data.name : 'Current location';
		const nextRegion: Region = {
			latitude,
			longitude,
			latitudeDelta: initialDelta,
			longitudeDelta: initialDelta,
		};

		const currentPlace: PlaceData = {
			properties: { name },
			geometry: { coordinate: { latitude, longitude } },
		};

		setLocalPlaces((prev) => {
			const withoutDuplicate = prev.filter(
				(p) => p.geometry.coordinate.latitude !== latitude || p.geometry.coordinate.longitude !== longitude,
			);
			return [...withoutDuplicate, currentPlace];
		});
		setHasUserRecentered(true);
		setPlaceName(name);
		setRegion(nextRegion);
		lastRegionRef.current = nextRegion;
		setCenterCoords({ latitude, longitude });
		mapRef.current?.animateToRegion(nextRegion, 250);
		broadcastLocation(latitude, longitude, name);
		setIsRecentering(false);
	};

	const handleOpenAppSettings = () => {
		if (isLocationNotEnabled) {
			openLocationSettings();
		} else {
			openAppSettings();
		}
	};

	const locationRefreshHandler = () => {
		initializeLocationFlow();
	};

	useEffect(() => {
		if (!fitPlacesToMap) return;
		if (!mapRef.current || !placeCoords.length || !mapLayout.width || !mapLayout.height) return;
		mapRef.current.fitToCoordinates(placeCoords, {
			edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
			animated: true,
		});
	}, [fitPlacesToMap, placeCoords, mapLayout.height, mapLayout.width]);

	const handleMapReady = () => {
		setTrack(true);
  		setTimeout(() => setTrack(false), 500);
	};

	const renderPermissionBlock = () => {
		return (
			<View style={styles.permissionBlock}>
				{isRequestingPermission && !permissionError ? (
					<ActivityIndicator size={'large'} />
				) : (
					<MaterialCommunityIcons name="map-marker-off" size={40} color="#6b7280" />
				)}
				<Text style={styles.permissionTitle}>
					{isRequestingPermission && !permissionError ? 'Requesting location permission…' : (isLocationNotEnabled ? 'Location services disabled' : 'Location permission needed')}
				</Text>
				<Text style={styles.permissionMessage}>
					{permissionError || (isLocationNotEnabled ? 'Please enable location services to continue.' : 'Please enable location access in Settings to select a location.')}
				</Text>
				{!isRequestingPermission && permissionError ? (
					<TouchableOpacity
						style={[styles.primaryButton, { flex: 0, paddingHorizontal: 30, borderRadius: 50 }]}
						onPress={isLocationNotEnabled ? handleOpenAppSettings : locationRefreshHandler}
					>
						<Text style={styles.primaryButtonText}>
							{isLocationNotEnabled ? 'Open Settings' : 'Refresh'}
						</Text>
					</TouchableOpacity>
				) : null}
			</View>
		);
	};

	return (
        <View style={[styles.container, containerStyle]}>
            {isRequestingPermission || permissionError || isLocationNotEnabled ? (
                renderPermissionBlock()
            ) : (
                <View style={styles.page}>
                    <View style={styles.mapCard}>
                        {isLoading || !region ? (
                            <View style={styles.mapLoading}>
                                <ActivityIndicator size="small" />
                                <Text style={styles.mutedText}>Loading map…</Text>
                            </View>
                        ) : (
                            <View style={styles.mapWrapper}>
                                <MapView
                                    ref={(ref) => { mapRef.current = ref; }}
                                    style={styles.map}
                                    initialRegion={region}
                                    mapType={mapType || 'none'}
                                    showsTraffic={false}
                                    loadingEnabled={true}
									liteMode={Platform.OS === 'android'}
                                    onLayout={(e) => setMapLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
                                    onRegionChange={handleRegionChange}
                                    onRegionChangeComplete={handleRegionChangeComplete}
									onMapReady={handleMapReady}
									mapPadding={resolvedMapPadding}
									showsPointsOfInterest={false}
                                >
									{placeCoords.map((coord, index) => (
										<Marker
											key={index}
											coordinate={{ latitude: coord.latitude, longitude: coord.longitude }}
											title={coord.title}
											tracksViewChanges={track}
											anchor={{ x: 0.5, y: 0.9 }}
											renderToHardwareTextureAndroid={true}
										>
											<View style={{ width: 40, height: 40, position: 'relative', top: Platform.OS === 'ios' ? -12 : 0, alignItems: 'center', justifyContent: 'center' }}>
												{customMarker(coord, index, placeCoords.length)}
											</View>
											<Callout tooltip>
												<View style={{ width: 120, height: 120 }}>
													<Text>{coord.title}</Text>
												</View>
											</Callout>
										</Marker>
									))}

									{placeCoords.length >= 2 ? (
										<Polyline
											coordinates={placeCoords.map(({ latitude, longitude }) => ({ latitude, longitude }))}
											strokeColor="#1382fe"
											strokeWidth={2}
										/>
									) : null}
                                </MapView>

								{localPlaces.length <= 0 && !initialCoord && (
                                    <View style={styles.centerMarker} pointerEvents="none">
                                        <Animated.View style={{ transform: [{ scale: pinScale }, { translateY: pinTranslate }] }}>
                                            <View style={{ width: 40, height: 64 }}>
                                                <MapMarker width={40} height={64} />
                                            </View>
                                        </Animated.View>
                                        <View style={styles.centerGlow}>
                                            <AnimatedOval />
                                        </View>
                                    </View>
                                )}
                                <View style={[styles.zoomControls, controlPosition]}>
                                    <TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(0.5)}>
                                        <MaterialCommunityIcons name="plus" size={26} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(2)}>
                                        <MaterialCommunityIcons name="minus" size={26} />
                                    </TouchableOpacity>
									<TouchableOpacity style={styles.zoomButton} onPress={recenterToUserLocation} disabled={isRecentering}>
										{isRecentering ? <ActivityIndicator size="small" /> : <MaterialCommunityIcons name="crosshairs-gps" size={22} />}
									</TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	page: {
		flex: 1,
	},
	mapCard: {
		overflow: 'hidden',
		backgroundColor: '#f8fafc',
		flex: 1,
        width: '100%',
		height: '100%',
	},
	mapWrapper: {
		width: '100%',
		height: '100%',
	},
	map: {
		width: '100%',
		height: '100%',
	},
	centerMarker: {
		position: 'absolute',
		left: '50%',
		top: '50%',
		transform: [
			{ translateX: -20 },
			{ translateY: -64 },
		],
	},
	centerGlow: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 12,
		alignItems: 'center',
		height: 100,
	},
	zoomControls: {
		position: 'absolute',
		right: 16,
		top: 10,
		gap: 6,
	},
	zoomButton: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 4,
		elevation: 4,
	},
	mapLoading: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	mutedText: {
		opacity: 0.7,
		fontSize: 12,
	},
	permissionBlock: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 36,
	},
	permissionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	permissionMessage: {
		textAlign: 'center',
		color: '#4b5563',
		lineHeight: 20,
	},
    primaryButton: {
        flex: 1,
        backgroundColor: '#111',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: '#999',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
	customMarker: {
		width: 40,
		height: 40,
		backgroundColor: 'transparent',
		borderRadius: 20,
		borderWidth: 0,
		borderColor: 'crimson',
		alignItems: 'center',
		justifyContent: 'center',
	},
	startMarker: {
		backgroundColor: 'transparent',
	},
	endMarker: {
		backgroundColor: 'transparent',
	},
});
