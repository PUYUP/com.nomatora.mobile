export interface CoordsData {
    latitude: number
    longitude: number
    accuracy: number | null
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
    timestamp: number
    placeName: string
}

export interface PlaceData {
    properties: {
        name: string
    }
    geometry: {
        coordinate: {
            latitude: number
            longitude: number
        }
    }
}

export interface SlidePointData {
    latitude: number
    longitude: number
    title: string
    placeName?: string
    description?: string
    arrivedAt?: string
    type: 'expense' | 'origin' | 'destination' | 'poi' | 'restaurant' | 'mall' | 'station' | 'stadium' | 'beach' | 'park' | 'airport'
}