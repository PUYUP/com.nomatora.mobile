import { CoordsData } from '@/models/location'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MapPickerState {
  activeRequestId: string | null
  locations: Record<string, CoordsData | undefined>
}

const initialState: MapPickerState = {
  activeRequestId: null,
  locations: {},
}

export const mapPickerSlice = createSlice({
  name: 'mapPicker',
  initialState,
  reducers: {
    openMap: (state, action: PayloadAction<{ requestId: string }>) => {
      state.activeRequestId = action.payload.requestId
    },

    setLocation: (
      state,
      action: PayloadAction<{ requestId: string; location: CoordsData }>
    ) => {
      state.locations[action.payload.requestId] = action.payload.location
    },

    clearLocation: (state, action: PayloadAction<{ requestId: string }>) => {
      delete state.locations[action.payload.requestId]
    },

    closeMap: (state) => {
      state.activeRequestId = null
    },
  },
})

export const {
  openMap,
  setLocation,
  clearLocation,
  closeMap,
} = mapPickerSlice.actions

export default mapPickerSlice.reducer