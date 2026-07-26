-- CreateTable
CREATE TABLE `CashSession` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `gymId` VARCHAR(191) NULL,
    `openedById` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openingAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CashSession_organizationId_status_openedAt_idx`(`organizationId`, `status`, `openedAt`),
    INDEX `CashSession_gymId_status_idx`(`gymId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashClosing` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `closedById` VARCHAR(191) NULL,
    `expectedCash` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `actualCash` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `expectedCard` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `actualCard` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `expectedTransfer` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `actualTransfer` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `expectedMulticaixa` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `actualMulticaixa` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `expectedPix` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `actualPix` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `expectedOther` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `actualOther` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `expectedTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `actualTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `difference` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `closedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CashClosing_sessionId_key`(`sessionId`),
    INDEX `CashClosing_organizationId_closedAt_idx`(`organizationId`, `closedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CashSession` ADD CONSTRAINT `CashSession_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashSession` ADD CONSTRAINT `CashSession_gymId_fkey` FOREIGN KEY (`gymId`) REFERENCES `Gym`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashSession` ADD CONSTRAINT `CashSession_openedById_fkey` FOREIGN KEY (`openedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashClosing` ADD CONSTRAINT `CashClosing_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashClosing` ADD CONSTRAINT `CashClosing_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `CashSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashClosing` ADD CONSTRAINT `CashClosing_closedById_fkey` FOREIGN KEY (`closedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
