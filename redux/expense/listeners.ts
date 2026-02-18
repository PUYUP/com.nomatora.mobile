import { getDB } from "@/database/drizzle";
import { expenses as expensesSchema } from "@/database/schema/expense";
import { expenseItems as expenseItemsSchema } from "@/database/schema/expense-item";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { startAppListening } from '../listener';
import { addItem, ExpenseData, getItems, removeItem, updateExpense, updateItem } from './slice';

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
        created_at: now,
        updated_at: now,
    });

    return id;
};

const upsertExpenseMeta = async (
    db: Awaited<ReturnType<typeof getDB>>,
    expenseId: string,
    fields: Partial<ExpenseData>,
) => {
    const now = Date.now();

    // Try update first; if no row, insert draft.
    const updated = await db
        .update(expensesSchema)
        .set({
            place_name: fields.placeName ?? null,
            note: fields.note ?? null,
            latitude: fields.latitude ? parseFloat(fields.latitude) : 0,
            longitude: fields.longitude ? parseFloat(fields.longitude) : 0,
            status: fields.status ?? 'draft',
            updated_at: now,
        })
        .where(eq(expensesSchema.id, expenseId))
        .returning({ id: expensesSchema.id });

    if (updated.length > 0) return updated[0].id;

    await db.insert(expensesSchema).values({
        id: expenseId,
        status: "draft",
        place_name: fields.placeName ?? null,
        note: fields.note ?? null,
        latitude: fields.latitude ? parseFloat(fields.latitude) : 0,
        longitude: fields.longitude ? parseFloat(fields.longitude) : 0,
        created_at: now,
        updated_at: now,
    });

    return expenseId;
};

const subscriptions: Array<() => void> = [];

subscriptions.push(startAppListening({
    actionCreator: addItem,
    effect: async (action) => {
        const db = await getDB();
        const expenseId = action.payload.expenseId && action.payload.expenseId !== "temp-expense-id"
            ? action.payload.expenseId
            : await ensureDraftExpenseId(db);

        const item = await db.insert(expenseItemsSchema).values({
            ...action.payload,
            expense_id: expenseId,
            price: parseFloat(action.payload.price),
            created_at: action.payload.createdAt || Date.now(),
            updated_at: action.payload.updatedAt || Date.now(),
        }).returning();

        console.log('Inserted item with ID:', item);
    },
}));

subscriptions.push(startAppListening({
    actionCreator: updateItem,
    effect: async (action) => {
        const db = await getDB();
        const item = await db.update(expenseItemsSchema).set({
            ...action.payload,
            price: parseFloat(action.payload.price),
            updated_at: Date.now(),
        })
        .where(eq(expenseItemsSchema.id, action.payload.id))
        .returning();

        console.log('Updated item with ID:', item);
    },
}));

subscriptions.push(startAppListening({
    actionCreator: getItems,
    effect: async (action, thunk) => {
        const db = await getDB();
        const expenseId = await ensureDraftExpenseId(db);
        const items = db.select().from(expenseItemsSchema)
            .where(eq(expenseItemsSchema.expense_id, expenseId))
            .all();

        if (items.length > 0) {
            thunk.dispatch({ type: 'expense/setItems', payload: items });
        }
    },
}));

subscriptions.push(startAppListening({
    actionCreator: removeItem,
    effect: async (action) => {
        const db = await getDB();
        const item = await db.delete(expenseItemsSchema)
            .where(eq(expenseItemsSchema.id, action.payload))
            .returning();

        console.log('Deleted item with ID:', item);
    },
}));

subscriptions.push(startAppListening({
    actionCreator: updateExpense,
    effect: async (action) => {
        const db = await getDB();
        const expenseId = await ensureDraftExpenseId(db);

        await upsertExpenseMeta(db, expenseId, {
            placeName: action.payload.placeName,
            note: action.payload.note ? action.payload.note : '',
            latitude: action.payload.latitude,
            longitude: action.payload.longitude,
            status: 'publish',
        });

        console.log('Upserted expense with ID:', expenseId);
    },
}));

export const unsubscribeExpenseListeners = () => {
    while (subscriptions.length) {
        const unsub = subscriptions.pop();
        if (unsub) unsub();
    }
};
