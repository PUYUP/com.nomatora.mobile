CREATE TABLE `expense_items` (
	`id` text PRIMARY KEY NOT NULL,
	`expenseId` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`price` real NOT NULL,
	`quantity` integer DEFAULT 1,
	`placeName` text,
	`latitude` real,
	`longitude` real,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	`syncStatus` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expense_items_expense_id_idx` ON `expense_items` (`expenseId`);--> statement-breakpoint
CREATE INDEX `expense_items_sync_status_idx` ON `expense_items` (`syncStatus`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`place_name` text,
	`latitude` real,
	`longitude` real,
	`note` text,
	`currency` text DEFAULT 'USD',
	`total_amount` real DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` integer
);
