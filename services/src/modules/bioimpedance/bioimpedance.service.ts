import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { calculateTrend, type Trend } from "../../lib/trend";
import type { BioimpedanceEntryBody } from "./bioimpedance.schemas";

// null explícito limpa o campo Json (Prisma.JsonNull); undefined = não enviado.
function toInputJson(
  value: Record<string, unknown> | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export class EntryNotFoundError extends Error {}

export function createEntry(prisma: PrismaClient, userId: string, body: BioimpedanceEntryBody) {
  return prisma.bioimpedanceEntry.create({
    data: {
      userId,
      measuredAt: new Date(body.measuredAt),
      weightKg: body.weightKg ?? null,
      bodyFatPercent: body.bodyFatPercent ?? null,
      leanMassKg: body.leanMassKg ?? null,
      extraMetrics: body.extraMetrics != null ? toInputJson(body.extraMetrics) : undefined,
      deviceName: body.deviceName ?? null,
      notes: body.notes ?? null,
    },
  });
}

export async function updateEntry(
  prisma: PrismaClient,
  userId: string,
  entryId: string,
  body: BioimpedanceEntryBody,
) {
  const existing = await prisma.bioimpedanceEntry.findFirst({ where: { id: entryId, userId } });
  if (!existing) {
    throw new EntryNotFoundError();
  }

  return prisma.bioimpedanceEntry.update({
    where: { id: entryId },
    data: {
      measuredAt: new Date(body.measuredAt),
      ...(body.weightKg !== undefined && { weightKg: body.weightKg }),
      ...(body.bodyFatPercent !== undefined && { bodyFatPercent: body.bodyFatPercent }),
      ...(body.leanMassKg !== undefined && { leanMassKg: body.leanMassKg }),
      ...(body.extraMetrics !== undefined && { extraMetrics: toInputJson(body.extraMetrics) }),
      ...(body.deviceName !== undefined && { deviceName: body.deviceName }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
}

export async function deleteEntry(prisma: PrismaClient, userId: string, entryId: string) {
  const existing = await prisma.bioimpedanceEntry.findFirst({ where: { id: entryId, userId } });
  if (!existing) {
    throw new EntryNotFoundError();
  }

  await prisma.bioimpedanceEntry.delete({ where: { id: entryId } });
}

interface EntryTrend {
  weightKg: Trend | null;
  bodyFatPercent: Trend | null;
  leanMassKg: Trend | null;
}

// Tendência calculada dinamicamente na leitura, nunca persistida (spec, seção
// 5.1) — cada registro comparado ao imediatamente anterior na ordem
// cronológica; null se a métrica faltar em qualquer um dos dois, ou se não
// houver registro anterior.
function trendFor(current: number | null, previous: number | null): Trend | null {
  if (current === null || previous === null) {
    return null;
  }
  return calculateTrend(current, previous);
}

export async function listEntriesWithTrend(prisma: PrismaClient, userId: string) {
  const entries = await prisma.bioimpedanceEntry.findMany({
    where: { userId },
    orderBy: { measuredAt: "asc" },
  });

  return entries.map((entry, index) => {
    const previous = index > 0 ? entries[index - 1] : null;

    const trend: EntryTrend = {
      weightKg: previous ? trendFor(entry.weightKg, previous.weightKg) : null,
      bodyFatPercent: previous ? trendFor(entry.bodyFatPercent, previous.bodyFatPercent) : null,
      leanMassKg: previous ? trendFor(entry.leanMassKg, previous.leanMassKg) : null,
    };

    return { ...entry, trend };
  });
}
