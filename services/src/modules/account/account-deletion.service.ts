import type { PrismaClient } from "../../generated/prisma/client";

export class DeletionAlreadyActiveError extends Error {}
export class DeletionNotFoundError extends Error {}

const GRACE_PERIOD_DAYS = 7;

// Spec 08, seção 6 passo 1 — a transição "requested" → "grace_period" é
// instantânea (não há processamento assíncrono entre os dois estados, ao
// contrário de exame/laudo), então o registro já nasce em "grace_period".
export async function requestDeletion(prisma: PrismaClient, userId: string) {
  const existing = await prisma.accountDeletionRequest.findFirst({ where: { userId, status: "grace_period" } });
  if (existing) {
    throw new DeletionAlreadyActiveError();
  }

  const requestedAt = new Date();
  const scheduledDeletionAt = new Date(requestedAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  return prisma.accountDeletionRequest.create({
    data: { userId, status: "grace_period", requestedAt, scheduledDeletionAt },
  });
}

export async function cancelDeletion(prisma: PrismaClient, userId: string) {
  const existing = await prisma.accountDeletionRequest.findFirst({ where: { userId, status: "grace_period" } });
  if (!existing) {
    throw new DeletionNotFoundError();
  }

  return prisma.accountDeletionRequest.update({
    where: { id: existing.id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
}

export function getActiveDeletionRequest(prisma: PrismaClient, userId: string) {
  return prisma.accountDeletionRequest.findFirst({ where: { userId, status: "grace_period" } });
}
