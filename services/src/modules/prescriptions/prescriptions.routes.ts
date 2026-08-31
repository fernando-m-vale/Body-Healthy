import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import { getKeyProvider } from "../../lib/key-provider";
import {
  prescriptionEntryBodySchema,
  prescriptionEntryResponseSchema,
  errorResponseSchema,
  prescriptionIdParamsSchema,
} from "./prescriptions.schemas";
import { createEntry, updateEntry, deleteEntry, listEntries, EntryNotFoundError } from "./prescriptions.service";

// Spec 04 — Linha do Tempo de Prescrições. Categoria de dado mais sensível do
// produto até aqui: criptografia em nível de campo (name/notes nunca tocam o
// banco em texto plano) e log de auditoria obrigatório em toda leitura,
// inclusive a busca interna antes de editar/excluir (sem endpoint GET /:id
// próprio — não existe no contrato da spec, seção 7). Mesmo padrão de
// requireActiveConsent das Specs 01-03.
//
// Comunicação ao usuário no momento da coleta (seção 4.1 da spec) — texto que
// a tela de registro do app deve exibir, ainda sem frontend nesta tarefa:
//   "Por que pedimos": registrar sua linha do tempo de medicação/hormônio
//   ajuda a contextualizar sua evolução ao longo do tempo e a personalizar
//   seu plano de ação.
//   "O que não fazemos": não sugerimos, ajustamos ou avaliamos dose, início
//   ou fim de nenhum item — isso é decisão exclusiva do seu médico. Este dado
//   é usado apenas como contexto histórico, nunca como recomendação clínica.
export default async function prescriptionsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/prescriptions",
    {
      schema: { body: prescriptionEntryBodySchema, response: { 201: prescriptionEntryResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      const entry = await createEntry(app.prisma, getKeyProvider(), request.user.sub, request.body);
      return reply.code(201).send(entry);
    },
  );

  server.put(
    "/prescriptions/:id",
    {
      schema: {
        params: prescriptionIdParamsSchema,
        body: prescriptionEntryBodySchema,
        response: { 200: prescriptionEntryResponseSchema, 404: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const entry = await updateEntry(
          app.prisma,
          getKeyProvider(),
          request.user.sub,
          request.user.sub,
          request.params.id,
          request.body,
        );
        return reply.send(entry);
      } catch (err) {
        if (err instanceof EntryNotFoundError) {
          return reply.code(404).send({ error: "Item de prescrição não encontrado" });
        }
        throw err;
      }
    },
  );

  server.delete(
    "/prescriptions/:id",
    { schema: { params: prescriptionIdParamsSchema }, preHandler },
    async (request, reply) => {
      try {
        await deleteEntry(app.prisma, request.user.sub, request.user.sub, request.params.id);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof EntryNotFoundError) {
          return reply.code(404).send({ error: "Item de prescrição não encontrado" });
        }
        throw err;
      }
    },
  );

  server.get(
    "/prescriptions",
    { schema: { response: { 200: prescriptionEntryResponseSchema.array() } }, preHandler },
    async (request, reply) => {
      const entries = await listEntries(app.prisma, getKeyProvider(), request.user.sub, request.user.sub);
      return reply.send(entries);
    },
  );
}
