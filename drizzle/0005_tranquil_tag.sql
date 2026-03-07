CREATE TABLE `client_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`borrowerId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`invitationToken` varchar(64) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_invitations_invitationToken_unique` UNIQUE(`invitationToken`)
);
