import { z } from "zod";

const PDF_CONTENT_TYPE = "application/pdf";
const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;

export const fileTypeSchema = z.enum(["pdf", "image"]);
export const labSourceSchema = z.enum(["fleury", "dasa", "hermes_pardini", "generic"]);

export const uploadUrlBodySchema = z
  .object({
    fileType: fileTypeSchema,
    contentType: z.string(),
  })
  .refine(
    (data) =>
      data.fileType === "pdf"
        ? data.contentType === PDF_CONTENT_TYPE
        : (IMAGE_CONTENT_TYPES as readonly string[]).includes(data.contentType),
    { message: "contentType incompatível com fileType (pdf: application/pdf; image: image/jpeg ou image/png)" },
  );
export type UploadUrlBody = z.infer<typeof uploadUrlBodySchema>;

export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string(),
  fileKey: z.string(),
});

export const registerExamBodySchema = z.object({
  fileKey: z.string(),
  fileType: fileTypeSchema,
  labSource: labSourceSchema.nullable().optional(),
});
export type RegisterExamBody = z.infer<typeof registerExamBodySchema>;

const markerSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  referenceMin: z.number().nullable(),
  referenceMax: z.number().nullable(),
  userCorrected: z.boolean(),
  trend: z.string().nullable(), // "up" | "down" | "stable" | null — livre no schema Prisma (spec, seção 3)
});

export const examSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  fileType: z.string(),
  labSource: z.string().nullable(),
  examDate: z.date().nullable(),
  createdAt: z.date(),
  confirmedAt: z.date().nullable(),
});

export const examDetailSchema = examSummarySchema.extend({
  markers: z.array(markerSchema),
});

// Confirmação (RNF03, seção 4 passo 6): exige a lista completa dos marcadores
// do exame — evita ambiguidade de confirmação parcial (decisão registrada no
// planejamento desta tarefa).
export const confirmExamBodySchema = z.object({
  markers: z.array(
    z.object({
      id: z.string(),
      value: z.number(),
      unit: z.string(),
      referenceMin: z.number().nullable(),
      referenceMax: z.number().nullable(),
    }),
  ),
});
export type ConfirmExamBody = z.infer<typeof confirmExamBodySchema>;

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const examIdParamsSchema = z.object({
  id: z.string(),
});
