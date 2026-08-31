import { z } from "zod";

export const workoutAdherenceSchema = z.enum(["completo", "parcial", "nao_realizado"]);

// Upsert por weekStartDate (spec, seção 8 passo 1) — reenvio na mesma semana
// substitui por completo o registro anterior (é uma correção, não um patch
// parcial); nenhum campo além de weekStartDate é obrigatório (RF04a).
export const upsertCheckInBodySchema = z.object({
  weekStartDate: z.string().datetime(),
  weightKg: z.number().min(20).max(300).nullable().optional(),
  workoutAdherence: workoutAdherenceSchema.nullable().optional(),
  energyLevel: z.number().int().min(1).max(5).nullable().optional(),
  sleepQuality: z.number().int().min(1).max(5).nullable().optional(),
});
export type UpsertCheckInBody = z.infer<typeof upsertCheckInBodySchema>;

export const checkInResponseSchema = z.object({
  id: z.string(),
  healthCycleId: z.string().nullable(),
  weekStartDate: z.date(),
  weightKg: z.number().nullable(),
  workoutAdherence: z.string().nullable(),
  energyLevel: z.number().nullable(),
  sleepQuality: z.number().nullable(),
  createdAt: z.date(),
});

export const listCheckInsQuerySchema = z.object({
  healthCycleId: z.string().optional(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});
