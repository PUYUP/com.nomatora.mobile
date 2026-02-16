import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ExpenseItemData {
    id: string;
    timestamp: number;
    name: string;
    price: string;
    category?: string;
    quantity: number;
}

export interface ExpenseData {
    items: ExpenseItemData[];
    placeName: string;
    note?: string;
}

const initialState: ExpenseData = {
    items: [],
    placeName: '',
};

export const expenseSlice = createSlice({
    name: 'expense',
    initialState,
    reducers: {
        addItem: (state, action: PayloadAction<ExpenseItemData>) => {
            return {
                ...state,
                items: [action.payload, ...state.items],
            };
        },
        updateItem: (state, action: PayloadAction<ExpenseItemData>) => {
            const idx = state.items.findIndex((item) => item.id == action.payload.id);
            if (idx !== -1) {
                state = {
                    ...state,
                    items: [
                        ...state.items.slice(0, idx),
                        {
                            ...state.items[idx],
                            ...action.payload,
                        },
                        ...state.items.slice(idx + 1),
                    ],
                }
            }

            return state;
        },
        updateExpense: (state, action: PayloadAction<ExpenseData>) => {
            return {
                ...state,
                ...action.payload,
            };
        },
        removeItem: (state, action: PayloadAction<string>) => {
            return {
                ...state,
                items: state.items.filter((item) => item.id !== action.payload),
            };
        },
        resetState: () => {
            return initialState;
        },
    },
});

export const { addItem, updateItem, updateExpense, removeItem, resetState } = expenseSlice.actions;

export default expenseSlice.reducer;