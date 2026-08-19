CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'RETRYING', 'SENT', 'FAILED');

CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT,
    "html" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "jobId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "metadata" JSONB,
    "messageId" TEXT,
    "messageRecipientId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDelivery_status_queuedAt_idx" ON "EmailDelivery"("status", "queuedAt");
CREATE INDEX "EmailDelivery_organizationId_status_idx" ON "EmailDelivery"("organizationId", "status");
CREATE INDEX "EmailDelivery_messageId_idx" ON "EmailDelivery"("messageId");
CREATE INDEX "EmailDelivery_messageRecipientId_idx" ON "EmailDelivery"("messageRecipientId");

ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_messageRecipientId_fkey" FOREIGN KEY ("messageRecipientId") REFERENCES "MessageRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
