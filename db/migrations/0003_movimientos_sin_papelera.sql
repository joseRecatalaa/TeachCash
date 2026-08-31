PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`notes` text,
	`import_hash` text,
	`idempotency_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Se deja fuera lo que estaba en la papelera (`deleted_at` no nulo): el
-- borrado deja de ser lógico y pasa a ser físico, así que migrar es el
-- momento de purgarla de verdad. Un movimiento vivo sin categoría haría
-- fallar el INSERT contra el NOT NULL de abajo a propósito: mejor que la
-- migración pare y avise a que borre en silencio un movimiento real.
INSERT INTO `__new_transactions`("id", "user_id", "category_id", "amount", "date", "description", "notes", "import_hash", "idempotency_key", "created_at") SELECT "id", "user_id", "category_id", "amount", "date", "description", "notes", "import_hash", "idempotency_key", "created_at" FROM `transactions` WHERE `deleted_at` IS NULL;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `tx_user_date_idx` ON `transactions` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `tx_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tx_import_hash` ON `transactions` (`user_id`,`import_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `tx_idempotency_key` ON `transactions` (`user_id`,`idempotency_key`);