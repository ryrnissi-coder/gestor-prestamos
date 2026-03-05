ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','client') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `borrowerId` int;