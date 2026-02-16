export interface ExpenseItemData {
    id: string;
    name: string;
    price: number;
    category?: string;
    subtitle?: string;
}

export interface EditorItemDraft {
    id: string | null;
    name: string;
    price: string;
    category: string | null;
}
