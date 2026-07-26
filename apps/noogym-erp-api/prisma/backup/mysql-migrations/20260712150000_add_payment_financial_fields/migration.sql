ALTER TABLE `Payment`
  ADD COLUMN `grossAmount` DECIMAL(12, 2) NULL,
  ADD COLUMN `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `lateFeeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `outstandingAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `receiptNumber` VARCHAR(191) NULL;

UPDATE `Payment`
SET `grossAmount` = `amount`
WHERE `grossAmount` IS NULL;

CREATE UNIQUE INDEX `Payment_organizationId_receiptNumber_key` ON `Payment`(`organizationId`, `receiptNumber`);
