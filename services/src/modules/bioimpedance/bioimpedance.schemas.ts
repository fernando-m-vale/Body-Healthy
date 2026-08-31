import { z } from "zod";

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 300;
const MIN_LEAN_MASS_KG = 10;
const MAX_LEAN_MASS_KG = 200;

// RF04a — todos os campos numéricos são opcionais (spec, seção 4/7); só
// measuredAt é obrigatório (registro sem data não tem utilidade em série
// temporal). PUT usa o mesmo body — omitido mantém valor atual, null limpa.
export const bioimpedanceEntryBodySchema = z.object({
  measuredAt: z.string().datetime(),
  weightKg: z.number().min(MIN_WEIGHT_KG).max(MAX_WEIGHT_KG).nullable().optional(),
  bodyFatPercent: z.number().min(0).max(100).nullable().optional(),
  leanMassKg: z.number().min(MIN_LEAN_MASS_KG).max(MAX_LEAN_MASS_KG).nullable().optional(),
  extraMetrics: z.record(z.string(), z.unknown()).nullable().optional(),
  deviceName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type BioimpedanceEntryBody = z.infer<typeof bioimpedanceEntryBodySchema>;

const trendValueSchema = z.enum(["up", "down", "stable"]).nullable();

export const bioimpedanceTrendSchema = z.object({
  weightKg: trendValueSchema,
  bodyFatPercent: trendValueSchema,
  leanMassKg: trendValueSchema,
});

export const bioimpedanceEntryResponseSchema = z.object({
  id: z.string(),
  measuredAt: z.date(),
  weightKg: z.number().nullable(),
  bodyFatPercent: z.number().nullable(),
  leanMassKg: z.number().nullable(),
  extraMetrics: z.unknown().nullable(),
  deviceName: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  trend: bioimpedanceTrendSchema,
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const bioimpedanceIdParamsSchema = z.object({
  id: z.string(),
});
