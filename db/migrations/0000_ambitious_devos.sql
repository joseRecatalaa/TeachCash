CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`icon` text,
	`color` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `categories_user_idx` ON `categories` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_user_name` ON `categories` (`user_id`,`name`,`parent_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`notes` text,
	`import_hash` text,
	`idempotency_key` text,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tx_user_date_idx` ON `transactions` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `tx_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tx_import_hash` ON `transactions` (`user_id`,`import_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `tx_idempotency_key` ON `transactions` (`user_id`,`idempotency_key`);