CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int,
	`ownerId` int,
	`clientName` varchar(255),
	`clientPhone` varchar(50),
	`clientEmail` varchar(320),
	`petName` varchar(255),
	`petSpecies` varchar(100),
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`reason` text,
	`address` text,
	`status` enum('pendiente','confirmado','completado','cancelado') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`visitId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50),
	`email` varchar(320),
	`address` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int,
	`appointmentId` int,
	`ownerId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'ARS',
	`method` enum('efectivo','transferencia','otro') NOT NULL,
	`status` enum('pagado','pendiente','parcial') NOT NULL DEFAULT 'pendiente',
	`paidAt` timestamp,
	`description` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`species` varchar(100) NOT NULL,
	`breed` varchar(100),
	`birthDate` date,
	`sex` enum('macho','hembra','desconocido') DEFAULT 'desconocido',
	`color` varchar(100),
	`weight` decimal(5,2),
	`microchip` varchar(100),
	`photoUrl` text,
	`photoKey` text,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visit_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visit_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`ownerId` int NOT NULL,
	`visitDate` timestamp NOT NULL,
	`reason` text NOT NULL,
	`diagnosis` text,
	`treatment` text,
	`medications` text,
	`nextSteps` text,
	`weight` decimal(5,2),
	`temperature` decimal(4,1),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_petId_pets_id_fk` FOREIGN KEY (`petId`) REFERENCES `pets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_visitId_visits_id_fk` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_visitId_visits_id_fk` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pets` ADD CONSTRAINT `pets_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visit_attachments` ADD CONSTRAINT `visit_attachments_visitId_visits_id_fk` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visits` ADD CONSTRAINT `visits_petId_pets_id_fk` FOREIGN KEY (`petId`) REFERENCES `pets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visits` ADD CONSTRAINT `visits_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;