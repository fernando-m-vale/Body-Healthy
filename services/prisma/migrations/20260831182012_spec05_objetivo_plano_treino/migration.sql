-- CreateTable
CREATE TABLE "HealthCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectiveText" TEXT NOT NULL,
    "objectiveCategory" TEXT,
    "status" TEXT NOT NULL,
    "actionPlanText" TEXT,
    "dailyCalorieGoal" INTEGER,
    "nextCycleExpectedDate" TIMESTAMP(3),
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "HealthCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleFeedback" (
    "id" TEXT NOT NULL,
    "healthCycleId" TEXT NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredRegeneration" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CycleFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "healthCycleId" TEXT NOT NULL,
    "userEdited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "dayLabel" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "restSeconds" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthCycle_userId_createdAt_idx" ON "HealthCycle"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CycleFeedback_healthCycleId_createdAt_idx" ON "CycleFeedback"("healthCycleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutPlan_healthCycleId_key" ON "WorkoutPlan"("healthCycleId");

-- CreateIndex
CREATE INDEX "WorkoutExercise_workoutPlanId_dayLabel_orderIndex_idx" ON "WorkoutExercise"("workoutPlanId", "dayLabel", "orderIndex");

-- AddForeignKey
ALTER TABLE "CycleFeedback" ADD CONSTRAINT "CycleFeedback_healthCycleId_fkey" FOREIGN KEY ("healthCycleId") REFERENCES "HealthCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_healthCycleId_fkey" FOREIGN KEY ("healthCycleId") REFERENCES "HealthCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
