import type { FastifyInstance } from "fastify";
import { getConsent, acceptConsent, revokeConsent, ConsentNotFoundError } from "./consent.service";

export default async function consentRoutes(app: FastifyInstance) {
  app.post(
    "/consent/health-data",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const consent = await acceptConsent(app.prisma, request.user.sub);
      return reply.code(201).send({
        accepted: true,
        consentVersion: consent.consentVersion,
        consentedAt: consent.consentedAt,
      });
    },
  );

  app.get(
    "/consent/health-data",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const consent = await getConsent(app.prisma, request.user.sub);

      if (!consent) {
        return reply.send({ accepted: false, consentVersion: null, consentedAt: null, revokedAt: null });
      }

      return reply.send({
        accepted: consent.revokedAt === null,
        consentVersion: consent.consentVersion,
        consentedAt: consent.consentedAt,
        revokedAt: consent.revokedAt,
      });
    },
  );

  app.delete(
    "/consent/health-data",
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
        const consent = await revokeConsent(app.prisma, request.user.sub);
        return reply.send({ accepted: false, revokedAt: consent.revokedAt });
      } catch (err) {
        if (err instanceof ConsentNotFoundError) {
          return reply.code(404).send({ error: "Nenhum consentimento registrado para revogar" });
        }
        throw err;
      }
    },
  );
}
