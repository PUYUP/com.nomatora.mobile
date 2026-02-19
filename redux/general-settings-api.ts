import { getDB } from "@/database/drizzle";
import { generalSettings } from "@/database/schema";
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";

export const generalSettingsApi = createApi({
    reducerPath: 'generalSettingsApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['GeneralSettings'],
    endpoints: (build) => ({
        // ...
        // Create or update general settings
        // ...
        upsert: build.mutation<typeof generalSettings.$inferSelect, { key: string, value: string }>({
            queryFn: async ({ key, value }) => {
                const db = await getDB();
                const now = Date.now();

                // Check if a setting with the given key already exists
                const existingSettings = await db
                    .select()
                    .from(generalSettings)
                    .where(eq(generalSettings.key, key))
                    .limit(1);

                let result;
                if (existingSettings.length > 0) {
                    // Update existing setting
                    const existing = existingSettings[0];
                    [result] = await db
                        .update(generalSettings)
                        .set({ value, updated_at: now })
                        .where(eq(generalSettings.id, existing.id))
                        .returning();
                } else {
                    // Insert new setting
                    [result] = await db
                        .insert(generalSettings)
                        .values({
                            id: Crypto.randomUUID(),
                            key,
                            value,
                            created_at: now,
                            updated_at: now,
                        })
                        .returning();
                }

                return { data: result };
            },
            invalidatesTags: ['GeneralSettings'],
        }),
        // ...
        // Get general setting by key
        // ...
        getByKey: build.query<typeof generalSettings.$inferSelect, string>({
            queryFn: async (key) => {
                const db = await getDB();
                const settings = await db
                    .select()
                    .from(generalSettings)
                    .where(eq(generalSettings.key, key))
                    .limit(1);

                return { data: settings[0] || null };
            },
            providesTags: ['GeneralSettings'],
        }),
        // ...
        // Delete general setting by key
        // ...
        deleteByKey: build.mutation<{ success: boolean }, string>({
            queryFn: async (key) => {
                const db = await getDB();
                await db.delete(generalSettings).where(eq(generalSettings.key, key));
                return { data: { success: true } };
            },
            invalidatesTags: ['GeneralSettings'],
        }),
        // ...
        // ... Get all general settings
        // ...
        getAll: build.query<typeof generalSettings.$inferSelect[], void>({
            queryFn: async () => {
                const db = await getDB();
                const settings = await db.select().from(generalSettings);
                return { data: settings };
            },
            providesTags: ['GeneralSettings'],
        }),
    }),
});

export const { 
    useUpsertMutation, 
    useGetByKeyQuery, 
    useDeleteByKeyMutation, 
    useGetAllQuery 
} = generalSettingsApi;