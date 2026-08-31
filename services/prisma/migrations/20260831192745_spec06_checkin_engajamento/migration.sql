-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthCycleId" TEXT,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "workoutAdherence" TEXT,
    "energyLevel" INTEGER,
    "sleepQuality" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExecutionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutExerciseId" TEXT,
    "exerciseNameFreeText" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "setsCompleted" INTEGER,
    "repsCompleted" TEXT,
    "weightUsedKg" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCalorieLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthCycleId" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL,
    "caloriesConsumed" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCalorieLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_userId_weekStartDate_idx" ON "WeeklyCheckIn"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCheckIn_userId_weekStartDate_key" ON "WeeklyCheckIn"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX "WorkoutExecutionLog_userId_performedAt_idx" ON "WorkoutExecutionLog"("userId", "performedAt");

-- CreateIndex
CREATE INDEX "DailyCalorieLog_userId_logDate_idx" ON "DailyCalorieLog"("userId", "logDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCalorieLog_userId_logDate_key" ON "DailyCalorieLog"("userId", "logDate");
