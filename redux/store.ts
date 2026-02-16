import { configureStore } from '@reduxjs/toolkit';
import { expenseSlice } from './expense/slice';
import { listenerMiddleware } from './listener';

import './expense/listeners';

export const store = configureStore({
    reducer: {
        expense: expenseSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(listenerMiddleware.middleware),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch