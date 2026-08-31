import type { PrismaClient } from "../../generated/prisma/client";
import { CURRENT_CONSENT_VERSION } from "../../lib/consent-version";

export class ConsentNotFoundError extends Error {}

export function getConsent(prisma: PrismaClient, userId: string) {
  return prisma.healthDataConsent.findUnique({ where: { userId } });
}

// Aceite (RF24). Cobre tanto o primeiro aceite quanto reaceite após revogação
// (Spec 00, seção 8: revogar e aceitar de novo são ações distintas de excluir a conta).
export function acceptConsent(prisma: PrismaClient, userId: string) {
  const now = new Date();

  return prisma.healthDataConsent.upsert({
    where: { userId },
    create: {
      userId,
      consentedAt: now,
      consentVersion: CURRENT_CONSENT_VERSION,
      revokedAt: null,
    },
    update: {
      consentedAt: now,
      consentVersion: CURRENT_CONSENT_VERSION,
      revokedAt: null,
    },
  });
}

export async function revokeConsent(prisma: PrismaClient, userId: string) {
  const existing = await prisma.healthDataConsent.findUnique({ where: { userId } });
  if (!existing) {
    throw new ConsentNotFoundError();
  }

  return prisma.healthDataConsent.update({
    where: { userId },
    data: { revokedAt: new Date() },
  });
}
