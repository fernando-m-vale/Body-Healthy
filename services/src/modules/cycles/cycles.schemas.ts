import { z } from "zod";

export const objectiveCategorySchema = z.enum(["massa_magra", "perda_gordura", "manutencao", "outro"]);

export const createCycleBodySchema = z.object({
  objectiveText: z.string().min(1),
  objectiveCategory: objectiveCategorySchema.nullable().optional(),
  weeklyTrainingDays: z.number().int().min(1).max(7).nullable().optional(),
  nextCycleExpectedDate: z.string().datetime().nullable().optional(),
});
export type CreateCycleBody = z.infer<typeof createCycleBodySchema>;

// Edição de exercício (Spec 05, seção 6 passo 5): omitido mantém valor atual,
// null limpa (para campos nullable) — mesmo padrão já usado nas Specs 00/03.
export const updateExerciseBodySchema = z.object({
  dayLabel: z.string().min(1).optional(),
  orderIndex: z.number().int().optional(),
  exerciseName: z.string().min(1).optional(),
  sets: z.number().int().positive().optional(),
  reps: z.string().min(1).optional(),
  restSeconds: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  technique: z.string().nullable().optional(),
});
export type UpdateExerciseBody = z.infer<typeof updateExerciseBodySchema>;

export const feedbackBodySchema = z.object({
  feedbackText: z.string().min(1),
});
export type FeedbackBody = z.infer<typeof feedbackBodySchema>;

// Spec 06, seção 9 — PUT /cycles/:id/next-cycle-date
export const nextCycleDateBodySchema = z.object({
  nextCycleExpectedDate: z.string().datetime().nullable(),
});
export type NextCycleDateBody = z.infer<typeof nextCycleDateBodySchema>;

export const exerciseSchema = z.object({
  id: z.string(),
  dayLabel: z.string(),
  orderIndex: z.number(),
  exerciseName: z.string(),
  sets: z.number(),
  reps: z.string(),
  restSeconds: z.number().nullable(),
  notes: z.string().nullable(),
  technique: z.string().nullable(),
  isNew: z.boolean(),
});

const workoutPlanSchema = z.object({
  id: z.string(),
  userEdited: z.boolean(),
  exercises: z.array(exerciseSchema),
});

export const phaseSchema = z.object({
  id: z.string(),
  orderIndex: z.number(),
  phaseLabel: z.string(),
  title: z.string(),
  focusText: z.string(),
});

export const cycleSummarySchema = z.object({
  id: z.string(),
  objectiveText: z.string(),
  objectiveCategory: z.string().nullable(),
  weeklyTrainingDays: z.number().nullable(),
  status: z.string(),
  dailyCalorieGoal: z.number().nullable(),
  proteinGramsGoal: z.number().nullable(),
  carbGramsGoal: z.number().nullable(),
  fatGramsGoal: z.number().nullable(),
  nextCycleExpectedDate: z.date().nullable(),
  createdAt: z.date(),
  generatedAt: z.date().nullable(),
});

export const cycleDetailSchema = cycleSummarySchema.extend({
  actionPlanText: z.string().nullable(),
  workoutPlan: workoutPlanSchema.nullable(),
  phases: z.array(phaseSchema),
});

export const feedbackResponseSchema = z.object({
  id: z.string(),
  healthCycleId: z.string(),
  feedbackText: z.string(),
  createdAt: z.date(),
  triggeredRegeneration: z.boolean(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const cycleIdParamsSchema = z.object({
  id: z.string(),
});

export const exerciseIdParamsSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
});
