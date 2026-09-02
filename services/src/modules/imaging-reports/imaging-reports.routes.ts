import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import {
  uploadUrlBodySchema,
  uploadUrlResponseSchema,
  registerReportBodySchema,
  reportSummarySchema,
  reportDetailSchema,
  reviewReportBodySchema,
  errorResponseSchema,
  reportIdParamsSchema,
} from "./imaging-reports.schemas";
import {
  createReportUploadUrl,
  registerReport,
  getReport,
  listReports,
  reviewReport,
  markReportForRetry,
  discardReport,
  ReportNotFoundError,
  InvalidReportStateError,
} from "./imaging-reports.service";
import { runSummaryJob } from "./imaging-reports.job";
import type { ImagingReport } from "../../generated/prisma/client";

// Spec 02 — Upload e Resumo de Laudo de Imagem.
// Mesmo padrão da Spec 01: upload via URL assinada (S3/MinIO), job assíncrono
// fire-and-forget, e todas as rotas exigem consentimento de dado de saúde ativo
// (Spec 00) via requireActiveConsent.
//
// Comunicação ao usuário no momento da coleta (seção 4.1 da spec) — texto que a
// tela de upload do app deve exibir antes/durante o envio, ainda sem frontend
// nesta tarefa:
//   "Por que pedimos": o resumo do laudo de imagem entra no seu histórico de
//   saúde e ajuda a contextualizar sua evolução junto com exames e
//   bioimpedância, alimentando seu plano de ação.
//   "O que não fazemos": o resumo é informativo, em linguagem simples — não é
//   interpretação médica nem substitui a leitura do seu médico sobre o laudo
//   original (mesmo reforço do disclaimer clínico, RNF02).
function toDetail(report: ImagingReport) {
  return {
    id: report.id,
    status: report.status,
    fileType: report.fileType,
    reportType: report.reportType,
    examDate: report.examDate,
    createdAt: report.createdAt,
    reviewedAt: report.reviewedAt,
    userFlagged: report.userFlagged,
    aiSummary: report.aiSummary,
    findings: (report.rawFindings as { description: string; outOfReferenceRange: boolean }[] | null) ?? [],
    flagComment: report.flagComment,
  };
}

export default async function imagingReportsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/imaging-reports/upload-url",
    { schema: { body: uploadUrlBodySchema, response: { 200: uploadUrlResponseSchema } }, preHandler },
    async (request, reply) => {
      const { fileType, contentType } = request.body;
      const result = await createReportUploadUrl(app.s3Bucket, request.user.sub, fileType, contentType);
      return reply.send(result);
    },
  );

  server.post(
    "/imaging-reports",
    { schema: { body: registerReportBodySchema, response: { 201: reportSummarySchema } }, preHandler },
    async (request, reply) => {
      const report = await registerReport(app.prisma, request.user.sub, request.body);

      void runSummaryJob(app.prisma, app.s3, app.s3Bucket, report.id, app.log);

      return reply.code(201).send(report);
    },
  );

  server.get(
    "/imaging-reports",
    { schema: { response: { 200: reportSummarySchema.array() } }, preHandler },
    async (request, reply) => {
      const reports = await listReports(app.prisma, request.user.sub);
      return reply.send(reports);
    },
  );

  server.get(
    "/imaging-reports/:id",
    {
      schema: { params: reportIdParamsSchema, response: { 200: reportDetailSchema, 404: errorResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      const report = await getReport(app.prisma, request.user.sub, request.params.id);
      if (!report) {
        return reply.code(404).send({ error: "Laudo de imagem não encontrado" });
      }
      return reply.send(toDetail(report));
    },
  );

  server.post(
    "/imaging-reports/:id/review",
    {
      schema: {
        params: reportIdParamsSchema,
        body: reviewReportBodySchema,
        response: { 200: reportDetailSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const report = await reviewReport(app.prisma, request.user.sub, request.params.id, request.body);
        return reply.send(toDetail(report));
      } catch (err) {
        if (err instanceof ReportNotFoundError) {
          return reply.code(404).send({ error: "Laudo de imagem não encontrado" });
        }
        if (err instanceof InvalidReportStateError) {
          return reply.code(409).send({ error: "Laudo de imagem não está aguardando revisão" });
        }
        throw err;
      }
    },
  );

  server.post(
    "/imaging-reports/:id/retry",
    {
      schema: {
        params: reportIdParamsSchema,
        response: { 200: reportSummarySchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const report = await markReportForRetry(app.prisma, request.user.sub, request.params.id);

        void runSummaryJob(app.prisma, app.s3, app.s3Bucket, report.id, app.log);

        return reply.send(report);
      } catch (err) {
        if (err instanceof ReportNotFoundError) {
          return reply.code(404).send({ error: "Laudo de imagem não encontrado" });
        }
        if (err instanceof InvalidReportStateError) {
          return reply
            .code(409)
            .send({ error: "Laudo de imagem só pode ser reprocessado a partir de pending_review ou failed" });
        }
        throw err;
      }
    },
  );

  server.post(
    "/imaging-reports/:id/discard",
    {
      schema: {
        params: reportIdParamsSchema,
        response: { 200: reportSummarySchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const report = await discardReport(app.prisma, request.user.sub, request.params.id);
        return reply.send(report);
      } catch (err) {
        if (err instanceof ReportNotFoundError) {
          return reply.code(404).send({ error: "Laudo de imagem não encontrado" });
        }
        if (err instanceof InvalidReportStateError) {
          return reply
            .code(409)
            .send({ error: "Laudo de imagem só pode ser descartado a partir de pending_review ou failed" });
        }
        throw err;
      }
    },
  );
}
