import type { PrismaClient } from "../../generated/prisma/client";

// Regra de agregação de adesão (Spec 06, seção 6), consumida pela Spec 05
// (aggregateContext) ao montar o contexto de um novo ciclo. Semanas sem
// check-in preenchido não contam nem a favor nem contra a taxa — dado
// ausente não é o mesmo que adesão zero (RF04a).
export async function calculateAdherenceRate(
  prisma: PrismaClient,
  userId: string,
  previousCycleId: string | null,
): Promise<number | null> {
  if (!previousCycleId) {
    return null;
  }

  const checkIns = await prisma.weeklyCheckIn.findMany({
    where: { userId, healthCycleId: previousCycleId, workoutAdherence: { not: null } },
  });

  // Dado insuficiente para significar algo — evita a IA tirar conclusão de
  // amostra pequena (spec, seção 6).
  if (checkIns.length < 2) {
    return null;
  }

  const completedCount = checkIns.filter((c) => c.workoutAdherence === "completo").length;
  return completedCount / checkIns.length;
}
