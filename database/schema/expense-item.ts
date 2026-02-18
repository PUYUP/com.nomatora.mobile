import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const expenseItems = sqliteTable(
    "expense_items", {
        id: text("id").primaryKey().notNull(),
        expense_id: text("expense_id").notNull(),

        name: text("name").notNull(),
        category: text("category"),
        price: real("price").notNull(),
        quantity: integer("quantity").default(1),

        place_name: text("place_name"),
        latitude: real("latitude"),
        longitude: real("longitude"),

        created_at: integer("created_at").notNull(),
        updated_at: integer("updated_at").notNull(),
        deleted_at: integer("deleted_at"),

        sync_status: text("sync_status")
            .notNull()
            .default("pending"),
    },
    (table) => [
        index("expense_items_expense_id_idx").on(table.expense_id),
        index("expense_items_sync_status_idx").on(table.sync_status),
    ]
);