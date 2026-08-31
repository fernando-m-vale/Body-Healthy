import type { PrismaClient } from "../../generated/prisma/client";
import type { CreateWorkoutLogBody } from "./workout-logs.schemas";

export function createWorkoutLog(prisma: PrismaClient, userId: string, body: CreateWorkoutLogBody) {
  return prisma.workoutExecutionLog.create({
    data: {
      userId,
      workoutExerciseId: body.workoutExerciseId ?? null,
      exerciseNameFreeText: body.exerciseNameFreeText ?? null,
      performedAt: new Date(body.performedAt),
      setsCompleted: body.setsCompleted ?? null,
      repsCompleted: body.repsCompleted ?? null,
      weightUsedKg: body.weightUsedKg ?? null,
      notes: body.notes ?? null,
    },
  });
}

export function listWorkoutLogs(prisma: PrismaClient, userId: string, from?: string, to?: string) {
  return prisma.workoutExecutionLog.findMany({
    where: {
      userId,
      ...((from || to) && {
        performedAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    orderBy: { performedAt: "asc" },
  });
}
