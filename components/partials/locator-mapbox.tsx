import AnimatedOval from '@/components/ui/animated-oval';
import MapMarker from '@/components/ui/mappin';
import { getCurrentLocation, reverseGeocodeLocation } from '@/libs/location';
import { PlaceData } from '@/models/location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Mapbox, {
	Camera,
	FillLayer,
	LineLayer,
	MapView as MapboxMapView,
	MapState,
	MarkerView,
	ShapeSource,
} from '@rnmapbox/maps';
import type { Feature, GeoJsonProperties, Polygon } from 'geojson';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Animated,
	AppState,
	Image,
	Platform,
	StyleProp,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native';
import { useDispatch } from 'react-redux';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
Mapbox.setTelemetryEnabled(false);

// ─── Types ────────────────────────────────────────────────────────────────────

type MapPadding = { top?: number; right?: number; bottom?: number; left?: number };

type ConfirmPayload = {
	latitude: string;
	longitude: string;
	placeName: string;
	purpose?: string;
};

type RadiusCircleOptions = {
	radiusMeters?: number;
	fillColor?: string;
	fillOpacity?: number;
	strokeColor?: string;
	strokeWidth?: number;
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
	fitBounds?: boolean;
	controlPosition?: { top?: number; right?: number; bottom?: number; left?: number };
	mapPadding?: MapPadding;
	isSelecting?: boolean;
	radiusCircle?: RadiusCircleOptions | false;
	onUserLocationChange?: (location: { latitude: number; longitude: number } | null) => void;
};

