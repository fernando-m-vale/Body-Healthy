import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import { getKeyProvider } from "../../lib/key-provider";
import {
  dataExportRequestResponseSchema,
  dataExportIdParamsSchema,
  errorResponseSchema as exportErrorResponseSchema,
} from "./data-export.schemas";
import { createExportRequest, getExportRequest } from "./data-export.service";
import { runExportJob } from "./data-export.job";
import { deletionRequestResponseSchema, errorResponseSchema as deletionErrorResponseSchema } from "./account-deletion.schemas";
import {
  requestDeletion,
  cancelDeletion,
  getActiveDeletionRequest,
  DeletionAlreadyActiveError,
  DeletionNotFoundError,
} from "./account-deletion.service";

// Spec 08 — Portabilidade de Dado e Exclusão de Conta.
// A execução real da exclusão (após a carência) NÃO tem endpoint HTTP —
// só o script services/scripts/process-due-deletions.ts (ou, em produção,
// um scheduler de verdade) chama processExpiredDeletionRequests(). Um
// endpoint autenticado do próprio usuário pra forçar isso anularia o
// propósito da carência (decisão registrada no planejamento desta tarefa).
export default async function accountRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/data-export",
    { schema: { response: { 201: dataExportRequestResponseSchema } }, preHandler },
    async (request, reply) => {
      const exportRequest = await createExportRequest(app.prisma, request.user.sub);

      void runExportJob(
        app.prisma,
        app.s3,
        app.s3Bucket,
        getKeyProvider(),
        request.user.sub,
        exportRequest.id,
        app.log,
      );

      return reply.code(201).send(exportRequest);
    },
  );

  server.get(
    "/data-export/:id",
    {
      schema: {
        params: dataExportIdParamsSchema,
        response: { 200: dataExportRequestResponseSchema, 404: exportErrorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      const exportRequest = await getExportRequest(app.prisma, request.user.sub, request.params.id);
      if (!exportRequest) {
        return reply.code(404).send({ error: "Pedido de exportação não encontrado" });
      }
      return reply.send(exportRequest);
    },
  );

  server.post(
    "/account/deletion",
    {
      schema: { response: { 201: deletionRequestResponseSchema, 409: deletionErrorResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      try {
        const deletionRequest = await requestDeletion(app.prisma, request.user.sub);
        return reply.code(201).send(deletionRequest);
      } catch (err) {
        if (err instanceof DeletionAlreadyActiveError) {
          return reply.code(409).send({ error: "Já existe um pedido de exclusão em período de carência" });
        }
        throw err;
      }
    },
  );

  server.delete(
    "/account/deletion",
    { schema: { response: { 200: deletionRequestResponseSchema, 404: deletionErrorResponseSchema } }, preHandler },
    async (request, reply) => {
      try {
        const deletionRequest = await cancelDeletion(app.prisma, request.user.sub);
        return reply.send(deletionRequest);
      } catch (err) {
        if (err instanceof DeletionNotFoundError) {
          return reply.code(404).send({ error: "Nenhum pedido de exclusão em período de carência" });
        }
        throw err;
      }
    },
  );

  server.get(
    "/account/deletion",
    { schema: { response: { 200: deletionRequestResponseSchema.nullable() } }, preHandler },
    async (request, reply) => {
      const deletionRequest = await getActiveDeletionRequest(app.prisma, request.user.sub);
      return reply.send(deletionRequest);
    },
  );
}
