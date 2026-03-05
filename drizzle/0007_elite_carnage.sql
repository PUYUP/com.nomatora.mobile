CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`address` text,
	`category` text
);
--> statement-breakpoint
ALTER TABLE `tracking_session` ADD `name` text;--> statement-breakpoint
ALTER TABLE `tracking_session` ADD `visibility` text DEFAULT 'public' NOT NULL;