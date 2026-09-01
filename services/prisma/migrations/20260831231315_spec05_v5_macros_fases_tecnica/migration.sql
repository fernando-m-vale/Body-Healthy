-- AlterTable
ALTER TABLE "HealthCycle" ADD COLUMN     "carbGramsGoal" INTEGER,
ADD COLUMN     "fatGramsGoal" INTEGER,
ADD COLUMN     "proteinGramsGoal" INTEGER;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "technique" TEXT;

-- CreateTable
CREATE TABLE "CyclePhase" (
    "id" TEXT NOT NULL,
    "healthCycleId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "phaseLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "focusText" TEXT NOT NULL,

    CONSTRAINT "CyclePhase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CyclePhase_healthCycleId_orderIndex_idx" ON "CyclePhase"("healthCycleId", "orderIndex");

-- AddForeignKey
ALTER TABLE "CyclePhase" ADD CONSTRAINT "CyclePhase_healthCycleId_fkey" FOREIGN KEY ("healthCycleId") REFERENCES "HealthCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
