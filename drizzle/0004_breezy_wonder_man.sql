PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expense_item_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_expense_item_categories`("id", "name", "created_at", "updated_at", "deleted_at") SELECT "id", "name", "created_at", "updated_at", "deleted_at" FROM `expense_item_categories`;--> statement-breakpoint
DROP TABLE `expense_item_categories`;--> statement-breakpoint
ALTER TABLE `__new_expense_item_categories` RENAME TO `expense_item_categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;