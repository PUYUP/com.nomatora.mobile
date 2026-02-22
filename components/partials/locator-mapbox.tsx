import AnimatedOval from '@/components/ui/animated-oval';
import MapMarker from '@/components/ui/mappin';
import { getCurrentLocation, reverseGeocodeLocation } from '@/libs/location';
import { PlaceData } from '@/models/location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Mapbox, { Camera, FillLayer, LineLayer, MapView as MapboxMapView, MarkerView, ShapeSource } from '@rnmapbox/maps';
import type { Feature, GeoJsonProperties, Point, Polygon } from 'geojson';
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
import { useDispatch } from 'react-redux';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
Mapbox.setTelemetryEnabled(false);

// ─── Types ────────────────────────────────────────────────────────────────────

type MapPadding = { top?: number; right?: number; bottom?: number; left?: number };

type ConfirmPayload = { latitude: string; longitude: string; placeName: string; purpose?: string };

type RadiusCircleOptions = {
	/** Radius in meters. Defaults to 500. */
	radiusMeters?: number;
	/** Fill colour (CSS colour string). Defaults to '#1382fe'. */
	fillColor?: string;
	/** Fill opacity 0–1. Defaults to 0.12. */
	fillOpacity?: number;
	/** Border/stroke colour. Defaults to '#1382fe'. */
	strokeColor?: string;
	/** Border/stroke width in pixels. Defaults to 2. */
	strokeWidth?: number;
	/** Border opacity 0–1. Defaults to 0.8. */
	strokeOpacity?: number;
};

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
	/** When provided, renders a radius circle around the current user location. */
	radiusCircle?: RadiusCircleOptions | false;
};

