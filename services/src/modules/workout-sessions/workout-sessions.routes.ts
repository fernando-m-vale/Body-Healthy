import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import {
  startSessionBodySchema,
  upsertSetBodySchema,
  sessionSummarySchema,
  sessionDetailSchema,
  sessionHistoryItemSchema,
  sessionIdParamsSchema,
  setLogSchema,
  errorResponseSchema,
  activeSessionErrorResponseSchema,
} from "./workout-sessions.schemas";
import {
  getActiveSession,
  startSession,
  getSessionDetail,
  listSessions,
  upsertSet,
  finishSession,
  discardSession,
  SessionNotFoundError,
  SessionFinishedError,
  ActiveSessionExistsError,
} from "./workout-sessions.service";

// Spec 09 — Sessão de Treino ao Vivo. Substitui o RF17 implementado na
// Spec 06 (Tela 21/WorkoutExecutionLog, removidos). Todas as rotas exigem
// consentimento de dado de saúde ativo, mesmo padrão das specs anteriores.
export default async function workoutSessionsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.get(
    "/workout-sessions/active",
    { schema: { response: { 200: sessionSummarySchema.nullable() } }, preHandler },
    async (request, reply) => {
      const session = await getActiveSession(app.prisma, request.user.sub);
      return reply.send(session);
    },
  );

  server.post(
    "/workout-sessions",
    {
      schema: {
        body: startSessionBodySchema,
        response: { 201: sessionSummarySchema, 409: activeSessionErrorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const session = await startSession(app.prisma, request.user.sub, request.body.dayLabel ?? null);
        return reply.code(201).send(session);
      } catch (err) {
        if (err instanceof ActiveSessionExistsError) {
          return reply.code(409).send({ error: err.message, activeSessionId: err.activeSessionId });
        }
        throw err;
      }
    },
  );

  server.get(
    "/workout-sessions/:id",
    {
      schema: { params: sessionIdParamsSchema, response: { 200: sessionDetailSchema, 404: errorResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      try {
        const detail = await getSessionDetail(app.prisma, request.user.sub, request.params.id);
        return reply.send(detail);
      } catch (err) {
        if (err instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: "Sessão não encontrada" });
        }
        throw err;
      }
    },
  );

  server.get(
    "/workout-sessions",
    { schema: { response: { 200: sessionHistoryItemSchema.array() } }, preHandler },
    async (request, reply) => {
      const sessions = await listSessions(app.prisma, request.user.sub);
      return reply.send(sessions);
    },
  );

  server.put(
    "/workout-sessions/:id/sets",
    {
      schema: {
        params: sessionIdParamsSchema,
        body: upsertSetBodySchema,
        response: { 200: setLogSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const setLog = await upsertSet(app.prisma, request.user.sub, request.params.id, request.body);
        return reply.send(setLog);
      } catch (err) {
        if (err instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: "Sessão não encontrada" });
        }
        if (err instanceof SessionFinishedError) {
          return reply.code(409).send({ error: "Sessão já finalizada" });
        }
        throw err;
      }
    },
  );

  server.put(
    "/workout-sessions/:id/finish",
    {
      schema: {
        params: sessionIdParamsSchema,
        response: { 200: sessionSummarySchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const session = await finishSession(app.prisma, request.user.sub, request.params.id);
        return reply.send(session);
      } catch (err) {
        if (err instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: "Sessão não encontrada" });
        }
        if (err instanceof SessionFinishedError) {
          return reply.code(409).send({ error: "Sessão já finalizada" });
        }
        throw err;
      }
    },
  );

  // Descarte de sessão em andamento (Spec 09, seção 5.9) — exclusão
  // definitiva (decisão de implementação, a spec permite qualquer uma das
  // duas). Só sessão em aberto; uma já finalizada não é "descartável".
  server.delete(
    "/workout-sessions/:id",
    { schema: { params: sessionIdParamsSchema }, preHandler },
    async (request, reply) => {
      try {
        await discardSession(app.prisma, request.user.sub, request.params.id);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: "Sessão não encontrada" });
        }
        if (err instanceof SessionFinishedError) {
          return reply.code(409).send({ error: "Sessão já finalizada" });
        }
        throw err;
      }
    },
  );
}
