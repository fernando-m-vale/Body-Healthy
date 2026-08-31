-- CreateTable
CREATE TABLE "BioimpedanceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "leanMassKg" DOUBLE PRECISION,
    "extraMetrics" JSONB,
    "deviceName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BioimpedanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BioimpedanceEntry_userId_measuredAt_idx" ON "BioimpedanceEntry"("userId", "measuredAt");
