import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const expenseItems = sqliteTable(
    "expense_items", {
        id: text("id").primaryKey().notNull(),
        expenseId: text("expenseId").notNull(),

        name: text("name").notNull(),
        category: text("category"),
        price: real("price").notNull(),
        quantity: integer("quantity").default(1),

        placeName: text("placeName"),
        latitude: real("latitude"),
        longitude: real("longitude"),

        createdAt: integer("createdAt").notNull(),
        updatedAt: integer("updatedAt").notNull(),
        deletedAt: integer("deletedAt"),

        syncStatus: text("syncStatus")
            .notNull()
            .default("pending"),
    },
    (table) => [
        index("expense_items_expense_id_idx").on(table.expenseId),
        index("expense_items_sync_status_idx").on(table.syncStatus),
    ]
);