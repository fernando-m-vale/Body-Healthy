-- CreateTable
CREATE TABLE "LabExam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "labSource" TEXT,
    "status" TEXT NOT NULL,
    "examDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "LabExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabMarker" (
    "id" TEXT NOT NULL,
    "labExamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "referenceMin" DOUBLE PRECISION,
    "referenceMax" DOUBLE PRECISION,
    "rawExtracted" JSONB NOT NULL,
    "userCorrected" BOOLEAN NOT NULL DEFAULT false,
    "trend" TEXT,

    CONSTRAINT "LabMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabExam_userId_examDate_idx" ON "LabExam"("userId", "examDate");

-- CreateIndex
CREATE INDEX "LabMarker_labExamId_idx" ON "LabMarker"("labExamId");

-- AddForeignKey
ALTER TABLE "LabMarker" ADD CONSTRAINT "LabMarker_labExamId_fkey" FOREIGN KEY ("labExamId") REFERENCES "LabExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
