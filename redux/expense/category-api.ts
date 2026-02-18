import { getDB } from "@/database/drizzle";
import { itemCategories } from "@/database/schema/expense-item-category";
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";

export const categoryApi = createApi({
    reducerPath: 'categoryApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Category'],
    endpoints: (build) => ({
        // ...
        // Add category        
        // ...
        create: build.mutation<typeof itemCategories.$inferSelect, Partial<typeof itemCategories.$inferInsert>>({
            queryFn: async (category) => {
                const db = await getDB();
                const now = Date.now();
                const [insertedCategory] = await db
                    .insert(itemCategories)
                    .values([{
                        id: Crypto.randomUUID(),
                        name: category.name!,
                        created_at: now,
                        updated_at: now,
                    }])
                    .returning();

                return { data: insertedCategory };
            },
            invalidatesTags: ['Category'],
        }),
        // ...
        // Get all categories
        // ...
        getAll: build.query<typeof itemCategories.$inferSelect[], void>({
            queryFn: async () => {
                const db = await getDB();
                const categories = await db.select().from(itemCategories);
                return { data: categories };
            },
            providesTags: ['Category'],
        }),
        // ...
        // Update category
        // ...
        update: build.mutation<typeof itemCategories.$inferSelect, { id: string, name: string }>({
            queryFn: async ({ id, name }) => {
                const db = await getDB();
                const now = Date.now();
                const [updatedCategory] = await db
                    .update(itemCategories)
                    .set({ name, updated_at: now })
                    .where(eq(itemCategories.id, id))
                    .returning();

                return { data: updatedCategory };
            },
            invalidatesTags: ['Category'],
        }),
         // ...
        // Delete category
        // ...
        delete: build.mutation<{ success: boolean }, string>({
            queryFn: async (id) => {
                const db = await getDB();
                await db.delete(itemCategories).where(eq(itemCategories.id, id));
                return { data: { success: true } };
            },
            invalidatesTags: ['Category'],
        }),
    }),
});

export const { 
    useCreateMutation, 
    useUpdateMutation,
    useDeleteMutation,
    useGetAllQuery
} = categoryApi;