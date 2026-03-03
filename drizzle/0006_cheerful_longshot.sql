CREATE TABLE `tracking_points` (
	`session_id` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`speed` real,
	`bearing` real,
	`elevation` real,
	`accuracy` real,
	PRIMARY KEY(`session_id`, `recorded_at`)
);
--> statement-breakpoint
CREATE INDEX `tracking_points_session_idx` ON `tracking_points` (`session_id`);--> statement-breakpoint
CREATE INDEX `tracking_points_recorded_at_idx` ON `tracking_points` (`recorded_at`);--> statement-breakpoint
CREATE TABLE `tracking_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mode` text,
	`started_at` integer NOT NULL,
	`ended_at` integer
);
