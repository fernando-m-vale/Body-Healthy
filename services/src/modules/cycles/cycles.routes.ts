import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import { getKeyProvider } from "../../lib/key-provider";
import {
  createCycleBodySchema,
  updateExerciseBodySchema,
  feedbackBodySchema,
  nextCycleDateBodySchema,
  cycleSummarySchema,
  cycleDetailSchema,
  exerciseSchema,
  feedbackResponseSchema,
  errorResponseSchema,
  cycleIdParamsSchema,
  exerciseIdParamsSchema,
} from "./cycles.schemas";
import {
  createCycle,
  getCycle,
  listCycles,
  updateExercise,
  createFeedback,
  updateNextCycleDate,
  CycleNotFoundError,
  ExerciseNotFoundError,
  CycleGeneratingError,
} from "./cycles.service";
import { runGenerationJob, runRegenerationJob } from "./cycles.job";
import { buildWorkoutCsv } from "./export";

// Spec 05 — Declaração de Objetivo, Plano de Ação e Treino Personalizado.
// Primeira spec que consome dado de todas as anteriores (00-04) para gerar
// algo novo. Todas as rotas exigem consentimento de dado de saúde ativo
// (Spec 00), mesmo padrão das specs anteriores.
export default async function cyclesRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/cycles",
    { schema: { body: createCycleBodySchema, response: { 201: cycleSummarySchema } }, preHandler },
    async (request, reply) => {
      const cycle = await createCycle(app.prisma, request.user.sub, request.body);

      // Job assíncrono fire-and-forget (mesmo padrão das Specs 01/02) — a
      // resposta HTTP volta com status "objective_set" imediatamente.
      void runGenerationJob(app.prisma, getKeyProvider(), request.user.sub, cycle.id, app.log);

      return reply.code(201).send(cycle);
    },
  );

  server.get(
    "/cycles",
    { schema: { response: { 200: cycleSummarySchema.array() } }, preHandler },
    async (request, reply) => {
      const cycles = await listCycles(app.prisma, request.user.sub);
      return reply.send(cycles);
    },
  );

  server.get(
    "/cycles/:id",
    {
      schema: { params: cycleIdParamsSchema, response: { 200: cycleDetailSchema, 404: errorResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      const cycle = await getCycle(app.prisma, request.user.sub, request.params.id);
      if (!cycle) {
        return reply.code(404).send({ error: "Ciclo não encontrado" });
      }
      return reply.send(cycle);
    },
  );

  server.put(
    "/cycles/:id/workout/exercises/:exerciseId",
    {
      schema: {
        params: exerciseIdParamsSchema,
        body: updateExerciseBodySchema,
        response: { 200: exerciseSchema, 404: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const exercise = await updateExercise(
          app.prisma,
          request.user.sub,
          request.params.id,
          request.params.exerciseId,
          request.body,
        );
        return reply.send(exercise);
      } catch (err) {
        if (err instanceof ExerciseNotFoundError) {
          return reply.code(404).send({ error: "Exercício não encontrado" });
        }
        throw err;
      }
    },
  );

  server.post(
    "/cycles/:id/feedback",
    {
      schema: {
        params: cycleIdParamsSchema,
        body: feedbackBodySchema,
        response: { 201: feedbackResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const feedback = await createFeedback(app.prisma, request.user.sub, request.params.id, request.body.feedbackText);

        void runRegenerationJob(
          app.prisma,
          getKeyProvider(),
          request.user.sub,
          request.params.id,
          request.body.feedbackText,
          app.log,
        );

        return reply.code(201).send(feedback);
      } catch (err) {
        if (err instanceof CycleNotFoundError) {
          return reply.code(404).send({ error: "Ciclo não encontrado" });
        }
        if (err instanceof CycleGeneratingError) {
          return reply.code(409).send({ error: "Ciclo já está gerando/regenerando — aguarde concluir" });
        }
        throw err;
      }
    },
  );

  server.put(
    "/cycles/:id/next-cycle-date",
    {
      schema: {
        params: cycleIdParamsSchema,
        body: nextCycleDateBodySchema,
        response: { 200: cycleSummarySchema, 404: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const cycle = await updateNextCycleDate(
          app.prisma,
          request.user.sub,
          request.params.id,
          request.body.nextCycleExpectedDate,
        );
        return reply.send(cycle);
      } catch (err) {
        if (err instanceof CycleNotFoundError) {
          return reply.code(404).send({ error: "Ciclo não encontrado" });
        }
        throw err;
      }
    },
  );

  server.get(
    "/cycles/:id/export",
    { schema: { params: cycleIdParamsSchema }, preHandler },
    async (request, reply) => {
      const cycle = await getCycle(app.prisma, request.user.sub, request.params.id);
      if (!cycle) {
        return reply.code(404).send({ error: "Ciclo não encontrado" });
      }
      if (!cycle.workoutPlan) {
        return reply.code(404).send({ error: "Treino ainda não gerado para este ciclo" });
      }

      const csv = buildWorkoutCsv(cycle.workoutPlan.exercises);

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="treino-${cycle.id}.csv"`)
        .send(csv);
    },
  );
}
