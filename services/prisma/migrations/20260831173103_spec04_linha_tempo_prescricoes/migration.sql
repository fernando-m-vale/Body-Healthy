-- CreateTable
CREATE TABLE "PrescriptionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameEncrypted" BYTEA NOT NULL,
    "category" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notesEncrypted" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthDataAccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessedBy" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthDataAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrescriptionEntry_userId_startDate_idx" ON "PrescriptionEntry"("userId", "startDate");

-- CreateIndex
CREATE INDEX "HealthDataAccessLog_userId_accessedAt_idx" ON "HealthDataAccessLog"("userId", "accessedAt");
