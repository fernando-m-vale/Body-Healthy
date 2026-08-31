-- CreateTable
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDeletionAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataExportRequest_userId_requestedAt_idx" ON "DataExportRequest"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_userId_requestedAt_idx" ON "AccountDeletionRequest"("userId", "requestedAt");
