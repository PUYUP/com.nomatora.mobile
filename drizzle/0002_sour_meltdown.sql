PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expense_items` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`price` real NOT NULL,
	`quantity` integer DEFAULT 1,
	`place_name` text,
	`latitude` real,
	`longitude` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_expense_items`("id", "expense_id", "name", "category", "price", "quantity", "place_name", "latitude", "longitude", "created_at", "updated_at", "deleted_at", "sync_status") SELECT "id", "expense_id", "name", "category", "price", "quantity", "place_name", "latitude", "longitude", "created_at", "updated_at", "deleted_at", "sync_status" FROM `expense_items`;--> statement-breakpoint
DROP TABLE `expense_items`;--> statement-breakpoint
ALTER TABLE `__new_expense_items` RENAME TO `expense_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `expense_items_expense_id_idx` ON `expense_items` (`expense_id`);--> statement-breakpoint
CREATE INDEX `expense_items_sync_status_idx` ON `expense_items` (`sync_status`);