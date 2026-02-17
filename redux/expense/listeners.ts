import { getDB } from "@/database/drizzle";
import { expenses as expensesSchema } from "@/database/schema/expense";
import { expenseItems as expenseItemsSchema } from "@/database/schema/expense-item";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { startAppListening } from '../listener';
import { addItem, removeItem, updateItem } from './slice';

const ensureDraftExpenseId = async (db: Awaited<ReturnType<typeof getDB>>) => {
    const [draft] = await db
        .select({ id: expensesSchema.id })
        .from(expensesSchema)
        .where(eq(expensesSchema.status, "draft"))
        .limit(1);

    if (draft?.id) return draft.id;

    const id = Crypto.randomUUID();
    const now = Date.now();

    await db.insert(expensesSchema).values({
        id,
        status: "draft",
        createdAt: now,
        updatedAt: now,
    });

    return id;
};

startAppListening({
    actionCreator: addItem,
    effect: async (action) => {
        const db = await getDB();
        const expenseId = action.payload.expenseId && action.payload.expenseId !== "temp-expense-id"
            ? action.payload.expenseId
            : await ensureDraftExpenseId(db);

        const item = await db.insert(expenseItemsSchema).values({
            ...action.payload,
            expenseId,
            price: parseFloat(action.payload.price),
        }).onConflictDoUpdate({
            target: expenseItemsSchema.id,
            set: {
                ...action.payload,
                expenseId,
                price: parseFloat(action.payload.price),
            },
        }).returning();

        console.log('Inserted item with ID:', item);
    },
});

startAppListening({
    actionCreator: updateItem,
    effect: async (action) => {
        const db = await getDB();
        const item = await db.update(expenseItemsSchema).set({
            ...action.payload,
            price: parseFloat(action.payload.price),
        }).where(eq(expenseItemsSchema.id, action.payload.id)).returning();

        console.log('Updated item with ID:', item);
    },
});

startAppListening({
    actionCreator: removeItem,
    effect: async (action) => {
        const db = await getDB();
        const item = await db.delete(expenseItemsSchema)
            .where(eq(expenseItemsSchema.id, action.payload))
            .returning();

        console.log('Deleted item with ID:', item);
    },
});

