-- DropIndex
DROP INDEX "WorkoutSetLog_workoutSessionId_exerciseOrderIndex_setNumber_idx";

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSetLog_workoutSessionId_exerciseOrderIndex_setNumber_key" ON "WorkoutSetLog"("workoutSessionId", "exerciseOrderIndex", "setNumber");

