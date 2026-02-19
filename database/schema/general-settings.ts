import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
;
export const generalSettings = sqliteTable("general_settings", {
  id: text("id").primaryKey().notNull(),
  key: text("key").notNull().unique(),
  value: text("value"),

  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
  deleted_at: integer("deleted_at"),
});