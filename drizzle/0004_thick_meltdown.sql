CREATE TABLE `vaccinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`vaccineName` varchar(255) NOT NULL,
	`laboratory` varchar(255),
	`lotNumber` varchar(100),
	`doseNumber` varchar(50),
	`applicationDate` date NOT NULL,
	`nextDoseDate` date,
	`status` enum('aplicada','programada','vencida') NOT NULL DEFAULT 'aplicada',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vaccinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pets` ADD `patientType` enum('seguimiento','visita_unica') DEFAULT 'visita_unica';--> statement-breakpoint
ALTER TABLE `pets` ADD `environment` enum('interior','exterior','mixto');--> statement-breakpoint
ALTER TABLE `pets` ADD `livesWithOtherAnimals` boolean;--> statement-breakpoint
ALTER TABLE `pets` ADD `otherAnimalsDetails` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `dietType` enum('balanceado','casera','mixta','barf','otra');--> statement-breakpoint
ALTER TABLE `pets` ADD `dietBrand` varchar(255);--> statement-breakpoint
ALTER TABLE `pets` ADD `dietNotes` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `knownAllergies` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `previousDiseases` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `previousSurgeries` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `currentMedication` text;--> statement-breakpoint
ALTER TABLE `pets` ADD `isNeutered` enum('si','no','no_se');--> statement-breakpoint
ALTER TABLE `pets` ADD `behavior` enum('tranquilo','nervioso','agresivo','miedoso','otro');--> statement-breakpoint
ALTER TABLE `pets` ADD `lastDewormingDate` date;--> statement-breakpoint
ALTER TABLE `pets` ADD `dewormingProduct` varchar(255);--> statement-breakpoint
ALTER TABLE `visits` ADD `mucosas` enum('rosadas','palidas','ictericas','cianoticas');--> statement-breakpoint
ALTER TABLE `visits` ADD `hydration` enum('normal','leve','moderada','severa');--> statement-breakpoint
ALTER TABLE `visits` ADD `lymphNodes` enum('normal','aumentados');--> statement-breakpoint
ALTER TABLE `visits` ADD `dentalStatus` enum('bueno','regular','malo');--> statement-breakpoint
ALTER TABLE `vaccinations` ADD CONSTRAINT `vaccinations_petId_pets_id_fk` FOREIGN KEY (`petId`) REFERENCES `pets`(`id`) ON DELETE no action ON UPDATE no action;