type PlaceCoord = { latitude: number; longitude: number; title: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 2;
const MAX_ZOOM = 20;
const EARTH_RADIUS_KM = 6371;

/** Number of points used to approximate the circle polygon. Higher = smoother. */
const CIRCLE_STEPS = 64;

const MAPBOX_STYLE_URL: Record<NonNullable<ComponentProps['mapType']>, string> = {
	standard: Mapbox.StyleURL.Street,
	satellite: Mapbox.StyleURL.Satellite,
	hybrid: Mapbox.StyleURL.SatelliteStreet,
	terrain: Mapbox.StyleURL.Outdoors,
	none: Mapbox.StyleURL.Street,
};

const DEFAULT_MAP_PADDING: Required<MapPadding> = { top: 0, right: 0, bottom: 150, left: 0 };

const DEFAULT_RADIUS_OPTIONS: Required<RadiusCircleOptions> = {
	radiusMeters: 500,
	fillColor: '#1382fe',
	fillOpacity: 0.12,
	strokeColor: '#1382fe',
	strokeWidth: 2,
	strokeOpacity: 0.8,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Builds a GeoJSON Polygon that approximates a geodesic circle.
 *
 * Uses the Haversine-based offset formula so the circle is geographically
 * accurate (i.e. it stays circular at any latitude and zoom level, unlike
 * a plain CSS/View circle overlay which would distort).
 *
 * @param centerLat  Center latitude in decimal degrees
 * @param centerLng  Center longitude in decimal degrees
 * @param radiusMeters  Radius in metres
 * @param steps  Number of polygon vertices (more = smoother)
 */
function buildCirclePolygon(
	centerLat: number,
	centerLng: number,
	radiusMeters: number,
	steps: number = CIRCLE_STEPS,
): Feature<Polygon, GeoJsonProperties> {
	const EARTH_RADIUS_M = 6_371_000;
	const latRad = (centerLat * Math.PI) / 180;
	const angularRadius = radiusMeters / EARTH_RADIUS_M;

	const coordinates: [number, number][] = [];

	for (let i = 0; i <= steps; i++) {
		const bearing = (2 * Math.PI * i) / steps; // 0 → 2π
		const pointLat = Math.asin(
			Math.sin(latRad) * Math.cos(angularRadius) +
				Math.cos(latRad) * Math.sin(angularRadius) * Math.cos(bearing),
		);
		const pointLng =
			(centerLng * Math.PI) / 180 +
			Math.atan2(
				Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(latRad),
				Math.cos(angularRadius) - Math.sin(latRad) * Math.sin(pointLat),
			);

		coordinates.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI]);
	}

	return {
		type: 'Feature',
		geometry: { type: 'Polygon', coordinates: [coordinates] },
		properties: {},
	};
}

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
				<View style={[styles.hereNowGroup, { transform: [{ translateX: Platform.OS === 'ios' ? -40 : -42 }] }]} >
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
	radiusCircle,
	onUserLocationChange,
}: ComponentProps & { onUserLocationChange?: (location: { latitude: number; longitude: number } | null) => void }) {
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
	const [mapLayout, setMapLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
	const [localPlaces, setLocalPlaces] = useState<PlaceData[]>(places ?? []);
	const [hasUserRecentered, setHasUserRecentered] = useState(false);
	const [isRecentering, setIsRecentering] = useState(false);
	const [isDragMarkerVisible, setIsDragMarkerVisible] = useState(false);
	const [isStarting, setIsStarting] = useState(false);

	/**
	 * The live GPS position of the device — used exclusively as the circle center.
	 * Separate from cameraCenter so the circle follows the real user position even
	 * when the camera has been panned elsewhere (e.g. in isSelecting mode).
	 */
	const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
		const lat = initialLat !== undefined ? Number(initialLat) : undefined;
		const lng = initialLng !== undefined ? Number(initialLng) : undefined;
		if (typeof lat === 'number' && !Number.isNaN(lat) && typeof lng === 'number' && !Number.isNaN(lng)) {
			return { latitude: lat, longitude: lng };
		}
		return null;
	});

	// Call onUserLocationChange whenever userLocation changes
	useEffect(() => {
		if (onUserLocationChange) {
			onUserLocationChange(userLocation);
		}
	}, [userLocation, onUserLocationChange]);

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

	/**
	 * Resolved radius circle options — merges caller's overrides with defaults.
	 * Returns null when radiusCircle === false (feature disabled).
	 */
	const resolvedRadiusCircle = useMemo<Required<RadiusCircleOptions> | null>(() => {
		if (radiusCircle === false || radiusCircle === undefined) return null;
		return { ...DEFAULT_RADIUS_OPTIONS, ...radiusCircle };
	}, [radiusCircle]);

	/**
	 * GeoJSON polygon for the radius circle.
	 * Recomputed only when the user location or radius options change.
	 * Rendered as a FillLayer (filled area) + LineLayer (border) inside Mapbox,
	 * which ensures the circle scales and distorts correctly with the map projection.
	 */
	const radiusCircleGeoJSON = useMemo<Feature<Polygon, GeoJsonProperties> | null>(() => {
		if (!resolvedRadiusCircle || !userLocation) return null;
		return buildCirclePolygon(
			userLocation.latitude,
			userLocation.longitude,
			resolvedRadiusCircle.radiusMeters,
		);
	}, [resolvedRadiusCircle, userLocation]);

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

		// 1. Use provided initial coordinates if valid.
		const parsedLat = initialLat !== undefined ? Number(initialLat) : NaN;
		const parsedLng = initialLng !== undefined ? Number(initialLng) : NaN;
		if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
			applyCamera({ latitude: parsedLat, longitude: parsedLng });
			broadcastLocation(parsedLat, parsedLng, initialPlaceName ?? '');
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
		} else {
			// Fallback to a neutral center so the map is usable even without location.
			applyCamera({ latitude: 0, longitude: 0 });
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
				initializeLocationFlow();
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

	const getSelectionRadiusFromCurrentLocation = (lat: number, lng: number) => {
		if (!initialLat && !initialLng) return null;
		const current = lastCameraRef.current;
		if (!current) return null;
		const { latitude, longitude } = userLocation ?? current.center;
		// Approximate radius as distance from center to top edge of map view.
		const radius = calculateDistance(latitude, longitude, lat, lng);
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
			const name = `Selected location${getSelectionRadiusFromCurrentLocation(latitude, longitude) ? ` (±${Math.round(getSelectionRadiusFromCurrentLocation(latitude, longitude)!)}m)` : ''}`;
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

				// calulate radius from current location to selected location and update localPlaces to show it in the badge
				const radius = getSelectionRadiusFromCurrentLocation(latitude, longitude);
				const radiusText = radius ? ` (±${Math.round(radius)}m)` : '';

				if (resolvedRadiusCircle && radius && userLocation) {
					if (radius > resolvedRadiusCircle.radiusMeters) {
						setLocalPlaces((prev) => {
							prev.pop(); // remove previous set from handleRegionIsChanging
							return [...prev, { properties: { name }, geometry: { coordinate: { latitude: userLocation?.latitude, longitude: userLocation?.longitude } } }];
						});

						applyCamera({ latitude: userLocation.latitude, longitude: userLocation.longitude }, cameraZoom, 300);
						setIsDragMarkerVisible(true); // Hide the "Selected location" marker if selection is out of radius.
						setHasUserRecentered(true);	
					}
				}
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
		applyCamera({ latitude, longitude }, DEFAULT_ZOOM, 250);
		broadcastLocation(latitude, longitude, name);
		setIsRecentering(false);

		// disable selection mode and hide.
		setOnSelecting(false);
		setIsDragMarkerVisible(false); // Hide the "Selected location" marker when recentering to user location.
    
		// update userLocation state to move radius circle
		setUserLocation({ latitude, longitude });
	}, [applyCamera, broadcastLocation]);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={[styles.container, containerStyle]}>
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

								{/*
								 * ─── Radius circle ────────────────────────────────────────────────
								 *
								 * Rendered as a native Mapbox FillLayer + LineLayer on top of a
								 * ShapeSource. This is the correct approach because:
								 *
								 *  1. Geographic accuracy — the polygon is built using the Haversine
								 *     formula, so it remains a true circle regardless of latitude or
								 *     zoom level (a plain CSS/View circle would squash/stretch).
								 *
								 *  2. Proper z-ordering — it renders below markers and the route line
								 *     because it is declared first in JSX (Mapbox respects source order).
								 *
								 *  3. Performance — Mapbox renders it on the GL thread, not the JS
								 *     thread, so there is zero layout/render overhead per frame.
								 *
								 * Layer IDs use a unique prefix to avoid collisions with route layers.
								 */}
								{resolvedRadiusCircle && radiusCircleGeoJSON && onSelecting && (
									<ShapeSource id="radius-circle-source" shape={radiusCircleGeoJSON}>
										{/* Filled area */}
										<FillLayer
											id="radius-circle-fill"
											style={{
												fillColor: resolvedRadiusCircle.fillColor,
												fillOpacity: resolvedRadiusCircle.fillOpacity,
											}}
										/>
										{/* Stroke / border */}
										<LineLayer
											id="radius-circle-stroke"
											style={{
												lineColor: resolvedRadiusCircle.strokeColor,
												lineWidth: resolvedRadiusCircle.strokeWidth,
												lineOpacity: resolvedRadiusCircle.strokeOpacity,
											}}
										/>
									</ShapeSource>
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
		backgroundColor: '#9acd32',
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