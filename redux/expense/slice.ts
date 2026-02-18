import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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

const initialState: ExpenseData = {
    items: [],
    placeName: '',
    latitude: '',
    longitude: '',
    status: 'draft',
    note: '',
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
        removeItem: (state, action: PayloadAction<string>) => {
            return {
                ...state,
                items: state.items.filter((item) => item.id !== action.payload),
            };
        },
        getItems: (state, action: PayloadAction<{}>) => {
            return state;
        },
        setItems: (state, action: PayloadAction<ExpenseItemData[]>) => {
            return {
                ...state,
                items: action.payload,
            };
        },
        updateExpense: (state, action: PayloadAction<ExpenseData>) => {
            return {
                ...state,
                ...action.payload,
            };
        },
        resetState: () => {
            return initialState;
        },
    },
});

export const { 
    addItem, 
    updateItem, 
    updateExpense, 
    removeItem, 
    getItems, 
    resetState 
} = expenseSlice.actions;

export default expenseSlice.reducer;