ALTER TABLE `amortization_schedule` MODIFY COLUMN `principalAmount` decimal(15,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `amortization_schedule` MODIFY COLUMN `interestAmount` decimal(15,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `amortization_schedule` MODIFY COLUMN `totalPayment` decimal(15,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `amortization_schedule` MODIFY COLUMN `remainingBalance` decimal(15,2) NOT NULL DEFAULT '0.00';