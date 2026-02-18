import { getDB } from '@/database/drizzle';
import { expenses as expensesSchema } from "@/database/schema/expense";
import { expenseItems } from '@/database/schema/expense-item';
import { itemCategories } from "@/database/schema/expense-item-category";
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { desc, eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";

export interface ExpenseItemData {
    id: string;
    expenseId: string;
    timestamp: number;
    name: string;
    price: string;
    quantity: number;
    category?: string;
    createdAt: number;
    updatedAt: number;
}

export interface ExpenseData {
    items: ExpenseItemData[];
    placeName: string;
    latitude: string;
    longitude: string | null;
    status: 'draft' | 'publish';
    note?: string;
}

export type ItemResponse = typeof expenseItems.$inferSelect & {
  category_name: string | null;
};

const ensureDraftExpense = async (db: Awaited<ReturnType<typeof getDB>>): Promise<typeof expensesSchema.$inferSelect> => {
    const drafts = await db
        .select()
        .from(expensesSchema)
        .where(eq(expensesSchema.status, "draft"))
        .limit(1);

    if (drafts.length > 0) return drafts[0];

    const id = Crypto.randomUUID();
    const now = Date.now();
    const [expense] = await db.insert(expensesSchema).values({
        id,
        status: "draft",
        created_at: now,
        updated_at: now,
    }).returning();

    return expense as typeof expensesSchema.$inferSelect;
};

export const expenseApi = createApi({
    reducerPath: 'expenseApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Expense'],
    endpoints: (build) => ({
        // ...
        // Create or get draft expense
        // ...
        create: build.mutation<typeof expensesSchema.$inferSelect, void>({
            queryFn: async () => {
                const db = await getDB();
                const expense = await ensureDraftExpense(db);
                return { data: expense };
            },
            invalidatesTags: ['Expense'],
        }),
        // ...
        // Update expense meta (place, note, etc.)
        // ...
        updateExpense: build.mutation<typeof expensesSchema.$inferSelect, { id: string, payload: Partial<typeof expensesSchema.$inferSelect> }>({
            queryFn: async ({ id, payload }) => {
                const db = await getDB();
                const [updatedExpense] = await db
                    .update(expensesSchema).set({
                        ...payload,
                        updated_at: Date.now(),
                    })
                    .where(eq(expensesSchema.id, id))
                    .returning();
                
                return { data: updatedExpense };
            },
            invalidatesTags: ['Expense'],
        }),
        // ...
        // Get draft expense
        // ...
        getDraftedExpense: build.query<typeof expensesSchema.$inferSelect, void>({
            queryFn: async () => {
                const db = await getDB();
                const expense = await ensureDraftExpense(db);
                return { data: expense };
            },
            providesTags: ['Expense'],
        }),
        // ...
        // Add item
        // ..
        addItem: build.mutation<typeof expenseItems.$inferSelect, Omit<typeof expenseItems.$inferInsert, 'id'>>({
            queryFn: async (item) => {
                const db = await getDB();
                const [newItem] = await db.insert(expenseItems)
                    .values({
                        ...item,
                        id: Crypto.randomUUID(),
                    })
                    .returning();

                return { data: newItem };
            },
            invalidatesTags: ['Expense'],
        }),
        // ...
        // Bulk add items
        // ...
        addItems: build.mutation<typeof expenseItems.$inferSelect[], { items: Omit<typeof expenseItems.$inferInsert, 'id'>[] }>({
            queryFn: async ({ items }) => {
                const db = await getDB();
                const itemsWithIds = items.map(item => ({
                    ...item,
                    id: Crypto.randomUUID(),
                }));
                const newItems = await db.insert(expenseItems)
                    .values(itemsWithIds)
                    .returning();

                return { data: newItems };
            },
            invalidatesTags: ['Expense'],
        }),
        // ...
        // Update item
        // ...
        updateItem: build.mutation<typeof expenseItems.$inferSelect, { id: string, payload: Partial<typeof expenseItems.$inferSelect> }>({
            queryFn: async ({ id, payload }) => {
                const db = await getDB();
                const [updatedItem] = await db
                    .update(expenseItems).set({
                        ...payload,
                        updated_at: Date.now(),
                    })
                    .where(eq(expenseItems.id, id))
                    .returning();

                return { data: updatedItem };
            },
            invalidatesTags: ['Expense'],
        }),
        // ...
        // Delete item
        // ...
        deleteItem: build.mutation<{ success: boolean }, string>({
            queryFn: async (id) => {
                const db = await getDB();
                await db.delete(expenseItems)
                    .where(eq(expenseItems.id, id))
                    .returning();

                return { data: { success: true } };
            },
            invalidatesTags: ['Expense'],
        }),
        // ...
        // Get items for an expense
        // ...
        getItems: build.query<ItemResponse[], string>({
            queryFn: async (expenseId) => {
                const db = await getDB();
                const results = await db
                    .select()
                    .from(expenseItems)
                    .leftJoin(itemCategories, eq(itemCategories.id, expenseItems.category))
                    .where(eq(expenseItems.expense_id, expenseId))
                    .orderBy(desc(expenseItems.created_at));

                const items = results.map(result => ({
                    ...result.expense_items,
                    category_name: result.expense_item_categories?.name ?? null,
                }));

                return { data: items };
            },
            providesTags: ['Expense'],
        }),
    }),
});

export const { 
    useCreateMutation, 
    useUpdateExpenseMutation,
    useGetDraftedExpenseQuery,
    useAddItemMutation, 
    useAddItemsMutation,
    useUpdateItemMutation, 
    useDeleteItemMutation, 
    useGetItemsQuery 
} = expenseApi;