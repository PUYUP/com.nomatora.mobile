import { getDB } from "@/database/drizzle";
import { trackingSession } from "@/database/schema/tracking";
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { desc, eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";

export interface TrackingPayload {
    id: string; // UUID string
    user_id: string;
    mode: string | null; // e.g., 'car', 'walk', 'bike', or null for unknown
    name: string;
    visibility: string; // private | public | unlisted
    started_at: number; // timestamp
    ended_at?: number; // timestamp
}

export type TrackingResponse = typeof trackingSession.$inferSelect;

export const trackingApi = createApi({
    reducerPath: 'trackingApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Tracking'],
    endpoints: (build) => ({
        // ...
        // Create a new tracking session
        // ...
        create: build.mutation<typeof trackingSession.$inferSelect, Omit<TrackingPayload, 'id'>>({
            async queryFn(payload) {
                try {
                    const db = await getDB();
                    const id = Crypto.randomUUID() as string;
                    const [session] = await db.insert(trackingSession).values({
                        id,
                        user_id: payload.user_id,
                        mode: payload.mode,
                        name: payload.name,
                        visibility: payload.visibility,
                        started_at: new Date(payload.started_at).getTime(),
                        ...(payload.ended_at !== undefined && { ended_at: new Date(payload.ended_at).getTime() }),
                    } satisfies typeof trackingSession.$inferInsert ).returning();

                    return { data: session as TrackingResponse };
                } catch (error) {
                    return { error: error instanceof Error ? error.message : 'Unknown error' };
                }
            },
            invalidatesTags: ['Tracking'],
        }),
        // ...
        // Get tracking sessions
        // ...
        get: build.query<typeof trackingSession.$inferSelect[], { user_id: string }>({
            async queryFn({ user_id }) {
                try {
                    const db = await getDB();
                    const sessions = await db.select()
                        .from(trackingSession)
                        .where(eq(trackingSession.user_id, user_id))
                        .orderBy(desc(trackingSession.started_at));
                    return { data: sessions as TrackingResponse[] };
                } catch (error) {
                    return { error: error instanceof Error ? error.message : 'Unknown error' };
                }
            },
            providesTags: ['Tracking'],
        }),
    }),
});

export const { useCreateMutation, useGetQuery } = trackingApi;