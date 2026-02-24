CREATE TABLE `amortization_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`periodNumber` int NOT NULL,
	`dueDate` date NOT NULL,
	`principalAmount` decimal(15,2) NOT NULL,
	`interestAmount` decimal(15,2) NOT NULL,
	`totalPayment` decimal(15,2) NOT NULL,
	`remainingBalance` decimal(15,2) NOT NULL,
	`isPaid` boolean NOT NULL DEFAULT false,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `amortization_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `borrowers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(30),
	`address` text,
	`idNumber` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `borrowers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`borrowerId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`interestRate` decimal(8,4) NOT NULL,
	`interestType` enum('simple','compound') NOT NULL DEFAULT 'simple',
	`paymentFrequency` enum('weekly','biweekly','monthly') NOT NULL DEFAULT 'monthly',
	`termPeriods` int NOT NULL,
	`startDate` date NOT NULL,
	`status` enum('active','paid','overdue','cancelled') NOT NULL DEFAULT 'active',
	`notes` text,
	`disbursedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`borrowerId` int NOT NULL,
	`userId` int NOT NULL,
	`scheduleId` int,
	`amount` decimal(15,2) NOT NULL,
	`paymentDate` date NOT NULL,
	`paymentMethod` enum('cash','transfer','check','other') NOT NULL DEFAULT 'cash',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
