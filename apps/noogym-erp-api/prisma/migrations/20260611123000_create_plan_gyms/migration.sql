CREATE TABLE `PlanGym` (
  `id` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `gymId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PlanGym_planId_gymId_key`(`planId`, `gymId`),
  INDEX `PlanGym_gymId_idx`(`gymId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlanGym`
  ADD CONSTRAINT `PlanGym_planId_fkey`
  FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlanGym`
  ADD CONSTRAINT `PlanGym_gymId_fkey`
  FOREIGN KEY (`gymId`) REFERENCES `Gym`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
