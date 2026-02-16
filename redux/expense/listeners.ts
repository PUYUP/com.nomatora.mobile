import { getDB } from "@/database/drizzle";
import { expenseItems as expenseItemsSchema } from "@/database/schema/expense-item";
import { startAppListening } from '../listener';
import { addItem } from './slice';

startAppListening({
    actionCreator: addItem,
    effect: async (action) => {
        const item = await (await getDB()).insert(expenseItemsSchema).values({
            id: action.payload.id,
            expenseId: 'temp-expense-id',
            name: action.payload.name,
            price: parseFloat(action.payload.price),
            quantity: action.payload.quantity,
            category: action.payload.category,
            createdAt: action.payload.createdAt,
            updatedAt: action.payload.updatedAt,
        }).returning();

        console.log('Inserted item with ID:', item);
    },
})