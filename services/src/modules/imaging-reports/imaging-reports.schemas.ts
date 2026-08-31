import { z } from "zod";
import { fileTypeSchema, uploadUrlBodySchema, uploadUrlResponseSchema, errorResponseSchema } from "../exams/exams.schemas";

// Reaproveitados do módulo exams (Spec 01) — mesmo padrão de upload assinado,
// sem modificar o arquivo original.
export { fileTypeSchema, uploadUrlBodySchema, uploadUrlResponseSchema, errorResponseSchema };

export const registerReportBodySchema = z.object({
  fileKey: z.string(),
  fileType: fileTypeSchema,
  reportType: z.string().nullable().optional(),
});
export type RegisterReportBody = z.infer<typeof registerReportBodySchema>;

const findingSchema = z.object({
  description: z.string(),
  outOfReferenceRange: z.boolean(),
});

export const reportSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  fileType: z.string(),
  reportType: z.string().nullable(),
  examDate: z.date().nullable(),
  createdAt: z.date(),
  reviewedAt: z.date().nullable(),
  userFlagged: z.boolean(),
});

export const reportDetailSchema = reportSummarySchema.extend({
  aiSummary: z.string().nullable(),
  findings: z.array(findingSchema),
  flagComment: z.string().nullable(),
});

// Revisão humana (Spec 02, seção 5 passo 5): aceitar (userFlagged: false) ou
// sinalizar como incorreto (userFlagged: true) com comentário livre opcional.
export const reviewReportBodySchema = z.object({
  userFlagged: z.boolean(),
  comment: z.string().optional(),
});
export type ReviewReportBody = z.infer<typeof reviewReportBodySchema>;

export const reportIdParamsSchema = z.object({
  id: z.string(),
});
