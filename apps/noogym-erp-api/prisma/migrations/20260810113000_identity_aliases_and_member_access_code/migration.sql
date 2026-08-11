-- CreateEnum
CREATE TYPE "NoogymIdentityAliasType" AS ENUM ('NOOGYM_ID', 'QR_TOKEN', 'BARCODE', 'CARD');

-- AlterEnum
ALTER TYPE "CheckInMethod" ADD VALUE IF NOT EXISTS 'BARCODE';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "accessCode" TEXT;

-- CreateTable
CREATE TABLE "NoogymIdentityAlias" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "type" "NoogymIdentityAliasType" NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoogymIdentityAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoogymIdentityAlias_type_value_key" ON "NoogymIdentityAlias"("type", "value");

-- CreateIndex
CREATE INDEX "NoogymIdentityAlias_identityId_type_isActive_idx" ON "NoogymIdentityAlias"("identityId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_accessCode_key" ON "Member"("organizationId", "accessCode");

-- AddForeignKey
ALTER TABLE "NoogymIdentityAlias" ADD CONSTRAINT "NoogymIdentityAlias_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "NoogymIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
