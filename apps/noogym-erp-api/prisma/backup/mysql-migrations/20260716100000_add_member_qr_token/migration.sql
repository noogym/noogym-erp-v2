ALTER TABLE `Member`
  ADD COLUMN `qrToken` VARCHAR(191) NULL,
  ADD COLUMN `qrTokenUpdatedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Member_qrToken_key` ON `Member`(`qrToken`);
