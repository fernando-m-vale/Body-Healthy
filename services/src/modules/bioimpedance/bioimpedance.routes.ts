import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import {
  bioimpedanceEntryBodySchema,
  bioimpedanceEntryResponseSchema,
  errorResponseSchema,
  bioimpedanceIdParamsSchema,
} from "./bioimpedance.schemas";
import { createEntry, updateEntry, deleteEntry, listEntriesWithTrend, EntryNotFoundError } from "./bioimpedance.service";

// Spec 03 — Registro de Bioimpedância (Série Temporal).
// Sem upload/IA/job: escrita síncrona direta. Todas as rotas exigem
// consentimento de dado de saúde ativo (Spec 00) via requireActiveConsent,
// mesmo padrão das Specs 01/02.
//
// Comunicação ao usuário no momento da coleta (seção 4.1 da spec) — texto que
// a tela de registro do app deve exibir, ainda sem frontend nesta tarefa:
//   "Por que pedimos": sua composição corporal ajuda a personalizar seu
//   objetivo de treino e a acompanhar sua evolução ao longo do tempo.
//   "O que não fazemos": não fazemos diagnóstico nem análise médica a partir
//   desse dado — é usado só para personalizar seu plano de ação (mesmo
//   reforço do disclaimer clínico, RNF02).
export default async function bioimpedanceRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  // Tendência (spec, seção 5.1) depende da série inteira ordenada por
  // measuredAt, não só do registro isolado — por isso POST/PUT recomputam a
  // lista inteira e devolvem a entrada correspondente, em vez de sempre
  // retornar trend: null.
  async function withTrend(userId: string, entryId: string) {
    const entries = await listEntriesWithTrend(app.prisma, userId);
    return entries.find((e) => e.id === entryId)!;
  }

  server.post(
    "/bioimpedance",
    {
      schema: { body: bioimpedanceEntryBodySchema, response: { 201: bioimpedanceEntryResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      const entry = await createEntry(app.prisma, request.user.sub, request.body);
      return reply.code(201).send(await withTrend(request.user.sub, entry.id));
    },
  );

  server.put(
    "/bioimpedance/:id",
    {
      schema: {
        params: bioimpedanceIdParamsSchema,
        body: bioimpedanceEntryBodySchema,
        response: { 200: bioimpedanceEntryResponseSchema, 404: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const entry = await updateEntry(app.prisma, request.user.sub, request.params.id, request.body);
        return reply.send(await withTrend(request.user.sub, entry.id));
      } catch (err) {
        if (err instanceof EntryNotFoundError) {
          return reply.code(404).send({ error: "Registro de bioimpedância não encontrado" });
        }
        throw err;
      }
    },
  );

  server.delete(
    "/bioimpedance/:id",
    { schema: { params: bioimpedanceIdParamsSchema }, preHandler },
    async (request, reply) => {
      try {
        await deleteEntry(app.prisma, request.user.sub, request.params.id);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof EntryNotFoundError) {
          return reply.code(404).send({ error: "Registro de bioimpedância não encontrado" });
        }
        throw err;
      }
    },
  );

  server.get(
    "/bioimpedance",
    { schema: { response: { 200: bioimpedanceEntryResponseSchema.array() } }, preHandler },
    async (request, reply) => {
      const entries = await listEntriesWithTrend(app.prisma, request.user.sub);
      return reply.send(entries);
    },
  );
}
