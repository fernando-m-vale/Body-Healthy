-- CreateTable
CREATE TABLE "ImagingReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "reportType" TEXT,
    "examDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "aiSummary" TEXT,
    "rawFindings" JSONB,
    "userFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImagingReport_userId_examDate_idx" ON "ImagingReport"("userId", "examDate");
