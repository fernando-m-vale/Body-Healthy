import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import {
  uploadUrlBodySchema,
  uploadUrlResponseSchema,
  registerExamBodySchema,
  examSummarySchema,
  examDetailSchema,
  confirmExamBodySchema,
  errorResponseSchema,
  examIdParamsSchema,
} from "./exams.schemas";
import {
  createExamUploadUrl,
  registerExam,
  getExam,
  listExams,
  confirmExam,
  ExamNotFoundError,
  ExamNotPendingConfirmationError,
  MarkerListMismatchError,
} from "./exams.service";
import { runExtractionJob } from "./exams.job";

// Spec 01 — Ingestão e Extração de Exame Laboratorial via IA.
// Todas as rotas exigem consentimento de dado de saúde ativo (Spec 00, seção 9):
// esta é a primeira spec que efetivamente usa o preHandler requireActiveConsent.
//
// Comunicação ao usuário no momento da coleta (seção 3.1 da spec) — texto que a
// tela de upload do app deve exibir antes/durante o envio, ainda sem frontend
// nesta tarefa:
//   "Por que pedimos": seus marcadores de exame ajudam a personalizar seu plano
//   de ação (treino, nutrição e sono) e a acompanhar sua evolução, comparando
//   com exames anteriores.
//   "O que não fazemos": não emitimos diagnóstico nem análise médica — a
//   leitura clínica continua sendo do seu médico (mesmo disclaimer de RNF02).
export default async function examsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.post(
    "/exams/upload-url",
    { schema: { body: uploadUrlBodySchema, response: { 200: uploadUrlResponseSchema } }, preHandler },
    async (request, reply) => {
      const { fileType, contentType } = request.body;
      const result = await createExamUploadUrl(
        app.s3,
        app.s3Bucket,
        request.user.sub,
        fileType,
        contentType,
      );
      return reply.send(result);
    },
  );

  server.post(
    "/exams",
    { schema: { body: registerExamBodySchema, response: { 201: examSummarySchema } }, preHandler },
    async (request, reply) => {
      const exam = await registerExam(app.prisma, request.user.sub, request.body);

      // Job assíncrono fire-and-forget (seção 4, passos 2-4) — não aguardamos aqui,
      // a resposta HTTP volta com status "uploaded" imediatamente.
      void runExtractionJob(app.prisma, app.s3, app.s3Bucket, exam.id, app.log);

      return reply.code(201).send(exam);
    },
  );

  server.get(
    "/exams",
    { schema: { response: { 200: examSummarySchema.array() } }, preHandler },
    async (request, reply) => {
      const exams = await listExams(app.prisma, request.user.sub);
      return reply.send(exams);
    },
  );

  server.get(
    "/exams/:id",
    {
      schema: { params: examIdParamsSchema, response: { 200: examDetailSchema, 404: errorResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      const exam = await getExam(app.prisma, request.user.sub, request.params.id);
      if (!exam) {
        return reply.code(404).send({ error: "Exame não encontrado" });
      }
      return reply.send(exam);
    },
  );

  server.post(
    "/exams/:id/confirm",
    {
      schema: {
        params: examIdParamsSchema,
        body: confirmExamBodySchema,
        response: { 200: examDetailSchema, 404: errorResponseSchema, 409: errorResponseSchema },
      },
      preHandler,
    },
    async (request, reply) => {
      try {
        const exam = await confirmExam(app.prisma, request.user.sub, request.params.id, request.body);
        if (!exam) {
          throw new ExamNotFoundError();
        }
        return reply.send(exam);
      } catch (err) {
        if (err instanceof ExamNotFoundError) {
          return reply.code(404).send({ error: "Exame não encontrado" });
        }
        if (err instanceof ExamNotPendingConfirmationError) {
          return reply.code(409).send({ error: "Exame não está aguardando confirmação" });
        }
        if (err instanceof MarkerListMismatchError) {
          return reply
            .code(409)
            .send({ error: "A lista de marcadores enviada não corresponde aos marcadores extraídos do exame" });
        }
        throw err;
      }
    },
  );
}
