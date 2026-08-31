import { z } from "zod";

export const upsertCalorieLogBodySchema = z.object({
  logDate: z.string().datetime(),
  caloriesConsumed: z.number().int().min(0).max(15000).nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type UpsertCalorieLogBody = z.infer<typeof upsertCalorieLogBodySchema>;

export const calorieLogResponseSchema = z.object({
  id: z.string(),
  healthCycleId: z.string().nullable(),
  logDate: z.date(),
  caloriesConsumed: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  // Comparação com a meta calórica do ciclo (Spec 06, seção 7) — calculada na
  // leitura, nunca persistida (mesmo princípio da tendência de bioimpedância,
  // Spec 03). null quando o ciclo não tem dailyCalorieGoal calculado.
  dailyCalorieGoal: z.number().nullable(),
  differenceFromGoal: z.number().nullable(),
});
