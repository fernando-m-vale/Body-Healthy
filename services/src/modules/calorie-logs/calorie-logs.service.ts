import type { PrismaClient } from "../../generated/prisma/client";
import { getActiveCycleId } from "../cycles/cycles.service";
import type { UpsertCalorieLogBody } from "./calorie-logs.schemas";

export async function upsertCalorieLog(prisma: PrismaClient, userId: string, body: UpsertCalorieLogBody) {
  const logDate = new Date(body.logDate);
  const activeCycleId = await getActiveCycleId(prisma, userId);

  const data = {
    healthCycleId: activeCycleId,
    caloriesConsumed: body.caloriesConsumed ?? null,
    notes: body.notes ?? null,
  };

  const log = await prisma.dailyCalorieLog.upsert({
    where: { userId_logDate: { userId, logDate } },
    create: { userId, logDate, ...data },
    update: data,
  });

  return withGoalComparison(prisma, log);
}

export async function listCalorieLogs(prisma: PrismaClient, userId: string) {
  const logs = await prisma.dailyCalorieLog.findMany({ where: { userId }, orderBy: { logDate: "asc" } });
  return Promise.all(logs.map((log) => withGoalComparison(prisma, log)));
}

async function withGoalComparison(
  prisma: PrismaClient,
  log: { id: string; healthCycleId: string | null; logDate: Date; caloriesConsumed: number | null; notes: string | null; createdAt: Date },
) {
  const cycle = log.healthCycleId
    ? await prisma.healthCycle.findUnique({ where: { id: log.healthCycleId }, select: { dailyCalorieGoal: true } })
    : null;

  const dailyCalorieGoal = cycle?.dailyCalorieGoal ?? null;
  const differenceFromGoal =
    dailyCalorieGoal != null && log.caloriesConsumed != null ? log.caloriesConsumed - dailyCalorieGoal : null;

  return { ...log, dailyCalorieGoal, differenceFromGoal };
}
