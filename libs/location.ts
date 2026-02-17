import * as Location from 'expo-location'
import { Alert, Linking, Platform, ToastAndroid } from 'react-native'

export type LocationSuccess = {
  coords: {
    latitude: number
    longitude: number
    accuracy: number | null
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }
  timestamp: number
}

export type LocationError = {
  code:
    | 'PERMISSION_DENIED'
    | 'PERMISSION_UNDETERMINED'
    | 'SERVICES_DISABLED'
    | 'TIMEOUT'
    | 'UNAVAILABLE'
  message: string
}

export type LocationResult =
  | { ok: true; data: LocationSuccess }
  | { ok: false; error: LocationError }

export type ReverseGeocodeSuccess = {
  name: string
  details: Location.LocationGeocodedAddress
}

export type ReverseGeocodeResult =
  | { ok: true; data: ReverseGeocodeSuccess }
  | { ok: false; error: LocationError }

export type PermissionResult =
  | { ok: true }
  | { ok: false; error: LocationError }

// Opens the system settings screen; safe to call from other components.
export const openLocationSettings = () => {
  Linking.openSettings().catch(() => {})
}

// Notify the user and open system settings to enable location.
export const openLocationSettingsWithToast = (message = 'Enable location permission in Settings.') => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG)
  } else {
    Alert.alert('Enable Location', message)
  }
  openLocationSettings()
}

const normalizeError = (error: unknown): LocationError => {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('timeout')) {
      return { code: 'TIMEOUT', message: error.message }
    }
    return { code: 'UNAVAILABLE', message: error.message }
  }

  return { code: 'UNAVAILABLE', message: 'Unable to fetch location.' }
}

export const requestLocationPermission = async (): Promise<PermissionResult> => {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync()
    if (!servicesEnabled) {
      return {
        ok: false,
        error: {
          code: 'SERVICES_DISABLED',
          message: 'Location services are disabled. Please enable GPS.',
        },
      }
    }

    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync()

    if (status === Location.PermissionStatus.GRANTED) {
      return { ok: true }
    }

    if (status === Location.PermissionStatus.DENIED && !canAskAgain) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Location permission denied. Enable it in Settings.',
        },
      }
    }

    const request = await Location.requestForegroundPermissionsAsync()

    if (request.status !== Location.PermissionStatus.GRANTED) {
      if (!request.canAskAgain) {
        openLocationSettingsWithToast()
      }
      return {
        ok: false,
        error: {
          code: request.canAskAgain ? 'PERMISSION_UNDETERMINED' : 'PERMISSION_DENIED',
          message: 'Location permission not granted.',
        },
      }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, error: normalizeError(error) }
  }
}

export const getCurrentLocation = async (
  options?: Location.LocationOptions,
): Promise<LocationResult> => {
  try {
    const permission = await requestLocationPermission()
    if (!permission.ok) {
      return permission
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      timeInterval: 1000,
      ...options,
    })

    return {
      ok: true,
      data: {
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? null,
          altitude: location.coords.altitude ?? null,
          altitudeAccuracy: location.coords.altitudeAccuracy ?? null,
          heading: location.coords.heading ?? null,
          speed: location.coords.speed ?? null,
        },
        timestamp: location.timestamp,
      },
    }
  } catch (error) {
    return { ok: false, error: normalizeError(error) }
  }
}

export const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude })

    if (!results.length) {
      return {
        ok: false,
        error: { code: 'UNAVAILABLE', message: 'No address found for location.' },
      }
    }

    const address = results[0]
    const parts = [
      address.name,
      address.street,
      address.city,
      address.region,
      address.postalCode,
      address.country,
    ].filter(Boolean)

    return {
      ok: true,
      data: {
        name: parts.join(', '),
        details: address,
      },
    }
  } catch (error) {
    return { ok: false, error: normalizeError(error) }
  }
}
