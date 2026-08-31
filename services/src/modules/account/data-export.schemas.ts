import { z } from "zod";

export const dataExportRequestResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  downloadUrl: z.string().nullable(),
  requestedAt: z.date(),
  readyAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const dataExportIdParamsSchema = z.object({
  id: z.string(),
});
