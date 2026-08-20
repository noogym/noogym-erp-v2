CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "queue" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "result" JSONB,
    "dedupeKey" TEXT,
    "referenceId" TEXT,
    "jobId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BackgroundJob_dedupeKey_key" ON "BackgroundJob"("dedupeKey");
CREATE INDEX "BackgroundJob_queue_status_scheduledAt_idx" ON "BackgroundJob"("queue", "status", "scheduledAt");
CREATE INDEX "BackgroundJob_organizationId_name_idx" ON "BackgroundJob"("organizationId", "name");
CREATE INDEX "BackgroundJob_referenceId_idx" ON "BackgroundJob"("referenceId");
