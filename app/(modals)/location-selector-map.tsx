
import MapMarker from '@/components/ui/mappin';
import { getCurrentLocation, openLocationSettings, reverseGeocodeLocation } from '@/libs/location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocationSelectorMap() {
  const router = useRouter();
  const { returnTo, initialLat, initialLng, initialPlaceName, purpose } = useLocalSearchParams<{
    returnTo?: string;
    initialLat?: string;
    initialLng?: string;
    initialPlaceName?: string;
    purpose?: string;
  }>();
  const initialDelta = 0.0025;
  const [region, setRegion] = useState<Region | null>(null);
  const [centerCoords, setCenterCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [placeName, setPlaceName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(true);
  const pinScale = useRef(new Animated.Value(1)).current;
  const mapRef = useRef<MapView | null>(null);
  const lastRegionRef = useRef<Region | null>(null);
  const isDraggingRef = useRef(false);
  const hasInitialized = useRef(false);

  const purposeLabel = purpose === 'origin'
    ? 'Origin'
    : purpose === 'destination'
      ? 'Destination'
      : purpose === 'meetup' || purpose === 'expense' || purpose === 'connectivity' || purpose === 'story' || purpose === 'next-location'
        ? 'Location'
        : purpose
          ? `${purpose.charAt(0).toUpperCase()}${purpose.slice(1)}`
          : 'Location';

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

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

        // todo: redux
        // emitLocationSelection({
        //   latitude: parsedLat,
        //   longitude: parsedLng,
        //   placeName: placeName,
        //   purpose,
        // });

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

        // todo: redux
        // emitLocationSelection({
        //   ...saved,
        //   purpose,
        // });

        setIsRequestingPermission(false);
        setIsLoading(false);
        hasInitialized.current = true;
        return;
      }

      setIsRequestingPermission(true);
      const location = await getCurrentLocation();
      if (location.ok) {
        const coords = location.data.coords;
        const nextRegion: Region = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: initialDelta,
          longitudeDelta: initialDelta,
        };
        setRegion(nextRegion);
        lastRegionRef.current = nextRegion;
        setCenterCoords({ latitude: coords.latitude, longitude: coords.longitude });
        const geocoded = await reverseGeocodeLocation(coords.latitude, coords.longitude);
        const placeName = geocoded.ok ? geocoded.data.name : '';
        setPlaceName(placeName);

        // todo: redux
        // emitLocationSelection({
        //   latitude: coords.latitude,
        //   longitude: coords.longitude,
        //   placeName: placeName,
        //   purpose,
        // });

        setIsRequestingPermission(false);
      } else {
        // Location permission denied or error occurred; surface notice and hide map content.
        setPermissionError(location.error.message || 'Location permission is required.');
        setIsRequestingPermission(false);
      }
      setIsLoading(false);
      hasInitialized.current = true;
    };
    init();
  }, [initialPlaceName, initialDelta, initialLat, initialLng]);

  const updateLocationFromCoords = async (latitude: number, longitude: number) => {
    const geocoded = await reverseGeocodeLocation(latitude, longitude);
    const placeName = geocoded.ok ? geocoded.data.name : '';
    setPlaceName(placeName);

    // todo: redux
    // emitLocationSelection({ latitude, longitude, placeName, purpose });
  };

  const handleRegionChangeComplete = async (nextRegion: Region) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      Animated.spring(pinScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();
    }
    if (!hasInitialized.current) {
      return;
    }

    let center = { latitude: nextRegion.latitude, longitude: nextRegion.longitude };
    try {
      const camera = await mapRef.current?.getCamera();
      if (camera?.center) {
        center = camera.center;
      }
    } catch (err) {
      // Fallback to nextRegion center
    }

    lastRegionRef.current = nextRegion;
    setCenterCoords(center);
    await updateLocationFromCoords(center.latitude, center.longitude);
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
    if (!centerCoords) {
      return;
    }
    const payload = {
      latitude: String(centerCoords.latitude),
      longitude: String(centerCoords.longitude),
      place_name: placeName ?? '',
      purpose,
    };

    // todo: redux
    // emitLocationSelected({
    //   latitude: centerCoords.latitude,
    //   longitude: centerCoords.longitude,
    //   placeName: placeName ?? '',
    //   purpose,
    // });


    if (returnTo) {
      router.replace({ pathname: returnTo as any, params: payload });
      return;
    }
    router.back();
  };

  const handleOpenSettings = () => {
    openLocationSettings();
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
          {isRequestingPermission && !permissionError ? 'Requesting location permission…' : 'Location permission needed'}
        </Text>
        <Text style={styles.permissionMessage}>
          {permissionError || 'Please enable location access in Settings to select a location.'}
        </Text>
        {!isRequestingPermission && permissionError ? (
          <TouchableOpacity style={[styles.primaryButton, { flex: 0 }]} onPress={handleOpenSettings}>
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{
        title: `Select ${purposeLabel}`,
        headerTitleStyle: {
          fontSize: 20,
          fontFamily: 'ZalandoSansExpanded_900Black',
          color: '#1F3D2B',
        },
        headerRight: () => {
          return (
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close">
              <MaterialCommunityIcons name="close" size={26} />
            </TouchableOpacity>
          )
        }
      }} />
      
      {isRequestingPermission || permissionError ? (
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
              <View style={styles.mapHint}>
                <Text style={styles.hintText}>
                  Drag the map to place the pin.
                </Text>
              </View>
              <MapView
                ref={(ref) => { mapRef.current = ref; }}
                style={styles.map}
                initialRegion={region}
                onRegionChange={handleRegionChange}
                onRegionChangeComplete={handleRegionChangeComplete}
              />
              <View style={styles.centerMarker} pointerEvents="none">
                <Animated.View style={{ transform: [{ scale: pinScale }] }}>
                  <View style={{ width: 40, height: 64 }}>
                    <MapMarker width={40} height={64} />
                  </View>
                </Animated.View>
              </View>
              <View style={styles.zoomControls}>
                <TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(0.5)}>
                  <MaterialCommunityIcons name="plus" size={18} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.zoomButton} onPress={() => zoomBy(2)}>
                  <MaterialCommunityIcons name="minus" size={18} />
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
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, !centerCoords && styles.primaryButtonDisabled]}
            onPress={handleConfirm}
            disabled={!centerCoords}
          >
            <Text style={styles.primaryButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    flex: 1,
    gap: 16,
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
  zoomControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 6,
  },
  zoomButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: 32,
    height: 32,
    borderRadius: 16,
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
    left: 10,
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
    gap: 12,
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
    paddingHorizontal: 24,
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
});
