import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import { upsertCalorieLogBodySchema, calorieLogResponseSchema } from "./calorie-logs.schemas";
import { upsertCalorieLog, listCalorieLogs } from "./calorie-logs.service";

// Spec 06 — Registro Diário de Calorias (RF22). Toda tela que exibe a
// comparação com a meta calórica deve reforçar que é estimativa informativa,
// não orientação nutricional individualizada (RNF02) — texto de tela, sem
// frontend nesta tarefa.
export default async function calorieLogsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/calorie-logs",
    { schema: { body: upsertCalorieLogBodySchema, response: { 201: calorieLogResponseSchema } }, preHandler },
    async (request, reply) => {
      const log = await upsertCalorieLog(app.prisma, request.user.sub, request.body);
      return reply.code(201).send(log);
    },
  );

  server.get(
    "/calorie-logs",
    { schema: { response: { 200: calorieLogResponseSchema.array() } }, preHandler },
    async (request, reply) => {
      const logs = await listCalorieLogs(app.prisma, request.user.sub);
      return reply.send(logs);
    },
  );
}
