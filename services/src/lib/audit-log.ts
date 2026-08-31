import type { PrismaClient } from "../generated/prisma/client";

// Log de auditoria de leitura de dado sensível (Spec 04, seção 4/6) —
// obrigatório em toda leitura, sem exceção. Construído aqui como utilitário
// genérico para ser reaproveitado por specs futuras que também tocam dado
// sensível (mesmo padrão do requireActiveConsent na Spec 00: construído numa
// spec, aplicado nesta e potencialmente em outras depois).
export function logAccess(
  prisma: PrismaClient,
  params: { userId: string; accessedBy: string; resource: string },
) {
  return prisma.healthDataAccessLog.create({ data: params });
}