type PlaceCoord = { latitude: number; longitude: number; title: string };
type LatLng = { latitude: number; longitude: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 2;
const MAX_ZOOM = 20;
const EARTH_RADIUS_KM = 6371;
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

function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const dLat = toRadians(lat2 - lat1);
	const dLon = toRadians(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
	return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

function buildCirclePolygon(
	centerLat: number,
	centerLng: number,
	radiusMeters: number,
	steps = CIRCLE_STEPS,
): Feature<Polygon, GeoJsonProperties> {
	const EARTH_RADIUS_M = 6_371_000;
	const latRad = toRadians(centerLat);
	const angularRadius = radiusMeters / EARTH_RADIUS_M;

	const coordinates: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => {
		const bearing = (2 * Math.PI * i) / steps;
		const pointLat = Math.asin(
			Math.sin(latRad) * Math.cos(angularRadius) +
				Math.cos(latRad) * Math.sin(angularRadius) * Math.cos(bearing),
		);
		const pointLng =
			toRadians(centerLng) +
			Math.atan2(
				Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(latRad),
				Math.cos(angularRadius) - Math.sin(latRad) * Math.sin(pointLat),
			);
		return [(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI];
	});

	return {
		type: 'Feature',
		geometry: { type: 'Polygon', coordinates: [coordinates] },
		properties: {},
	};
}

function parseLatLng(
	lat: string | number | undefined,
	lng: string | number | undefined,
): LatLng | null {
	const parsedLat = lat !== undefined ? Number(lat) : NaN;
	const parsedLng = lng !== undefined ? Number(lng) : NaN;
	if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
		return { latitude: parsedLat, longitude: parsedLng };
	}
	return null;
}

/** Replaces the last element of an array immutably. Appends if the array is empty. */
function replaceLast<T>(arr: T[], item: T): T[] {
	if (arr.length === 0) return [item];
	return [...arr.slice(0, -1), item];
}

/** Builds a PlaceData-shaped object for a selected/current location. */
function makeLocationPlace(name: string, coords: LatLng): PlaceData {
	return {
		properties: { name },
		geometry: { coordinate: { latitude: coords.latitude, longitude: coords.longitude } },
	};
}

/**
 * Stable marker key derived from index and coordinates.
 * We intentionally avoid float coords in keys — precision differences between
 * renders (e.g. 1.23456789 vs 1.2345678900001) would cause unnecessary unmounts.
 */
function markerKey(index: number, coord: PlaceCoord): string {
	return `place-${index}-${coord.latitude}-${coord.longitude}`;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePinAnimation() {
	const pinScale = useRef(new Animated.Value(1)).current;
	const pinTranslate = useRef(new Animated.Value(0)).current;

	// Animated.Value refs are stable for the component lifetime — no deps needed.
	const animate = useCallback((dragging: boolean) => {
		const config = { useNativeDriver: true, speed: 20, bounciness: 6 };
		Animated.spring(pinScale, { toValue: dragging ? 1.1 : 1, ...config }).start();
		Animated.spring(pinTranslate, { toValue: dragging ? -6 : 0, ...config }).start();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return { pinScale, pinTranslate, animate };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export const CustomMarker = ({
	coord,
	index,
	total,
	onChangeLocation,
	isDragMarkerVisible,
	isDraggingRef,
}: {
	coord: PlaceCoord;
	index: number;
	total: number;
	onChangeLocation: (coord: PlaceCoord) => void;
	isDragMarkerVisible: boolean;
	/** Ref so we can gate the press without needing a re-render cycle. */
	isDraggingRef: React.MutableRefObject<boolean>;
}) => {
	if (!coord) return null;

	const isFirst = index === 0;
	const isLast = total > 1 && index === total - 1;

	const asset = isFirst
		? require('../../assets/markers/destination-green.png')
		: isLast
			? require('../../assets/markers/destination.png')
			: require('../../assets/markers/destination-blue.png');

	const hereNowTranslate = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!isLast) return;
		const anim = Animated.loop(
			Animated.sequence([
				Animated.timing(hereNowTranslate, { toValue: -6, duration: 1000, useNativeDriver: true }),
				Animated.timing(hereNowTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
			]),
		);
		anim.start();
		return () => anim.stop();
	}, [hereNowTranslate, isLast]);

	const markerStyle = isFirst ? styles.startMarker : isLast ? styles.endMarker : null;

	const handleChangePress = useCallback(() => {
		if (isDraggingRef.current) return;
		onChangeLocation(coord);
	}, [isDraggingRef, onChangeLocation, coord]);

	return (
		<View style={[styles.customMarker, markerStyle, isLast && styles.lastMarker]}>
			{!(isLast && isDragMarkerVisible) && (
				<Image source={asset} style={{ width: 40, height: 40 }} />
			)}

			{isLast && !isDragMarkerVisible && (
				<View
					style={[
						styles.hereNowGroup,
						{ transform: [{ translateX: Platform.OS === 'ios' ? -50 : -52 }] },
					]}
				>
					<Animated.View style={{ transform: [{ translateY: hereNowTranslate }] }}>
						<View style={styles.hereNowBadge}>
							<TouchableOpacity onPress={handleChangePress}>
								<View style={styles.changeLocationButton}>
									<MaterialCommunityIcons name="map-marker-radius" size={18} color="#333" />
									<Text style={{ fontSize: 12, textAlign: 'center', textTransform: 'uppercase' }}>
										Change
									</Text>
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

// ─── Main Component ───────────────────────────────────────────────────────────

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
	fitBounds = true,
	controlPosition,
	mapPadding,
	isSelecting = false,
	radiusCircle,
	onUserLocationChange,
}: ComponentProps) {
	const dispatch = useDispatch();
	const { pinScale, pinTranslate, animate: animatePin } = usePinAnimation();

	// ─── Refs ─────────────────────────────────────────────────────────────────
	const isMounted = useRef(true);
	const appState = useRef(AppState.currentState);
	const revealPinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cameraRef = useRef<Mapbox.Camera | null>(null);
	const lastCameraRef = useRef<{ center: LatLng; zoom: number } | null>(null);
	const isDraggingRef = useRef(false);
	/**
	 * Tracks in-flight geocode calls so a stale response from a previous idle
	 * event cannot overwrite a newer one. Incremented each time handleMapIdle
	 * kicks off a geocode; the callback checks its captured value still matches.
	 */
	const geocodeGenerationRef = useRef(0);
	/**
	 * Tracks in-flight initializeLocationFlow calls so that a backgrounded app
	 * returning to foreground cancels any previous in-flight async chain.
	 */
	const initGenerationRef = useRef(0);
	/**
	 * Ref mirror of isRecentering so async callbacks always read the current
	 * value without needing isRecentering in their dependency arrays (which
	 * would cause stale-closure issues or unnecessary re-creation).
	 */
	const isRecenteringRef = useRef(false);

	// ─── State ────────────────────────────────────────────────────────────────
	const [isFitBounds, setIsFitBounds] = useState<boolean>(fitBounds);
	// Ref mirror so handleCameraChanged can read the current value without
	// being in its dep array (which would cause it to be recreated on every toggle).
	const isFitBoundsRef = useRef(fitBounds);
	const setIsFitBoundsSynced = useCallback((value: boolean) => {
		isFitBoundsRef.current = value;
		setIsFitBounds(value);
	}, []);
	const [onSelecting, setOnSelecting] = useState(isSelecting);
	const [cameraCenter, setCameraCenter] = useState<LatLng | null>(null);
	const [cameraZoom, setCameraZoom] = useState(DEFAULT_ZOOM);
	const [isLoading, setIsLoading] = useState(false);
	const [mapLayout, setMapLayout] = useState({ width: 0, height: 0 });
	const [localPlaces, setLocalPlaces] = useState<PlaceData[]>(places ?? []);
	const [hasUserRecentered, setHasUserRecentered] = useState(false);
	const [isRecentering, setIsRecentering] = useState(false);
	// Keep ref mirror in sync — updated synchronously before any re-render.
	const setIsRecenteringSynced = useCallback((value: boolean) => {
		isRecenteringRef.current = value;
		setIsRecentering(value);
	}, []);
	const [isDragMarkerVisible, setIsDragMarkerVisible] = useState(false);
	const [userLocation, setUserLocation] = useState<LatLng | null>(
		() => parseLatLng(initialLat, initialLng),
	);

	// ─── Lifecycle ────────────────────────────────────────────────────────────
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
			if (revealPinTimerRef.current) {
				clearTimeout(revealPinTimerRef.current);
				revealPinTimerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		onUserLocationChange?.(userLocation);
	}, [userLocation, onUserLocationChange]);

	// ─── Derived values ───────────────────────────────────────────────────────
	const initialCoord = useMemo<PlaceCoord | null>(() => {
		const coords = parseLatLng(initialLat, initialLng);
		if (!coords) return null;
		return { ...coords, title: initialPlaceName || 'Initial location' };
	}, [initialLat, initialLng, initialPlaceName]);

	const mapboxPadding = useMemo(
		() => ({
			paddingTop: mapPadding?.top ?? DEFAULT_MAP_PADDING.top,
			paddingRight: mapPadding?.right ?? DEFAULT_MAP_PADDING.right,
			paddingBottom: mapPadding?.bottom ?? DEFAULT_MAP_PADDING.bottom,
			paddingLeft: mapPadding?.left ?? DEFAULT_MAP_PADDING.left,
		}),
		[mapPadding],
	);

	const mapStyleUrl = useMemo(() => MAPBOX_STYLE_URL[mapType ?? 'standard'], [mapType]);

	const placeCoords = useMemo<PlaceCoord[]>(() => {
		const mapped = (localPlaces ?? []).map<PlaceCoord>((p) => ({
			latitude: p.geometry.coordinate.latitude,
			longitude: p.geometry.coordinate.longitude,
			title: p.properties.name,
		}));
		if (!hasUserRecentered && initialCoord) mapped.push(initialCoord);
		return mapped;
	}, [localPlaces, initialCoord, hasUserRecentered]);

	const resolvedRadiusCircle = useMemo<Required<RadiusCircleOptions> | null>(() => {
		if (!radiusCircle) return null;
		return { ...DEFAULT_RADIUS_OPTIONS, ...radiusCircle };
	}, [radiusCircle]);

	const radiusCircleGeoJSON = useMemo<Feature<Polygon, GeoJsonProperties> | null>(() => {
		if (!resolvedRadiusCircle || !userLocation) return null;
		return buildCirclePolygon(userLocation.latitude, userLocation.longitude, resolvedRadiusCircle.radiusMeters);
	}, [resolvedRadiusCircle, userLocation]);

	// ─── Core helpers ─────────────────────────────────────────────────────────

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

	const zoomBy = useCallback((factor: number, animationDuration = 180) => {
		const current = lastCameraRef.current;
		if (!current) return;
		const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom - Math.log2(factor)));
		cameraRef.current?.setCamera({ zoomLevel: nextZoom, animationDuration });
		lastCameraRef.current = { ...current, zoom: nextZoom };
	}, []);

	const getSelectionRadius = useCallback(
		(lat: number, lng: number): number | null => {
			if (!initialLat && !initialLng) return null;
			const origin = userLocation ?? lastCameraRef.current?.center;
			if (!origin) return null;
			return calculateDistance(origin.latitude, origin.longitude, lat, lng);
		},
		[initialLat, initialLng, userLocation],
	);

	const updateSelectionPlace = useCallback(
		(latitude: number, longitude: number, radius: number | null, snapTo?: LatLng) => {
			const radiusText = radius ? ` (±${Math.round(radius)}m)` : '';
			const coords = snapTo ?? { latitude, longitude };
			setLocalPlaces((prev) => replaceLast(prev, makeLocationPlace(`Selected location${radiusText}`, coords)));
			setHasUserRecentered(true);
		},
		[],
	);

	// ─── Location flow ────────────────────────────────────────────────────────

	const initializeLocationFlow = useCallback(async () => {
		// Invalidate any previous in-flight init. Each call captures its own
		// generation; if a newer call starts before this one finishes, the
		// isMounted checks below will still pass (component is mounted) but
		// we'd overwrite fresh state with stale data. The generation counter
		// prevents that.
		const generation = ++initGenerationRef.current;
		const isCurrent = () => isMounted.current && initGenerationRef.current === generation;

		setIsLoading(true);

		const initial = parseLatLng(initialLat, initialLng);
		if (initial) {
			applyCamera(initial);
			broadcastLocation(initial.latitude, initial.longitude, initialPlaceName ?? '');
			if (isCurrent()) setIsLoading(false);
			return;
		}

		const location = await getCurrentLocation();
		if (!isCurrent()) return;

		if (location.ok) {
			const { latitude, longitude } = location.data;
			applyCamera({ latitude, longitude });
			const geocoded = await reverseGeocodeLocation(latitude, longitude);
			if (!isCurrent()) return;
			broadcastLocation(latitude, longitude, geocoded.ok ? geocoded.data.name : '');
		} else {
			applyCamera({ latitude: 0, longitude: 0 });
		}

		if (isCurrent()) setIsLoading(false);
	}, [applyCamera, broadcastLocation, initialLat, initialLng, initialPlaceName]);

	// ─── Effects ──────────────────────────────────────────────────────────────

	useEffect(() => {
		initializeLocationFlow();
	}, [initializeLocationFlow]);

	useEffect(() => {
		if (!onSelecting || !userLocation) return;
		setLocalPlaces((prev) => replaceLast(prev, makeLocationPlace('Selected location', userLocation)));
		setHasUserRecentered(true);
		applyCamera({ latitude: userLocation.latitude, longitude: userLocation.longitude }, 15.5, 250);
		setIsDragMarkerVisible(true);
	}, [onSelecting, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		setLocalPlaces(places ?? []);
		setHasUserRecentered(false);
	}, [places]);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextAppState) => {
			if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
				initializeLocationFlow();
			}
			appState.current = nextAppState;
		});
		return () => subscription.remove();
	}, [initializeLocationFlow]);

	useEffect(() => {
		// Only re-fit when fit-bounds mode is explicitly ON and we have enough
		// info. The isFitBounds check is the primary guard — when OFF, the
		// placeCoords / mapLayout changes must not silently move the camera.
		if (!isFitBounds || !cameraRef.current || !placeCoords.length || !mapLayout.width || !mapLayout.height) return;
		const lats = placeCoords.map((p) => p.latitude);
		const lngs = placeCoords.map((p) => p.longitude);
		cameraRef.current.fitBounds(
			[Math.max(...lngs), Math.max(...lats)],
			[Math.min(...lngs), Math.min(...lats)],
			40,
			400,
		);
		// Sync the ref in case the effect ran before setIsFitBoundsSynced could.
		isFitBoundsRef.current = isFitBounds;
	}, [isFitBounds, placeCoords, mapLayout.width, mapLayout.height]);

	// ─── Map event handlers ───────────────────────────────────────────────────

	const handleCameraChanged = useCallback(
		(state: MapState) => {
			// Always keep lastCameraRef in sync with the real camera position so
			// that zoomBy() reads a fresh zoom level regardless of how the camera moved.
			const [longitude, latitude] = state.properties.center;
			lastCameraRef.current = {
				center: { latitude, longitude },
				zoom: state.properties.zoom,
			};

			if (onSelecting) {
				if (revealPinTimerRef.current) clearTimeout(revealPinTimerRef.current);
				revealPinTimerRef.current = setTimeout(() => {
					setIsDragMarkerVisible(true);
					revealPinTimerRef.current = null;
				}, 100);

				updateSelectionPlace(latitude, longitude, getSelectionRadius(latitude, longitude));
			}

			if (!isDraggingRef.current) {
				isDraggingRef.current = true;
				animatePin(true);
			}

			// Only disable fit-bounds when the user is actively gesturing.
			// Programmatic moves (fitBounds animation, applyCamera, zoom buttons)
			// also fire onCameraChanged — we must NOT clear the flag for those,
			// or toggling fit-bounds ON would immediately turn itself back OFF.
			if (isFitBoundsRef.current && state.gestures?.isGestureActive) {
				setIsFitBoundsSynced(false);
			}
		},
		[onSelecting, getSelectionRadius, updateSelectionPlace, animatePin, setIsFitBoundsSynced],
	);

	const handleMapIdle = useCallback(
		async (state: MapState) => {
			const wasUserDrag = isDraggingRef.current;
			if (wasUserDrag) {
				isDraggingRef.current = false;
				animatePin(false);
			}

			if (revealPinTimerRef.current) {
				clearTimeout(revealPinTimerRef.current);
				revealPinTimerRef.current = null;
			}

			const isUserInteraction = state.gestures?.isGestureActive || false;
			// Use ref for isRecentering — reading state here would capture a stale
			// closure value from when the callback was last created.
			if (!(wasUserDrag || isUserInteraction) || !onSelecting || isRecenteringRef.current) return;

			const [longitude, latitude] = state.properties.center;
			const radius = getSelectionRadius(latitude, longitude);

			// Stamp this geocode call so a stale response from a previous idle
			// event cannot overwrite the result of a newer one.
			const generation = ++geocodeGenerationRef.current;
			const isCurrent = () => isMounted.current && geocodeGenerationRef.current === generation;

			if (resolvedRadiusCircle && radius != null && userLocation) {
				if (radius > resolvedRadiusCircle.radiusMeters) {
					// Out of bounds — snap camera back to user location.
					// Do this synchronously before the alert so the map moves
					// immediately rather than after the user dismisses the dialog.
					updateSelectionPlace(latitude, longitude, radius, userLocation);
					cameraRef.current?.setCamera({
						centerCoordinate: [userLocation.longitude, userLocation.latitude],
						zoomLevel: 15.5,
						animationDuration: 50,
					});
					Alert.alert(
						'Out of bounds',
						`Please select a location within ${Math.round(resolvedRadiusCircle.radiusMeters)} meters of your current location.`,
					);
				} else {
					const geocoded = await reverseGeocodeLocation(latitude, longitude);
					if (isCurrent() && geocoded.ok) {
						broadcastLocation(latitude, longitude, geocoded.data.name);
					}
				}
			} else if (!resolvedRadiusCircle && onSelecting) {
				// No radius constraint — still geocode and broadcast the new location.
				const geocoded = await reverseGeocodeLocation(latitude, longitude);
				if (isCurrent() && geocoded.ok) {
					broadcastLocation(latitude, longitude, geocoded.data.name);
				}
			}
		},
		[onSelecting, getSelectionRadius, resolvedRadiusCircle, userLocation, broadcastLocation, animatePin, updateSelectionPlace],
	);

	// ─── Controls ─────────────────────────────────────────────────────────────

	const handleChangeLocation = useCallback(() => {
		setOnSelecting(true);
	}, []);

	const handleCancelSelection = useCallback(() => {
		setOnSelecting(false);
		setIsDragMarkerVisible(false);
		if (userLocation) {
			setLocalPlaces((prev) => replaceLast(prev, makeLocationPlace('Current location', userLocation)));
			setHasUserRecentered(true);
			applyCamera(userLocation, DEFAULT_ZOOM, 250);
			broadcastLocation(userLocation.latitude, userLocation.longitude, 'Current location');
		}
	}, [userLocation, applyCamera, broadcastLocation]);

	const recenterToUserLocation = useCallback(async () => {
		setIsFitBoundsSynced(false);
		setIsRecenteringSynced(true);
		const location = await getCurrentLocation();
		if (!isMounted.current) {
			// Component unmounted mid-flight — clean up ref so future mounts start fresh.
			isRecenteringRef.current = false;
			return;
		}
		if (!location.ok) {
			setIsRecenteringSynced(false);
			return;
		}

		const { latitude, longitude } = location.data;
		const geocoded = await reverseGeocodeLocation(latitude, longitude);
		if (!isMounted.current) {
			isRecenteringRef.current = false;
			return;
		}

		const name = geocoded.ok ? geocoded.data.name : 'Current location';
		const coords = { latitude, longitude };

		setLocalPlaces((prev) => replaceLast(prev, makeLocationPlace(name, coords)));
		setHasUserRecentered(true);
		applyCamera(coords, DEFAULT_ZOOM, 250);
		broadcastLocation(latitude, longitude, name);
		setUserLocation(coords);
		setOnSelecting(false);
		setIsDragMarkerVisible(false);
		setIsRecenteringSynced(false);
	}, [applyCamera, broadcastLocation, setIsRecenteringSynced, setIsFitBoundsSynced]);

	/**
	 * Toggles fit-bounds mode.
	 * - Turning ON  → immediately fires fitBounds on the camera so all markers
	 *   are framed without waiting for the next placeCoords change.
	 * - Turning OFF → leaves the camera where it is; the user can pan freely.
	 */
	const fitToBoundsHandler = useCallback(() => {
		const next = !isFitBoundsRef.current;
		setIsFitBoundsSynced(next);

		if (next && cameraRef.current && placeCoords.length && mapLayout.width && mapLayout.height) {
			const lats = placeCoords.map((p) => p.latitude);
			const lngs = placeCoords.map((p) => p.longitude);
			cameraRef.current.fitBounds(
				[Math.max(...lngs), Math.max(...lats)],
				[Math.min(...lngs), Math.min(...lats)],
				40,
				400,
			);
		}
	}, [placeCoords, mapLayout, setIsFitBoundsSynced]);

	// ─── Render ───────────────────────────────────────────────────────────────

	const routeCoordinates = placeCoords.map(({ latitude, longitude }) => [longitude, latitude]);

	return (
		<View style={[styles.container, containerStyle]}>
			<View style={styles.page}>
				<View style={styles.mapCard}>
					<View style={styles.mapWrapper}>
						<MapboxMapView
							style={styles.map}
							styleURL={mapStyleUrl}
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
							onLayout={(e) =>
								setMapLayout({
									width: e.nativeEvent.layout.width,
									height: e.nativeEvent.layout.height,
								})
							}
						>
							{cameraCenter && (
								<Camera
									ref={cameraRef}
									centerCoordinate={[cameraCenter.longitude, cameraCenter.latitude]}
									zoomLevel={cameraZoom}
									animationDuration={0}
									padding={mapboxPadding}
								/>
							)}

							{resolvedRadiusCircle && radiusCircleGeoJSON && onSelecting && (
								<ShapeSource id="radius-circle-source" shape={radiusCircleGeoJSON}>
									<FillLayer
										id="radius-circle-fill"
										style={{
											fillColor: resolvedRadiusCircle.fillColor,
											fillOpacity: resolvedRadiusCircle.fillOpacity,
										}}
									/>
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
									key={markerKey(index, coord)}
									coordinate={[coord.longitude, coord.latitude]}
									anchor={{ x: 0.5, y: Platform.OS === 'ios' ? 0.85 : 1 }}
								>
									<View style={[styles.markerContainer, Platform.OS === 'ios' && styles.markerContainerIos]}>
										<CustomMarker
											coord={coord}
											index={index}
											total={placeCoords.length}
											onChangeLocation={handleChangeLocation}
											isDragMarkerVisible={isDragMarkerVisible}
											isDraggingRef={isDraggingRef}
										/>
									</View>
								</MarkerView>
							))}

							{placeCoords.length >= 2 && (
								<ShapeSource
									id="route"
									shape={{
										type: 'Feature',
										geometry: { type: 'LineString', coordinates: routeCoordinates },
										properties: {},
									}}
								>
									<LineLayer id="route-line" style={{ lineColor: '#1382fe', lineWidth: 2 }} />
								</ShapeSource>
							)}
						</MapboxMapView>

						{(isLoading || !cameraCenter) && (
							<View style={styles.mapLoadingOverlay} pointerEvents="none">
								<ActivityIndicator size="small" />
								<Text style={styles.mutedText}>Loading map…</Text>
							</View>
						)}

						{onSelecting && isDragMarkerVisible && (
							<>
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

								<View style={styles.cancelSelectionContainer}>
									<TouchableOpacity style={styles.cancelSelectionButton} onPress={handleCancelSelection}>
										<MaterialCommunityIcons name="close-circle" size={18} color="#333" />
										<Text style={{ textTransform: 'uppercase', fontSize: 12, textAlign: 'center' }}>
											Cancel
										</Text>
									</TouchableOpacity>
								</View>
							</>
						)}

						<View style={[styles.zoomControls, controlPosition]}>
							<TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(0.5)}>
								<MaterialCommunityIcons name="plus" size={26} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(2)}>
								<MaterialCommunityIcons name="minus" size={26} />
							</TouchableOpacity>

							{/* ── Fit-bounds toggle ── */}
							<TouchableOpacity
								style={[
									styles.zoomButton,
									isFitBounds && styles.zoomButtonActive,
									!placeCoords.length && styles.zoomButtonDisabled,
								]}
								onPress={fitToBoundsHandler}
								disabled={!placeCoords.length}
								activeOpacity={0.7}
							>
								<MaterialCommunityIcons
									name="map-marker-path"
									size={26}
									color={isFitBounds ? '#fff' : '#333'}
								/>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.zoomButton, { opacity: isRecentering || onSelecting ? 0.5 : 1 }]}
								onPress={recenterToUserLocation}
								disabled={isRecentering || onSelecting}
								activeOpacity={0.6}
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
	/** Active state: filled blue background to show fit-bounds is ON. */
	zoomButtonActive: {
		backgroundColor: '#1382fe',
		borderColor: '#1382fe',
	},
	/** Disabled state: muted appearance when there are no markers to fit. */
	zoomButtonDisabled: {
		opacity: 0.4,
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
		padding: 3,
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
		backgroundColor: '#fffafa',
		height: 32,
		paddingHorizontal: 8,
		borderRadius: 16,
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
	},
	lastMarker: {
		width: 100,
		height: 90,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	cancelSelectionContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: '50%',
		transform: [{ translateY: -106 }],
		zIndex: 999,
		justifyContent: 'center',
		alignItems: 'center',
	},
	cancelSelectionButton: {
		backgroundColor: '#f8f8ff',
		paddingHorizontal: 6,
		height: 36,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 4,
		elevation: 4,
		flexDirection: 'row',
		gap: 6,
		borderWidth: 3,
		borderColor: '#fff',
	},
});