import AnimatedOval from '@/components/ui/animated-oval';
import MapMarker from '@/components/ui/mappin';
import {
	getCurrentLocation,
	isLocationServiceEnabled,
	openLocationSettings,
	reverseGeocodeLocation
} from '@/libs/location';
import { PlaceData } from '@/models/location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Mapbox, { Camera, LineLayer, MapView as MapboxMapView, MarkerView, ShapeSource } from '@rnmapbox/maps';
import type { Feature, Point } from 'geojson';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	AppState,
	Image,
	Platform,
	StyleProp,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewStyle
} from 'react-native';
import { Float } from 'react-native/Libraries/Types/CodegenTypes';
import { useDispatch } from 'react-redux';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
Mapbox.setTelemetryEnabled(false);

// ─── Types ────────────────────────────────────────────────────────────────────

type MapPadding = { top?: number; right?: number; bottom?: number; left?: number };

type ConfirmPayload = { latitude: string; longitude: string; placeName: string; purpose?: string };

type ComponentProps = {
	requestId: string;
	purpose?: string;
	initialLat?: string | number;
	initialLng?: string | number;
	initialPlaceName?: string;
	mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'none';
	containerStyle?: StyleProp<ViewStyle>;
	onConfirm?: (payload: ConfirmPayload) => void;
	places?: PlaceData[];
	fitPlacesToMap?: boolean;
	controlPosition?: { top?: number; right?: number; bottom?: number; left?: number };
	mapPadding?: MapPadding;
	isSelecting?: boolean;
};

type PlaceCoord = { latitude: number; longitude: number; title: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 2;
const MAX_ZOOM = 20;
const EARTH_RADIUS_KM = 6371;

const MAPBOX_STYLE_URL: Record<NonNullable<ComponentProps['mapType']>, string> = {
	standard: Mapbox.StyleURL.Street,
	satellite: Mapbox.StyleURL.Satellite,
	hybrid: Mapbox.StyleURL.SatelliteStreet,
	terrain: Mapbox.StyleURL.Outdoors,
	none: Mapbox.StyleURL.Street,
};

const DEFAULT_MAP_PADDING: Required<MapPadding> = { top: 0, right: 0, bottom: 150, left: 0 };

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Marker image rendered inside a MarkerView.
 * Green = first stop, red = last stop, blue = intermediate.
 */
export const CustomMarker = ({
	coord,
	index,
	total,
	onChangeLocation,
	isDragMarkerVisible,
}: {
	coord: PlaceCoord;
	index: number;
	total: number;
	onChangeLocation: (coord: PlaceCoord) => void;
	isDragMarkerVisible: boolean;
}) => {
	if (!coord) return null;
	const isFirst = index === 0;
	const isLast = total > 1 && index === total - 1;
	const asset = isFirst
		? require('../../assets/markers/destination-green.png')
		: isLast
			? require('../../assets/markers/destination.png')
			: require('../../assets/markers/destination-blue.png');
	const markerStyle = isFirst ? styles.startMarker : isLast ? styles.endMarker : null;

	const hereNowTranslate = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!isLast) return;
		Animated.loop(
			Animated.sequence([
				Animated.timing(hereNowTranslate, { toValue: -6, duration: 1000, useNativeDriver: true }),
				Animated.timing(hereNowTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
			]),
		).start();
	}, [hereNowTranslate, isLast, isDragMarkerVisible]);

	return (
		<View style={[styles.customMarker, markerStyle, isLast && styles.lastMarker]} >
			{!(isLast && isDragMarkerVisible) && <Image source={asset} style={{ width: 40, height: 40 }} />}
			{isLast && !isDragMarkerVisible && (
				<View style={styles.hereNowGroup} >
					<Animated.View style={{ transform: [{ translateY: hereNowTranslate }] }}>
						<View style={styles.hereNowBadge}>
							<TouchableOpacity onPress={() => onChangeLocation(coord)}>
								<View style={styles.changeLocationButton}>
									<Text style={{ textTransform: 'uppercase', fontSize: 12, textAlign: 'center' }}>Change</Text>
								</View>
							</TouchableOpacity>
						</View>
						<View style={styles.hereNowArrowWrapper}> 
							<View style={styles.hereNowArrow} />
						</View>
					</Animated.View>
				</View>
			)}
		</View>
	);
};

