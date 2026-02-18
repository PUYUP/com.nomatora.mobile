import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const itemCategories = sqliteTable("expense_item_categories", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),

  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
  deleted_at: integer("deleted_at"),
});