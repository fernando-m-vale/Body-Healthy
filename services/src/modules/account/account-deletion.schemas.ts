import { z } from "zod";

export const deletionRequestResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  requestedAt: z.date(),
  scheduledDeletionAt: z.date(),
  cancelledAt: z.date().nullable(),
  completedAt: z.date().nullable(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});
