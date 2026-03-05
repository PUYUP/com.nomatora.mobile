import HeaderBackButton from '@/components/partials/header-back-button';
import AnimatedOval from '@/components/ui/animated-oval';
import MapMarker from '@/components/ui/mappin';
import {
	getCurrentLocation,
	isLocationServiceEnabled,
	openAppSettings,
	openLocationSettings,
	reverseGeocodeLocation,
} from '@/libs/location';
import { supabase } from '@/libs/supabase';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Mapbox, {
	Camera,
	MapView as MapboxMapView,
	MapState,
} from '@rnmapbox/maps';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import debounce from 'lodash.debounce';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	AppState,
	FlatList,
	Keyboard,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
Mapbox.setTelemetryEnabled(false);

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 2;
const MAX_ZOOM = 20;
const GEO_DEBOUNCE_MS = 1000;
const SEARCH_DEBOUNCE_MS = 500;

// ─── Utilities ────────────────────────────────────────────────────────────────

function resolvePurposeLabel(purpose: string | undefined): string {
	if (!purpose) return 'Location';
	const fixed: Record<string, string> = {
		origin: 'Origin',
		destination: 'Destination',
		meetup: 'Location',
		expense: 'Location',
		connectivity: 'Location',
		story: 'Location',
		'next-location': 'Location',
	};
	return fixed[purpose] ?? `${purpose.charAt(0).toUpperCase()}${purpose.slice(1)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LatLng = { latitude: number; longitude: number };

type PlaceResult = {
	place_id?: string;
	name: string;
	formatted_address: string;
	geometry: {
		location: {
			lat: number;
			lng: number;
		};
	};
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocationSelectorMap() {
	const appState = useRef(AppState.currentState);
	const dispatch = useDispatch();
	const router = useRouter();
	const { returnTo, initialLat, initialLng, initialPlaceName, purpose, requestId } =
		useLocalSearchParams<{
			returnTo?: string;
			initialLat?: string;
			initialLng?: string;
			initialPlaceName?: string;
			purpose?: string;
			requestId?: string;
		}>();

	// ─── Map state ───────────────────────────────────────────────────────────
	const [centerCoords, setCenterCoords] = useState<LatLng | null>(null);
	const [cameraCenter, setCameraCenter] = useState<LatLng | null>(null);
	const [cameraZoom, setCameraZoom] = useState(DEFAULT_ZOOM);
	const [placeName, setPlaceName] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isReverseGeocodingLoading, setIsReverseGeocodingLoading] = useState(false);

	// ─── Permission state ─────────────────────────────────────────────────────
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const [isRequestingPermission, setIsRequestingPermission] = useState(true);
	const [isLocationNotEnabled, setIsLocationNotEnabled] = useState(true);

	// ─── Search state ─────────────────────────────────────────────────────────
	const [searchPlace, setSearchPlace] = useState('');
	const [placesResults, setPlacesResults] = useState<PlaceResult[]>([]);
	const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

	// ─── Refs ─────────────────────────────────────────────────────────────────
	const pinScale = useRef(new Animated.Value(1)).current;
	const pinTranslate = useRef(new Animated.Value(0)).current;
	const cameraRef = useRef<Mapbox.Camera | null>(null);
	const lastCameraRef = useRef<{ center: LatLng; zoom: number } | null>(null);
	const isDraggingRef = useRef(false);
	const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hasInitialized = useRef(false);
	const isMounted = useRef(true);

	const purposeLabel = resolvePurposeLabel(purpose);

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
			if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
			handleSearch.cancel();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ─── Pin animation ────────────────────────────────────────────────────────

	const animatePin = useCallback((dragging: boolean) => {
		const config = { useNativeDriver: true, speed: 20, bounciness: 6 };
		Animated.spring(pinScale, { toValue: dragging ? 1.1 : 1, ...config }).start();
		Animated.spring(pinTranslate, { toValue: dragging ? -6 : 0, ...config }).start();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps — Animated.Values are stable refs

	// ─── Camera helper ────────────────────────────────────────────────────────

	/**
	 * Moves the Mapbox camera imperatively and keeps lastCameraRef in sync.
	 * Unlike react-native-maps' animateToRegion, Mapbox uses setCamera().
	 */
	const applyCamera = useCallback(
		(center: LatLng, zoom = DEFAULT_ZOOM, animationDuration = 0) => {
			setCameraCenter(center);
			setCameraZoom(zoom);
			lastCameraRef.current = { center, zoom };
			if (animationDuration > 0) {
				cameraRef.current?.setCamera({
					centerCoordinate: [center.longitude, center.latitude],
					zoomLevel: zoom,
					animationDuration,
				});
			}
		},
		[],
	);

	// ─── Location flow ────────────────────────────────────────────────────────

	const initializeLocationFlow = useCallback(async () => {
		setIsLoading(true);
		setPermissionError(null);
		setIsRequestingPermission(true);

		const locationEnabled = await isLocationServiceEnabled();
		if (!isMounted.current) return;

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

		if (parsedLat && parsedLng) {
			applyCamera({ latitude: parsedLat, longitude: parsedLng });
			setCenterCoords({ latitude: parsedLat, longitude: parsedLng });
			setPlaceName(initialPlaceName ?? '');
			setIsRequestingPermission(false);
			setIsLoading(false);
			hasInitialized.current = true;
			return;
		}

		const location = await getCurrentLocation();
		if (!isMounted.current) return;

		if (location.ok) {
			const { latitude, longitude } = location.data;
			applyCamera({ latitude, longitude });
			setCenterCoords({ latitude, longitude });

			const geocoded = await reverseGeocodeLocation(latitude, longitude);
			if (!isMounted.current) return;
			setPlaceName(geocoded.ok ? geocoded.data.name : '');
			setIsRequestingPermission(false);
		} else {
			const msg = location.error?.message ?? 'Location permission is required.';
			setPermissionError(`${msg} Press button below to grant permission.`);
			setIsRequestingPermission(false);
		}

		setIsLoading(false);
		hasInitialized.current = true;
	}, [initialLat, initialLng, initialPlaceName, applyCamera]);

	useEffect(() => {
		initializeLocationFlow();
	}, [initializeLocationFlow]);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', async (nextAppState) => {
			if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
				const locationEnabled = await isLocationServiceEnabled();
				if (!isMounted.current) return;
				setIsLocationNotEnabled(!locationEnabled);
				if (locationEnabled) initializeLocationFlow();
			}
			appState.current = nextAppState;
		});
		return () => subscription.remove();
	}, [initializeLocationFlow]);

	// ─── Geo helpers ──────────────────────────────────────────────────────────

	const updateLocationFromCoords = useCallback(async (latitude: number, longitude: number) => {
		const geocoded = await reverseGeocodeLocation(latitude, longitude);
		if (!isMounted.current) return;
		setPlaceName(geocoded.ok ? geocoded.data.name : '');
		setIsReverseGeocodingLoading(false);
		setCenterCoords({ latitude, longitude });
	}, []);

	/**
	 * Mapbox equivalent of react-native-maps onRegionChange.
	 * onCameraChanged fires continuously while the user drags.
	 */
	const handleCameraChanged = useCallback(() => {
		if (!isDraggingRef.current) {
			isDraggingRef.current = true;
			animatePin(true);
		}

		// Cancel stale geo request while still dragging
		if (geoDebounceRef.current) {
			clearTimeout(geoDebounceRef.current);
			geoDebounceRef.current = null;
		}
	}, [animatePin]);

	/**
	 * Mapbox equivalent of react-native-maps onRegionChangeComplete.
	 * onMapIdle fires once the camera settles.
	 *
	 * Key difference from react-native-maps:
	 *   - The feature payload carries the final center as GeoJSON Point coordinates
	 *   - feature.properties.isUserInteraction distinguishes user drag vs programmatic move,
	 *     but we use isDraggingRef (set in onCameraChanged) as the primary guard
	 *     because isUserInteraction can be false during inertia scroll (see earlier discussion).
	 */
	const handleMapIdle = useCallback(
		async (state: MapState) => {
			if (isDraggingRef.current) {
				isDraggingRef.current = false;
				animatePin(false);
			}

			// Default location has already been set on mount — ignore the first region change event to avoid redundant reverse geocoding
			if (hasInitialized.current) {
				hasInitialized.current = false;
				return;
			}

			setIsReverseGeocodingLoading(true);

			// Extract center from the GeoJSON feature — [longitude, latitude]
			const [longitude, latitude] = state.properties.center;
	
			if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
			geoDebounceRef.current = setTimeout(() => {
				updateLocationFromCoords(latitude, longitude);
			}, GEO_DEBOUNCE_MS);
		},
		[animatePin, updateLocationFromCoords],
	);

	// ─── Zoom ─────────────────────────────────────────────────────────────────

	/**
	 * Mapbox zoom: operates on zoom level (integer scale), not lat/lng delta.
	 * Factor < 1 zooms in (same convention kept from react-native-maps version).
	 */
	const zoomBy = useCallback((factor: number) => {
		const current = lastCameraRef.current;
		if (!current) return;
		const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom - Math.log2(factor)));
		cameraRef.current?.setCamera({ zoomLevel: nextZoom, animationDuration: 180 });
		lastCameraRef.current = { ...current, zoom: nextZoom };
	}, []);

	// ─── Confirm ─────────────────────────────────────────────────────────────

	const handleConfirm = useCallback(() => {
		if (!centerCoords || isReverseGeocodingLoading) return;
		const payload = {
			latitude: String(centerCoords.latitude),
			longitude: String(centerCoords.longitude),
			placeName: placeName ?? '',
			purpose: purpose ?? '',
		};
		dispatch({ type: 'mapPicker/setLocation', payload: { requestId, location: payload } });
		if (returnTo) {
			router.replace({ pathname: returnTo as any, params: payload });
			return;
		}
		router.back();
	}, [centerCoords, isReverseGeocodingLoading, placeName, purpose, requestId, returnTo, dispatch, router]);

	// ─── Permission / settings ────────────────────────────────────────────────

	const handleOpenAppSettings = useCallback(() => {
		if (isLocationNotEnabled) openLocationSettings();
		else openAppSettings();
	}, [isLocationNotEnabled]);

	// ─── Place search ─────────────────────────────────────────────────────────

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const handleSearch = useMemo(
		() =>
			debounce(async (query: string, latlng: string) => {
				try {
					const { data, error } = await supabase.functions.invoke('gmaps-places-search', {
						body: { query, latlng },
					});
					if (!isMounted.current) return;
					setPlacesResults(error ? [] : (data ?? []));
				} finally {
					if (isMounted.current) setIsSearchingPlaces(false);
				}
			}, SEARCH_DEBOUNCE_MS),
		[],
	);

	const placeSearchHandler = useCallback((query: string) => {
		setSearchPlace(query);
		if (!query.trim()) {
			setPlacesResults([]);
			setIsSearchingPlaces(false);
			return;
		}
		setIsSearchingPlaces(true);
		const latlng = `${centerCoords?.latitude ?? ''},${centerCoords?.longitude ?? ''}`;
		handleSearch(query, latlng);
	}, [centerCoords, handleSearch]);

	const selectPlaceHandler = useCallback((place: PlaceResult) => {
		if (!place?.geometry?.location) return;
		const { lat, lng } = place.geometry.location;
		
		setSearchPlace('');
		setPlacesResults([]);
		Keyboard.dismiss();

		const coords: LatLng = { latitude: lat, longitude: lng };
		applyCamera(coords, DEFAULT_ZOOM, 220);
		setCenterCoords(coords);
	}, [applyCamera]);

	const clearSearchHandler = useCallback(() => {
		setSearchPlace('');
		setPlacesResults([]);
		setIsSearchingPlaces(false);
	}, []);

	const renderPlaceItem = useCallback(({ item }: { item: PlaceResult }) => (
		<TouchableOpacity onPress={() => selectPlaceHandler(item)}>
			<View style={styles.placeResultRow}>
				<Text style={styles.placeResultName}>{item.name}</Text>
				<Text style={styles.placeResultAddress}>{item.formatted_address}</Text>
			</View>
		</TouchableOpacity>
	), [selectPlaceHandler]);

	const placeKeyExtractor = useCallback(
		(item: PlaceResult, index: number) => item.place_id ?? String(index),
		[],
	);

	const showPermissionBlock = isRequestingPermission || !!permissionError || isLocationNotEnabled;

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<SafeAreaView style={styles.safeArea} edges={['bottom']}>
			<Stack.Screen
				options={{
					headerTitle: `Select ${purposeLabel}`,
					headerTitleStyle: {
						fontSize: 20,
						fontFamily: 'ZalandoSansExpanded_900Black',
						color: '#2f4f4f',
					},
					headerLeft: (props) => <HeaderBackButton {...props} />,
				}}
			/>

			{showPermissionBlock ? (
				<PermissionBlock
					isRequesting={isRequestingPermission}
					isLocationNotEnabled={isLocationNotEnabled}
					permissionError={permissionError}
					onOpenSettings={handleOpenAppSettings}
					onRefresh={initializeLocationFlow}
				/>
			) : (
				<View style={styles.page}>
					{/* Search bar */}
					<View style={styles.searchBar}>
						<TextInput
							placeholder="Search places..."
							value={searchPlace}
							onChangeText={placeSearchHandler}
							style={styles.placeSearchInput}
						/>
						{searchPlace.length > 0 && (
							<TouchableOpacity
								onPress={clearSearchHandler}
								style={styles.clearButton}
								accessibilityLabel="Clear search"
							>
								<MaterialCommunityIcons name="close" size={22} />
							</TouchableOpacity>
						)}
						{isSearchingPlaces && (
							<ActivityIndicator size="small" style={styles.searchSpinner} />
						)}
					</View>

					{placesResults.length > 0 && (
						<View style={styles.resultDialog}>
							<FlatList
								data={placesResults}
								keyExtractor={placeKeyExtractor}
								style={styles.placesList}
								renderItem={renderPlaceItem}
								keyboardShouldPersistTaps="handled"
							/>
						</View>
					)}

					{/* Map */}
					<View style={styles.mapCard}>
						{isLoading || !cameraCenter ? (
							<View style={styles.mapLoading}>
								<ActivityIndicator size="small" />
								<Text style={styles.mutedText}>Loading map…</Text>
							</View>
						) : (
							<View style={styles.mapWrapper}>
								<View style={styles.mapHint}>
									<Text style={styles.hintText}>Drag the map to place the pin.</Text>
								</View>

								{/*
									* MapboxMapView is always mounted (never conditionally unmounted)
									* to avoid "Could not find view with tag" native errors.
									* The loading overlay above gates visibility instead.
									*
									* Key API differences from react-native-maps:
									*   - No `initialRegion` prop — Camera component handles initial position
									*   - onRegionChange      → onCameraChanged
									*   - onRegionChangeComplete → onMapIdle
									*   - mapRef.animateToRegion() → cameraRef.setCamera()
									*   - No latitudeDelta/longitudeDelta — Mapbox uses zoom level
									*/}
								<MapboxMapView
									onPress={() => Keyboard.dismiss()} 
									style={styles.map}
									styleURL={Mapbox.StyleURL.Street}
									logoEnabled={false}
									attributionEnabled={false}
									scaleBarEnabled={false}
									regionWillChangeDebounceTime={0}
									onCameraChanged={handleCameraChanged}
									onMapIdle={handleMapIdle}
									rotateEnabled
									pitchEnabled
									scrollEnabled
									zoomEnabled
								>
									<Camera
										ref={cameraRef}
										centerCoordinate={[cameraCenter.longitude, cameraCenter.latitude]}
										zoomLevel={cameraZoom}
										animationDuration={0}
									/>
								</MapboxMapView>

								{/* Center pin — positioned absolutely over map center */}
								<View style={styles.centerMarker} pointerEvents="none">
									<Animated.View
										style={{ transform: [{ scale: pinScale }, { translateY: pinTranslate }] }}
									>
										<View style={{ width: 40, height: 64 }}>
											<MapMarker width={40} height={64} />
										</View>
									</Animated.View>
									<View style={styles.centerGlow}>
										<AnimatedOval />
									</View>
								</View>

								<View style={styles.zoomControls}>
									<TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(0.5)}>
										<MaterialCommunityIcons name="plus" size={26} />
									</TouchableOpacity>
									<TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(2)}>
										<MaterialCommunityIcons name="minus" size={26} />
									</TouchableOpacity>
								</View>
							</View>
						)}
					</View>

					{/* Meta info */}
					<View style={styles.metaBlock}>
						<View style={[styles.metaRow, styles.metaRowPadded]}>
							<MaterialCommunityIcons name="map-marker-radius-outline" size={26} color="#6b7280" />
							<Text style={styles.metaText} numberOfLines={2}>
								{placeName || '-'}
							</Text>
						</View>
						<View style={styles.metaRow}>
							<MaterialCommunityIcons name="crosshairs-gps" size={26} color="#6b7280" />
							<View style={styles.coordsRow}>
								<Text style={styles.coordsText}>{centerCoords?.latitude}</Text>
								<Text style={styles.coordsTextComma}>,</Text>
								<Text style={styles.coordsText}>{centerCoords?.longitude}</Text>
							</View>
						</View>
					</View>

					{/* Actions */}
					<View style={styles.actionsRow}>
						<View style={{ flex: 1, width: '50%' }}>
							<TouchableOpacity style={styles.secondaryButton} onPress={router.back}>
								<Text style={styles.secondaryButtonText}>Cancel</Text>
							</TouchableOpacity>
						</View>

						<View style={{ flex: 1, width: '50%' }}>
							<TouchableOpacity
								style={[
									styles.primaryButton,
									(!centerCoords || isReverseGeocodingLoading) && styles.primaryButtonDisabled,
								]}
								onPress={handleConfirm}
								disabled={!centerCoords || isReverseGeocodingLoading}
							>
								{!centerCoords || isReverseGeocodingLoading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.primaryButtonText}>Confirm</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}
		</SafeAreaView>
	);
}

// ─── PermissionBlock ──────────────────────────────────────────────────────────

function PermissionBlock({
	isRequesting,
	isLocationNotEnabled,
	permissionError,
	onOpenSettings,
	onRefresh,
}: {
	isRequesting: boolean;
	isLocationNotEnabled: boolean;
	permissionError: string | null;
	onOpenSettings: () => void;
	onRefresh: () => void;
}) {
	const title = isRequesting && !permissionError
		? 'Requesting location permission…'
		: isLocationNotEnabled
			? 'Location services disabled'
			: 'Location permission needed';

	const message = permissionError
		?? (isLocationNotEnabled
			? 'Please enable location services to continue.'
			: 'Please enable location access in Settings to select a location.');

	return (
		<View style={styles.permissionBlock}>
			{isRequesting && !permissionError ? (
				<ActivityIndicator size="large" />
			) : (
				<MaterialCommunityIcons name="map-marker-off" size={40} color="#6b7280" />
			)}
			<Text style={styles.permissionTitle}>{title}</Text>
			<Text style={styles.permissionMessage}>{message}</Text>
			{!isRequesting && !!permissionError && (
				<TouchableOpacity
					style={styles.permissionButton}
					onPress={isLocationNotEnabled ? onOpenSettings : onRefresh}
				>
					<Text style={styles.primaryButtonText}>
						{isLocationNotEnabled ? 'Open Settings' : 'Refresh'}
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
	},
	page: {
		flex: 1,
	},
	searchBar: {
		zIndex: 10,
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	mapCard: {
		overflow: 'hidden',
		backgroundColor: '#f8fafc',
		flex: 1,
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
		transform: [{ translateX: -20 }, { translateY: -64 }],
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
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: 'center',
		justifyContent: 'center',
		boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)',
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
	mapHint: {
		position: 'absolute',
		left: 16,
		top: 10,
		zIndex: 2,
		backgroundColor: '#fff',
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 6,
		boxShadow: '0px 2px 8px 0px rgba(0, 0, 0, 0.08)',
	},
	hintText: {
		fontSize: 12,
		opacity: 0.7,
	},
	metaRow: {
		alignItems: 'center',
		gap: 6,
		marginTop: 4,
		flexDirection: 'row',
	},
	metaRowPadded: {
		paddingRight: 16,
	},
	metaBlock: {
		gap: 4,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	metaText: {
		fontSize: 13,
		maxWidth: '90%',
	},
	coordsRow: {
		flexDirection: 'row',
	},
	coordsText: {
		fontSize: 13,
		opacity: 0.7,
	},
	coordsTextComma: {
		fontSize: 13,
		opacity: 0.7,
		marginHorizontal: 3,
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 12,
		paddingHorizontal: 16,
		paddingBottom: 4,
	},
	primaryButton: {
		backgroundColor: '#ffd700',
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 50,
		alignItems: 'center',
	},
	primaryButtonDisabled: {
		backgroundColor: '#999',
	},
	primaryButtonText: {
		color: '#111',
		fontSize: 16,
		fontWeight: '600',
	},
	secondaryButton: {
		backgroundColor: '#f3f4f6',
		paddingVertical: 14,
		borderRadius: 50,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	secondaryButtonText: {
		fontSize: 16,
		color: '#111827',
		fontWeight: '600',
	},
	permissionBlock: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 36,
		paddingBottom: 100,
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
	permissionButton: {
		paddingHorizontal: 30,
		paddingVertical: 14,
		borderRadius: 50,
		backgroundColor: '#111',
		alignItems: 'center',
	},
	placeSearchInput: {
		flex: 1,
		height: 48,
		borderColor: '#e5e7eb',
		borderBottomWidth: 1,
		paddingHorizontal: 16,
		backgroundColor: '#fff',
		fontSize: 15,
	},
	placesList: {
		maxHeight: 300,
	},
	clearButton: {
		position: 'absolute',
		right: 12,
		top: 8,
		zIndex: 10,
		padding: 4,
	},
	searchSpinner: {
		position: 'absolute',
		right: 48,
		top: 12,
	},
	placeResultRow: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	placeResultName: {
		fontWeight: '700',
		marginBottom: 2,
		color: '#111827',
	},
	placeResultAddress: {
		color: '#4b5563',
	},
	resultDialog: {
		position: 'absolute',
		top: 54,
		zIndex: 15,
		left: 16,
		right: 16,
		maxHeight: 300,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderRadius: 10,
		boxShadow: '0px 2px 8px 0px rgba(0, 0, 0, 0.08)',
	},
});