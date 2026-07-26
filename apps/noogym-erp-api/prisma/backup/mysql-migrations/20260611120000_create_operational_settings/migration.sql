CREATE TABLE `OperationalSetting` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `settings` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `OperationalSetting_organizationId_key`(`organizationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OperationalSetting`
  ADD CONSTRAINT `OperationalSetting_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
