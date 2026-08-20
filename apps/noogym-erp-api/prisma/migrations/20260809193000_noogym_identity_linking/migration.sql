-- CreateTable
CREATE TABLE "NoogymIdentity" (
    "id" TEXT NOT NULL,
    "noogymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender" NOT NULL DEFAULT 'NOT_INFORMED',
    "documentNumber" TEXT,
    "avatarUrl" TEXT,
    "qrToken" TEXT,
    "qrTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoogymIdentity_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "noogymIdentityId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NoogymIdentity_noogymId_key" ON "NoogymIdentity"("noogymId");

-- CreateIndex
CREATE UNIQUE INDEX "NoogymIdentity_email_key" ON "NoogymIdentity"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NoogymIdentity_phone_key" ON "NoogymIdentity"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "NoogymIdentity_documentNumber_key" ON "NoogymIdentity"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "NoogymIdentity_qrToken_key" ON "NoogymIdentity"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_noogymIdentityId_key" ON "Member"("organizationId", "noogymIdentityId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_noogymIdentityId_fkey" FOREIGN KEY ("noogymIdentityId") REFERENCES "NoogymIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
