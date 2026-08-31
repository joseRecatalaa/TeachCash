DROP INDEX `categories_user_name`;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_user_name` ON `categories` (`user_id`,`name`);--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `parent_id`;