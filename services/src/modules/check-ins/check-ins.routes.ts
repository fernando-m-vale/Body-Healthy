import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import { upsertCheckInBodySchema, checkInResponseSchema, listCheckInsQuerySchema } from "./check-ins.schemas";
import { upsertCheckIn, listCheckIns } from "./check-ins.service";

// Spec 06 — Check-in Semanal (RF16).
export default async function checkInsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/check-ins",
    { schema: { body: upsertCheckInBodySchema, response: { 201: checkInResponseSchema } }, preHandler },
    async (request, reply) => {
      const checkIn = await upsertCheckIn(app.prisma, request.user.sub, request.body);
      return reply.code(201).send(checkIn);
    },
  );

  server.get(
    "/check-ins",
    { schema: { querystring: listCheckInsQuerySchema, response: { 200: checkInResponseSchema.array() } }, preHandler },
    async (request, reply) => {
      const checkIns = await listCheckIns(app.prisma, request.user.sub, request.query.healthCycleId);
      return reply.send(checkIns);
    },
  );
}
