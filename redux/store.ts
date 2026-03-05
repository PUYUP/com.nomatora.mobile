import { configureStore } from '@reduxjs/toolkit';
import { mapPickerSlice } from './map-picker-slice';

// call the listeners so that they are registered
import { categoryApi } from './expense/category-api';
import { expenseApi } from './expense/expense-api';
import { generalSettingsApi } from './general-settings-api';
import { trackingApi } from './tracking/tracking-api';

export const store = configureStore({
    reducer: {
        mapPicker: mapPickerSlice.reducer,
        [expenseApi.reducerPath]: expenseApi.reducer,
        [categoryApi.reducerPath]: categoryApi.reducer,
        [generalSettingsApi.reducerPath]: generalSettingsApi.reducer,
        [trackingApi.reducerPath]: trackingApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            expenseApi.middleware,
            categoryApi.middleware,
            generalSettingsApi.middleware,
            trackingApi.middleware,
        ),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch