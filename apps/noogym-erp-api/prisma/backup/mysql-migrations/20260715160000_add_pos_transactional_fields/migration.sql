ALTER TABLE `Sale`
  ADD COLUMN `cashSessionId` VARCHAR(191) NULL,
  ADD COLUMN `discountReason` VARCHAR(191) NULL,
  ADD COLUMN `amountReceived` DECIMAL(12, 2) NULL,
  ADD COLUMN `changeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `paymentReference` VARCHAR(191) NULL,
  ADD COLUMN `receiptNumber` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Sale_organizationId_receiptNumber_key` ON `Sale`(`organizationId`, `receiptNumber`);
CREATE INDEX `Sale_cashSessionId_idx` ON `Sale`(`cashSessionId`);

ALTER TABLE `Sale`
  ADD CONSTRAINT `Sale_cashSessionId_fkey`
  FOREIGN KEY (`cashSessionId`) REFERENCES `CashSession`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SaleItem`
  ADD COLUMN `planId` VARCHAR(191) NULL,
  ADD COLUMN `classId` VARCHAR(191) NULL,
  ADD COLUMN `kind` VARCHAR(191) NULL;

CREATE INDEX `SaleItem_planId_idx` ON `SaleItem`(`planId`);
CREATE INDEX `SaleItem_classId_idx` ON `SaleItem`(`classId`);

ALTER TABLE `SaleItem`
  ADD CONSTRAINT `SaleItem_planId_fkey`
  FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SaleItem_classId_fkey`
  FOREIGN KEY (`classId`) REFERENCES `GymClass`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
