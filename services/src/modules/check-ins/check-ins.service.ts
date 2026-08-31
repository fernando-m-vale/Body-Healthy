import type { PrismaClient } from "../../generated/prisma/client";
import { getActiveCycleId } from "../cycles/cycles.service";
import type { UpsertCheckInBody } from "./check-ins.schemas";

// Upsert por userId+weekStartDate (spec, seção 8 passo 1) — reenvio na mesma
// semana substitui por completo o registro anterior (é correção, não patch
// parcial).
export async function upsertCheckIn(prisma: PrismaClient, userId: string, body: UpsertCheckInBody) {
  const weekStartDate = new Date(body.weekStartDate);
  const activeCycleId = await getActiveCycleId(prisma, userId);

  const data = {
    healthCycleId: activeCycleId,
    weightKg: body.weightKg ?? null,
    workoutAdherence: body.workoutAdherence ?? null,
    energyLevel: body.energyLevel ?? null,
    sleepQuality: body.sleepQuality ?? null,
  };

  return prisma.weeklyCheckIn.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate } },
    create: { userId, weekStartDate, ...data },
    update: data,
  });
}

export function listCheckIns(prisma: PrismaClient, userId: string, healthCycleId?: string) {
  return prisma.weeklyCheckIn.findMany({
    where: { userId, ...(healthCycleId && { healthCycleId }) },
    orderBy: { weekStartDate: "asc" },
  });
}
