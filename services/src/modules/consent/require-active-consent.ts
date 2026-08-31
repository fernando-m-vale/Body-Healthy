import type { FastifyRequest, FastifyReply } from "fastify";

// Guard reutilizável para as Specs 01-06 (dado de saúde): bloqueia escrita se o
// consentimento (RF24) nunca foi dado ou foi revogado (Spec 00, seção 8/9).
// Não é aplicado a nenhuma rota nesta tarefa — Spec 00 não tem rotas de dado de
// saúde; fica pronto para ser usado como preHandler quando as specs 01-06 forem
// implementadas.
export async function requireActiveConsent(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub;

  const consent = await request.server.prisma.healthDataConsent.findUnique({
    where: { userId },
  });

  if (!consent || consent.revokedAt !== null) {
    return reply.code(403).send({
      error: "Consentimento de dado de saúde ausente ou revogado. Aceite o consentimento antes de continuar.",
    });
  }
}
