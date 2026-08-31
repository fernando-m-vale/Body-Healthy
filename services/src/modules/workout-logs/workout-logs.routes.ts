import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import { createWorkoutLogBodySchema, workoutLogResponseSchema, listWorkoutLogsQuerySchema } from "./workout-logs.schemas";
import { createWorkoutLog, listWorkoutLogs } from "./workout-logs.service";

// Spec 06 — Registro de Progressão de Treino (RF17).
export default async function workoutLogsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/workout-logs",
    { schema: { body: createWorkoutLogBodySchema, response: { 201: workoutLogResponseSchema } }, preHandler },
    async (request, reply) => {
      const log = await createWorkoutLog(app.prisma, request.user.sub, request.body);
      return reply.code(201).send(log);
    },
  );

  server.get(
    "/workout-logs",
    {
      schema: { querystring: listWorkoutLogsQuerySchema, response: { 200: workoutLogResponseSchema.array() } },
      preHandler,
    },
    async (request, reply) => {
      const logs = await listWorkoutLogs(app.prisma, request.user.sub, request.query.from, request.query.to);
      return reply.send(logs);
    },
  );
}