type PermissionBlockProps = {
	isRequestingPermission: boolean;
	permissionError: string | null;
	isLocationNotEnabled: boolean;
	onPrimaryAction: () => void;
};

const PermissionBlock = ({
	isRequestingPermission,
	permissionError,
	isLocationNotEnabled,
	onPrimaryAction,
}: PermissionBlockProps) => {
	const isPending = isRequestingPermission && !permissionError;
	const title = isPending
		? 'Requesting location permission…'
		: isLocationNotEnabled
			? 'Location services disabled'
			: 'Location permission needed';
	const message =
		permissionError ??
		(isLocationNotEnabled
			? 'Please enable location services to continue.'
			: 'Please enable location access in Settings to select a location.');
	const buttonLabel = isLocationNotEnabled ? 'Open Settings' : 'Refresh';

	return (
		<View style={styles.permissionBlock}>
			{isPending ? (
				<ActivityIndicator size="large" />
			) : (
				<MaterialCommunityIcons name="map-marker-off" size={40} color="#6b7280" />
			)}
			<Text style={styles.permissionTitle}>{title}</Text>
			<Text style={styles.permissionMessage}>{message}</Text>
			{!isRequestingPermission && permissionError ? (
				<TouchableOpacity
					style={[styles.primaryButton, { flex: 0, paddingHorizontal: 30, borderRadius: 50 }]}
					onPress={onPrimaryAction}
				>
					<Text style={styles.primaryButtonText}>{buttonLabel}</Text>
				</TouchableOpacity>
			) : null}
		</View>
	);
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function LocatorMapbox({
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
	isSelecting = false,
}: ComponentProps) {
	const dispatch = useDispatch();

	// ─── Props modifiers / derived values ─────────────────────────────────────
	const [onSelecting, setOnSelecting] = useState<boolean>(isSelecting);

	// ─── Lifecycle refs ───────────────────────────────────────────────────────
	const isMounted = useRef(true);
	const appState = useRef(AppState.currentState);
	const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
			if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
			setOnSelecting((prev) => !prev);
			setIsDragMarkerVisible(false);
		};
	}, []);

	// ─── Map refs ─────────────────────────────────────────────────────────────
	const mapRef = useRef<Mapbox.MapView | null>(null);
	const cameraRef = useRef<Mapbox.Camera | null>(null);
	/** Tracks last known camera state to avoid reading stale React state in sync callbacks. */
	const lastCameraRef = useRef<{ center: { latitude: number; longitude: number }; zoom: number } | null>(null);
	/** Marks that the next region change is caused by our own camera move. */
	const isProgrammaticMoveRef = useRef(false);
	/** Timestamp until which we ignore region change callbacks after a programmatic move. */
	const ignoreRegionEventsUntilRef = useRef(0);

	// ─── Pin animation refs ───────────────────────────────────────────────────
	const pinScale = useRef(new Animated.Value(1)).current;
	const pinTranslate = useRef(new Animated.Value(0)).current;
	const isDraggingRef = useRef(false);

	// ─── State ────────────────────────────────────────────────────────────────
	// NOTE: cameraCenter is the single source of truth for camera position.
	// The old code had a duplicate `centerCoords` state that was always set to the
	// same value — removed in favour of reading lastCameraRef.current?.center instead.
	const [cameraCenter, setCameraCenter] = useState<{ latitude: number; longitude: number } | null>(null);
	const [cameraZoom, setCameraZoom] = useState<number>(DEFAULT_ZOOM);
	const [isLoading, setIsLoading] = useState(false);
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const [isRequestingPermission, setIsRequestingPermission] = useState(true);
	const [isLocationNotEnabled, setIsLocationNotEnabled] = useState(true);
	const [mapLayout, setMapLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
	const [localPlaces, setLocalPlaces] = useState<PlaceData[]>(places ?? []);
	const [hasUserRecentered, setHasUserRecentered] = useState(false);
	const [isRecentering, setIsRecentering] = useState(false);
	const [isDragMarkerVisible, setIsDragMarkerVisible] = useState(false);
	const [isStarting, setIsStarting] = useState(false);

	// ─── Derived / memoized values ────────────────────────────────────────────

	const initialCoord = useMemo<PlaceCoord | null>(() => {
		if (initialLat === undefined || initialLng === undefined) return null;
		const lat = Number(initialLat);
		const lng = Number(initialLng);
		if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
		return { latitude: lat, longitude: lng, title: initialPlaceName || 'Initial location' };
	}, [initialLat, initialLng, initialPlaceName]);

	/** Merged padding resolved into the Mapbox Camera shape in one step. */
	const mapboxPadding = useMemo(
		() => ({
			paddingTop: mapPadding?.top ?? DEFAULT_MAP_PADDING.top,
			paddingRight: mapPadding?.right ?? DEFAULT_MAP_PADDING.right,
			paddingBottom: mapPadding?.bottom ?? DEFAULT_MAP_PADDING.bottom,
			paddingLeft: mapPadding?.left ?? DEFAULT_MAP_PADDING.left,
		}),
		[mapPadding],
	);

	const mapStyleUrl = useMemo(
		() => (mapType ? MAPBOX_STYLE_URL[mapType] : MAPBOX_STYLE_URL.standard),
		[mapType],
	);

	const placeCoords = useMemo<PlaceCoord[]>(() => {
		const mapped = (localPlaces ?? []).map<PlaceCoord>((p) => ({
			latitude: p.geometry.coordinate.latitude,
			longitude: p.geometry.coordinate.longitude,
			title: p.properties.name,
		}));

		// Append the initial coord as a visual pin unless the user has manually recentered.
		if (!hasUserRecentered && initialCoord) mapped.push(initialCoord);
		return mapped;
	}, [localPlaces, initialCoord, hasUserRecentered]);

	// ─── Helpers ──────────────────────────────────────────────────────────────

	/** Apply camera center + zoom in one call and keep lastCameraRef in sync. */
	const applyCamera = useCallback(
		(center: { latitude: number; longitude: number }, zoom = DEFAULT_ZOOM, animationDuration = 0) => {
			setCameraCenter(center);
			setCameraZoom(zoom);
			lastCameraRef.current = { center, zoom };
			if (animationDuration > 0) {
				isProgrammaticMoveRef.current = true;
				ignoreRegionEventsUntilRef.current = Date.now() + animationDuration + 200;
				cameraRef.current?.setCamera({
					centerCoordinate: [center.longitude, center.latitude],
					zoomLevel: zoom,
					animationDuration,
				});
			}
		},
		[],
	);

	const broadcastLocation = useCallback(
		(latitude: number, longitude: number, placeName: string) => {
			const payload: ConfirmPayload = {
				latitude: String(latitude),
				longitude: String(longitude),
				placeName: placeName ?? '',
				purpose: purpose ?? '',
			};
			dispatch({ type: 'mapPicker/setLocation', payload: { requestId, location: payload } });
			onConfirm?.(payload);
		},
		[dispatch, onConfirm, purpose, requestId],
	);

	/** Handler for when user taps "change" on the "Here Now" badge. */
	const handleChangeLocation = ((coord: PlaceCoord) => {
		setIsStarting(true);
		setOnSelecting(true);
		setIsDragMarkerVisible(false); // Hide the "Selected location" marker when user taps "change".
	});

	/** Animate the selection pin on drag start / end. */
	const animatePin = useCallback(
		(dragging: boolean) => {
			Animated.spring(pinScale, {
				toValue: dragging ? 1.1 : 1,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}).start();
			Animated.spring(pinTranslate, {
				toValue: dragging ? -6 : 0,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}).start();
		},
		[pinScale, pinTranslate],
	);

	/**
	 * Calculates the distance (radius) in kilometers between two geographic coordinates
	 * using the Haversine formula.
	 */
	const toRadians = (degrees: number): number => {
		return degrees * (Math.PI / 180);
	}

	/** 
	 * Calculates the distance (radius) in kilometers between two geographic coordinates using the Haversine formula. 
	 * 
	 * @param lat1 - Latitude of the first coordinate.
	 * @param lon1 - Longitude of the first coordinate.
	 * @param lat2 - Latitude of the second coordinate.
	 * @param lon2 - Longitude of the second coordinate.
	 * @returns The distance in meters between the two coordinates.
	 */
	const calculateDistance = (
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number
	): number => {
		const dLat = toRadians(lat2 - lat1);
		const dLon = toRadians(lon2 - lon1);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRadians(lat1)) *
			Math.cos(toRadians(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return EARTH_RADIUS_KM * c * 1000; // Convert kilometers to meters
	}

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
			return;
		}

		// 1. Use provided initial coordinates if valid.
		const parsedLat = initialLat !== undefined ? Number(initialLat) : NaN;
		const parsedLng = initialLng !== undefined ? Number(initialLng) : NaN;
		if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
			applyCamera({ latitude: parsedLat, longitude: parsedLng });
			broadcastLocation(parsedLat, parsedLng, initialPlaceName ?? '');
			setIsRequestingPermission(false);
			setIsLoading(false);
			return;
		}

		// 2. Fall back to device GPS.
		// NOTE: a `saved` (persisted location) step can be slotted in here in the
		//       future between steps 1 and 2 when persistence is implemented.
		const location = await getCurrentLocation();
		if (!isMounted.current) return;

		if (location.ok) {
			const { latitude, longitude } = location.data;
			applyCamera({ latitude, longitude });

			const geocoded = await reverseGeocodeLocation(latitude, longitude);
			if (!isMounted.current) return;

			broadcastLocation(latitude, longitude, geocoded.ok ? geocoded.data.name : '');
			setIsRequestingPermission(false);
		} else {
			setPermissionError(
				location.error.message
					? `${location.error.message}. Press button below to grant permission.`
					: 'Location permission is required.',
			);
			setIsRequestingPermission(false);
		}

		setIsLoading(false);
	}, [applyCamera, broadcastLocation, initialLat, initialLng, initialPlaceName]);

	// ─── Effects ──────────────────────────────────────────────────────────────

	useEffect(() => {
		initializeLocationFlow();
	}, [initializeLocationFlow]);

	// Replace last places with center of map when user toggles selection mode on.
	useEffect(() => {
		if (onSelecting) {
			const lastCoord = placeCoords[placeCoords.length - 1];
			applyCamera({ 
				latitude: lastCoord.latitude, 
				longitude: lastCoord.longitude 
			}, DEFAULT_ZOOM, 250);
		}
	}, [onSelecting]);

	// Sync external `places` prop into local state.
	useEffect(() => {
		setLocalPlaces(places ?? []);
		setHasUserRecentered(false);
	}, [places]);

	// Re-run location flow when the app returns to foreground.
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

	// Fit camera to all place markers once the map has laid out.
	useEffect(() => {
		if (!fitPlacesToMap) return;
		if (!cameraRef.current || !placeCoords.length || !mapLayout.width || !mapLayout.height) return;
		const lats = placeCoords.map((p) => p.latitude);
		const lngs = placeCoords.map((p) => p.longitude);
		isProgrammaticMoveRef.current = true;
		ignoreRegionEventsUntilRef.current = Date.now() + 600;
		cameraRef.current.fitBounds(
			[Math.max(...lngs), Math.max(...lats)],
			[Math.min(...lngs), Math.min(...lats)],
			40,
			400,
		);
	}, [fitPlacesToMap, placeCoords, mapLayout.width, mapLayout.height]);

	// ─── Map event handlers ───────────────────────────────────────────────────

	const getSelectionRadiusFromCurrentLocation = () => {
		if (!initialLat && !initialLng) return null;
		const current = lastCameraRef.current;
		if (!current) return null;
		const { latitude, longitude } = current.center;
		// Approximate radius as distance from center to top edge of map view.
		const radius = calculateDistance(initialLat as Float, initialLng as Float, latitude, longitude);
		return radius;
	}

	const handleRegionIsChanging = async (feature: Feature<Point>) => {
		if (onSelecting) {
			if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
			geocodeTimerRef.current = setTimeout(async () => {
				setIsDragMarkerVisible(true); // Show the "Selected location" marker after user has stopped dragging for 500ms.
				setIsStarting(false);
				setHasUserRecentered(true);
			}, 5);

			const [longitude, latitude] = feature.geometry.coordinates;
			const name = `Selected location${getSelectionRadiusFromCurrentLocation() ? ` (±${Math.round(getSelectionRadiusFromCurrentLocation()!)}m)` : ''}`;
			setLocalPlaces((prev) => {
				prev.pop(); // remove previous "Selected location" if exists
				return [...prev, { properties: { name }, geometry: { coordinate: { latitude, longitude } } }];
			});
		}

		if (!onSelecting || isDraggingRef.current) return;
		isDraggingRef.current = true;
		animatePin(true);
	};

	const handleRegionDidChange = (async (feature: Feature<Point>) => {
		const isUserInteraction = feature.properties?.isUserInteraction;

		// user is dragging the map to select location
		if (isUserInteraction) {
			if (!onSelecting) return;
			if (isDraggingRef.current) {
				isDraggingRef.current = false;
				animatePin(false);

				const [longitude, latitude] = feature.geometry.coordinates;
				const geocoded = await reverseGeocodeLocation(latitude, longitude);
				const name = geocoded.ok ? geocoded.data.name : 'Selected location';
				broadcastLocation(latitude, longitude, name);
			}
		}
	});

	// ─── Camera controls ──────────────────────────────────────────────────────

	const zoomBy = useCallback((factor: number) => {
		const current = lastCameraRef.current;
		if (!current) return;
		const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom - Math.log2(factor)));
		cameraRef.current?.setCamera({ zoomLevel: nextZoom, animationDuration: 180 });
		lastCameraRef.current = { ...current, zoom: nextZoom };
	}, []);

	/** Focus back to current user location */
	const recenterToUserLocation = useCallback(async () => {
		setIsRecentering(true);
		const location = await getCurrentLocation();
		if (!isMounted.current) return;

		if (!location.ok) {
			setIsRecentering(false);
			return;
		}

		const { latitude, longitude } = location.data;
		const geocoded = await reverseGeocodeLocation(latitude, longitude);
		if (!isMounted.current) return;

		const name = geocoded.ok ? geocoded.data.name : 'Current location';

		setLocalPlaces((prev) => {
			prev.pop(); // remove previous "Current location" if exists
			const deduped = prev.filter(
				(p) => p.geometry.coordinate.latitude !== latitude || p.geometry.coordinate.longitude !== longitude,
			);
			return [...deduped, { properties: { name }, geometry: { coordinate: { latitude, longitude } } }];
		});
		setHasUserRecentered(true);
		applyCamera({ latitude, longitude }, DEFAULT_ZOOM, 0);
		broadcastLocation(latitude, longitude, name);
		setIsRecentering(false);

		setOnSelecting(false);
		setIsDragMarkerVisible(false); // Hide the "Selected location" marker when recentering to user location.
		
	}, [applyCamera, broadcastLocation]);

	// ─── Render ───────────────────────────────────────────────────────────────

	const showPermissionScreen = isRequestingPermission || !!permissionError || isLocationNotEnabled;

	return (
		<View style={[styles.container, containerStyle]}>
			{showPermissionScreen ? (
				<PermissionBlock
					isRequestingPermission={isRequestingPermission}
					permissionError={permissionError}
					isLocationNotEnabled={isLocationNotEnabled}
					onPrimaryAction={isLocationNotEnabled ? openLocationSettings : initializeLocationFlow}
				/>
			) : (
				<View style={styles.page}>
					<View style={styles.mapCard}>
						{/*
						 * MapboxMapView is ALWAYS mounted — never conditionally unmounted.
						 * Toggling mount/unmount destroys the native view tag, causing:
						 *   "Could not find view with tag XXXX in setHandledMapChangedEvents"
						 * A transparent loading overlay is used instead.
						 */}
						<View style={styles.mapWrapper}>
							<MapboxMapView
								ref={(ref) => { mapRef.current = ref; }}
								style={styles.map}
								styleURL={mapStyleUrl}
								logoEnabled={false}
								attributionEnabled={false}
								scaleBarEnabled={false}
								regionWillChangeDebounceTime={500}
								onRegionIsChanging={handleRegionIsChanging}
								onRegionDidChange={handleRegionDidChange}
								rotateEnabled
								pitchEnabled
								scrollEnabled
								zoomEnabled
								onLayout={(e) =>
									setMapLayout({
										width: e.nativeEvent.layout.width,
										height: e.nativeEvent.layout.height,
									})
								}
							>
								{/*
								 * Camera is conditionally rendered inside the always-mounted MapView.
								 * This prevents it from animating to null coordinates before the
								 * location flow completes.
								 */}
								{cameraCenter && (
									<Camera
										ref={cameraRef}
										centerCoordinate={[cameraCenter.longitude, cameraCenter.latitude]}
										zoomLevel={cameraZoom}
										animationDuration={0}
										padding={mapboxPadding}
									/>
								)}

								{placeCoords.map((coord, index) => (
									<MarkerView
										key={`place-${index}`}
										id={`place-${index}`}
										coordinate={[coord.longitude, coord.latitude]}
										anchor={{ x: 0.5, y: Platform.OS === 'ios' ? 0.85 : 1 }}
									>
										<View
											style={[
												styles.markerContainer,
												Platform.OS === 'ios' && styles.markerContainerIos,
											]}
										>
											<CustomMarker 
												coord={coord} 
												index={index} 
												total={placeCoords.length} 
												onChangeLocation={handleChangeLocation} 
												isDragMarkerVisible={isDragMarkerVisible} 
											/>
										</View>
									</MarkerView>
								))}

								{placeCoords.length >= 2 && !isStarting && (
									<ShapeSource
										id="route"
										shape={{
											type: 'Feature',
											geometry: {
												type: 'LineString',
												coordinates: placeCoords.map(({ latitude, longitude }) => [
													longitude,
													latitude,
												]),
											},
											properties: {},
										}}
									>
										<LineLayer id="route-line" style={{ lineColor: '#1382fe', lineWidth: 2 }} />
									</ShapeSource>
								)}
							</MapboxMapView>

							{/* Loading overlay — map stays alive underneath */}
							{(isLoading || !cameraCenter) && (
								<View style={styles.mapLoadingOverlay} pointerEvents="none">
									<ActivityIndicator size="small" />
									<Text style={styles.mutedText}>Loading map…</Text>
								</View>
							)}

							{onSelecting && isDragMarkerVisible && (
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
							)}

							<View style={[styles.zoomControls, controlPosition]}>
								<TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(0.5)}>
									<MaterialCommunityIcons name="plus" size={26} />
								</TouchableOpacity>
								<TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(2)}>
									<MaterialCommunityIcons name="minus" size={26} />
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.zoomButton}
									onPress={recenterToUserLocation}
									disabled={isRecentering}
								>
									{isRecentering ? (
										<ActivityIndicator size="small" />
									) : (
										<MaterialCommunityIcons name="crosshairs-gps" size={22} />
									)}
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			)}
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: { flex: 1 },
	page: { flex: 1 },
	mapCard: {
		overflow: 'hidden',
		backgroundColor: '#f8fafc',
		flex: 1,
		width: '100%',
		height: '100%',
	},
	mapWrapper: { width: '100%', height: '100%' },
	map: { width: '100%', height: '100%' },
	mapLoadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(248, 250, 252, 0.85)',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	markerContainer: {
		position: 'relative',
		alignItems: 'center',
		justifyContent: 'center',
	},
	markerContainerIos: { top: -12 },
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
	mutedText: { opacity: 0.7, fontSize: 12 },
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
	primaryButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '700',
	},
	customMarker: {
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	startMarker: { backgroundColor: 'transparent' },
	endMarker: { backgroundColor: 'transparent' },
	hereNowGroup: {
		position: 'absolute',
		top: 0,
		left: '50%',
		transform: [{ translateX: -42 }],
		alignItems: 'center',
	},
	hereNowBadge: {
		backgroundColor: 'white',
		padding: 4,
		borderRadius: 30,
		elevation: 3,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		zIndex: 10,
	},
	hereNowArrowWrapper: {
		marginTop: -2,
		width: 16,
		height: 10,
		alignItems: 'center',
		alignSelf: 'center',
		zIndex: 999,
		position: 'relative',
	},
	hereNowArrow: {
		width: 0,
		height: 0,
		borderLeftWidth: 8,
		borderRightWidth: 8,
		borderTopWidth: 12,
		borderLeftColor: 'transparent',
		borderRightColor: 'transparent',
		borderTopColor: 'white',
	},
	changeLocationButton: {
		backgroundColor: '#90ee90',
		height: 32,
		paddingHorizontal: 8,
		borderRadius: 16,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	},
	lastMarker: {
		width: 100,
		height: 90,
		justifyContent: 'flex-end',
		alignItems: 'center',
	}
});