CREATE TABLE `whatsapp_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`waId` varchar(50) NOT NULL,
	`contactName` varchar(255),
	`ownerId` int,
	`status` enum('active','closed','archived') NOT NULL DEFAULT 'active',
	`lastMessageAt` timestamp,
	`aiEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`waMessageId` varchar(255),
	`direction` enum('incoming','outgoing') NOT NULL,
	`messageType` varchar(50) NOT NULL DEFAULT 'text',
	`body` text,
	`metadata` text,
	`status` enum('sent','delivered','read','failed','received') NOT NULL DEFAULT 'sent',
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`aiAutoReply` boolean NOT NULL DEFAULT true,
	`businessName` varchar(255) DEFAULT 'Dra Branda Veterinaria',
	`welcomeMessage` text,
	`outsideHoursMessage` text,
	`businessHoursStart` varchar(5) DEFAULT '09:00',
	`businessHoursEnd` varchar(5) DEFAULT '18:00',
	`workDays` varchar(20) DEFAULT '1,2,3,4,5',
	`quickReplies` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD CONSTRAINT `whatsapp_conversations_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_conversationId_whatsapp_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `whatsapp_conversations`(`id`) ON DELETE no action ON UPDATE no action;