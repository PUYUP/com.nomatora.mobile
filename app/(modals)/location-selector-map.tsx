
import HeaderBackButton from '@/components/partials/header-back-button';
import AnimatedOval from '@/components/ui/animated-oval';
import MapMarker from '@/components/ui/mappin';
import { getCurrentLocation, isLocationServiceEnabled, openLocationSettings, reverseGeocodeLocation } from '@/libs/location';
import { supabase } from '@/libs/supabase';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import debounce from 'lodash.debounce';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

export default function LocationSelectorMap() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const router = useRouter();
  const { returnTo, initialLat, initialLng, initialPlaceName, purpose, requestId } = useLocalSearchParams<{
    returnTo?: string;
    initialLat?: string;
    initialLng?: string;
    initialPlaceName?: string;
    purpose?: string;
    requestId?: string;
  }>();
  const initialDelta = 0.0025;
  const [region, setRegion] = useState<Region | null>(null);
  const [centerCoords, setCenterCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [placeName, setPlaceName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReverseGeocodingLoading, setIsReverseGeocodingLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [mapLayout, setMapLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const pinScale = useRef(new Animated.Value(1)).current;
  const pinTranslate = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);
  const lastRegionRef = useRef<Region | null>(null);
  const isDraggingRef = useRef(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);
  const [searchPlace, setSearchPlace] = useState('');
  const [placesResults, setPlacesResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const purposeLabel = purpose === 'origin'
    ? 'Origin'
    : purpose === 'destination'
      ? 'Destination'
      : purpose === 'meetup' || purpose === 'expense' || purpose === 'connectivity' || purpose === 'story' || purpose === 'next-location'
        ? 'Location'
        : purpose
          ? `${purpose.charAt(0).toUpperCase()}${purpose.slice(1)}`
          : 'Location';

  const initializeLocationFlow = useCallback(async () => {
    setIsLoading(true);
    setPermissionError(null);
    setIsRequestingPermission(true);

    const locationEnabled = await isLocationServiceEnabled();
    setIsLocationEnabled(locationEnabled);

    if (!locationEnabled) {
      setPermissionError('Location services are disabled. Enable location services then press Refresh.');
      setIsRequestingPermission(false);
      setIsLoading(false);
      hasInitialized.current = true;
      return;
    }

    const parsedLat = initialLat ? Number(initialLat) : null;
    const parsedLng = initialLng ? Number(initialLng) : null;
    const saved: any = null; // for current iteration, we won't load the last selected location on init, but we may want to in the future for better UX

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
      const placeName = initialPlaceName ?? '';
      setPlaceName(placeName);

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
      const placeName = geocoded.ok ? geocoded.data.name : '';
      setPlaceName(placeName);

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

  const updateLocationFromCoords = async (latitude: number, longitude: number) => {
    const geocoded = await reverseGeocodeLocation(latitude, longitude);
    const placeName = geocoded.ok ? geocoded.data.name : '';
    setPlaceName(placeName);

    // dispatch({ 
    //   type: 'mapPicker/setLocation', 
    //   payload: { 
    //     requestId: requestId, 
    //     location: {
    //       latitude: latitude,
    //       longitude: longitude,
    //       placeName: placeName,
    //       purpose: purpose ?? '',
    //     }
    //   } 
    // });

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

    const pinAnchorOffsetPx = 8; // slight downward offset to align the pin tip with computed coordinate
    let center = { latitude: nextRegion.latitude, longitude: nextRegion.longitude };
    try {
      // Use screen-space center (plus a tiny offset) for more accurate anchor regardless of zoom level
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
      // Fallback to nextRegion center
    }

    lastRegionRef.current = nextRegion;
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

  const handleRegionChange = () => {
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
  };

  const zoomBy = (factor: number) => {
    const currentRegion = lastRegionRef.current || region;
    if (!currentRegion || !mapRef.current) {
      return;
    }
    const nextRegion: Region = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta * factor,
      longitudeDelta: currentRegion.longitudeDelta * factor,
    };
    mapRef.current.animateToRegion(nextRegion, 180);
    lastRegionRef.current = nextRegion;
  };

  const handleConfirm = () => {
    if (!centerCoords || isReverseGeocodingLoading) {
      return;
    }
    const payload = {
      latitude: String(centerCoords.latitude),
      longitude: String(centerCoords.longitude),
      placeName: placeName ?? '',
      purpose: purpose ?? '',
    };

    dispatch({ 
      type: 'mapPicker/setLocation', 
      payload: { 
        requestId: requestId, 
        location: payload 
      } 
    });

    if (returnTo) {
      router.replace({ pathname: returnTo as any, params: payload });
      return;
    }
    router.back();
  };

  const handleOpenAppSettings = () => {
    openLocationSettings();
  };

  const handleRefresh = () => {
    initializeLocationFlow();
  };

  const selectPlaceHandler = (place: any) => {
    if (place) {
      const geometry = place.geometry;
      const location = geometry.location;
      setSearchPlace('');
      setPlaceName(place.name);
      setPlacesResults([]);
      Keyboard.dismiss();

      const nextRegion: Region = {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: initialDelta,
        longitudeDelta: initialDelta,
      };
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 220);
      lastRegionRef.current = nextRegion;
      setCenterCoords({ latitude: location.lat, longitude: location.lng });
    }
  }

  const placeSearchHandler = async (query: string) => {
    setSearchPlace(query);
    const latlng = `${centerCoords?.latitude ?? ''},${centerCoords?.longitude ?? ''}`;
    handleSearch(query, latlng);
    setIsSearchingPlaces(true);
  }

  const handleSearch = useCallback(
    debounce(async (query: string, latlng: string) => {
      const { data, error } = await supabase.functions.invoke("gmaps-places-search", {
        body: { query: query, latlng: latlng },
      });

      if (error) {
        console.warn("Places search failed", error);
      }

      setPlacesResults(data || []);
      setIsSearchingPlaces(false);
    }, 500), // 500ms delay
    [] // Empty dependency array ensures the debounced function is created only once
  );

  const clearSearchHandler = () => {
    setSearchPlace('');
    setPlacesResults([]);
  };

  const renderPlaceItem = ({ item, index }: { item: any; index: number }) => {
    const isLast = index === (placesResults?.length ?? 0) - 1;
    return (
      <TouchableOpacity onPress={() => selectPlaceHandler(item)}>
        <View style={[styles.placeResultRow, isLast && styles.placeResultRowLast]}>
          <Text style={styles.placeResultName}>{item.name}</Text>
          <Text style={styles.placeResultAddress}>{item.formatted_address}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const renderPermissionBlock = () => {
    return (
      <View style={styles.permissionBlock}>
        {isRequestingPermission && !permissionError ? (
          <ActivityIndicator size={'large'} />
        ) : (
          <MaterialCommunityIcons name="map-marker-off" size={40} color="#6b7280" />
        )}
        <Text style={styles.permissionTitle}>
          {isRequestingPermission && !permissionError ? 'Requesting location permission…' : (isLocationEnabled ? 'Location permission needed' : 'Location services disabled')}
        </Text>
        <Text style={styles.permissionMessage}>
          {permissionError || 'Please enable location access in Settings to select a location.'}
        </Text>
        {!isRequestingPermission && permissionError ? (
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 0, paddingHorizontal: 30, borderRadius: 50 }]}
            onPress={isLocationEnabled ? handleOpenAppSettings : handleRefresh}
          >
            <Text style={styles.primaryButtonText}>
              {isLocationEnabled ? 'Open Settings' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={true}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={{
          headerTitle: `Select ${purposeLabel}`,
          headerTitleStyle: {
            fontSize: 20,
            fontFamily: 'ZalandoSansExpanded_900Black',
            color: '#1F3D2B',
          },
          headerLeft: (props) => {
            return <HeaderBackButton {...props} />
          }
        }} />
        
        {isRequestingPermission || permissionError || !isLocationEnabled ? (
          renderPermissionBlock()
        ) : (
        <View style={styles.page}>
          <View style={{ height: 'auto', zIndex: 10 }}>
            <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                placeholder="Search places..."
                value={searchPlace}
                onChangeText={placeSearchHandler}
                style={styles.placeSearchInput}
              />

              {searchPlace.length > 0 && (
                <TouchableOpacity onPress={() => clearSearchHandler()} style={styles.clearButton} accessibilityLabel="Clear search">
                  <MaterialCommunityIcons name="close" size={22} />
                </TouchableOpacity>
              )}

              {isSearchingPlaces ? (
                <ActivityIndicator size="small" style={styles.searchSpinner} />
              ) : null}
            </View>

            {placesResults.length > 0 && (
              <View style={[styles.resultDialog, { top: 54 }]}>
                <FlatList
                  data={placesResults}
                  keyExtractor={(item, index) => index.toString()}
                  style={styles.placesList}
                  renderItem={renderPlaceItem}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            )}
          </View>

          <View style={styles.mapCard}>
            {isLoading || !region ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="small" />
                <Text style={styles.mutedText}>Loading map…</Text>
              </View>
            ) : (
              <View style={styles.mapWrapper}>
                <View style={styles.mapHint}>
                  <Text style={styles.hintText}>
                    Drag the map to place the pin.
                  </Text>
                </View>
                <MapView
                  ref={(ref) => { mapRef.current = ref; }}
                  style={styles.map}
                  initialRegion={region}
                  onLayout={(e) => setMapLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
                  onRegionChange={handleRegionChange}
                  onRegionChangeComplete={handleRegionChangeComplete}
                />
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

          <View style={styles.metaBlock}>
            <View style={[styles.metaRow, styles.metaRowPadded]}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={26} color="#6b7280" />
              <Text style={styles.metaText} numberOfLines={2}>{placeName ? placeName : '-'}</Text>
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

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.secondaryButton, { width: '48%', marginRight: '2.5%' }]} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, (!centerCoords || isReverseGeocodingLoading) && styles.primaryButtonDisabled, { width: '48%', marginLeft: '2.5%', flex: 0 }]}
              onPress={handleConfirm}
              disabled={!centerCoords || isReverseGeocodingLoading}
            >
              {(!centerCoords || isReverseGeocodingLoading) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    flex: 1,
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
    transform: [
      { translateX: -20 },   // half of width (40/2)
      { translateY: -64 },   // full height (bukan -32)
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  hintText: {
    fontSize: 12,
    opacity: 0.7,
  },
  metaRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    display: 'flex',
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
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 'auto',
    paddingHorizontal: 16,
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
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
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
  placeSearchInput: {
    width: '100%',
    height: 48,
    borderColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  placesList: { 
    height: 'auto', 
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
  placeResultRowLast: {
    borderBottomWidth: 0,
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
    zIndex: 15, 
    left: 16, 
    right: 16, 
    maxHeight: 300, 
    width: 'auto', 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  }
});
