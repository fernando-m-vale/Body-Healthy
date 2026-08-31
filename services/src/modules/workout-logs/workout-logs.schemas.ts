import { z } from "zod";

// Precisa de ao menos um identificador do que foi executado (spec, seção 10).
export const createWorkoutLogBodySchema = z
  .object({
    workoutExerciseId: z.string().nullable().optional(),
    exerciseNameFreeText: z.string().nullable().optional(),
    performedAt: z.string().datetime(),
    setsCompleted: z.number().int().positive().nullable().optional(),
    repsCompleted: z.string().nullable().optional(),
    weightUsedKg: z.number().min(0).max(500).nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => Boolean(data.workoutExerciseId) || Boolean(data.exerciseNameFreeText), {
    message: "Informe workoutExerciseId ou exerciseNameFreeText",
    path: ["exerciseNameFreeText"],
  });
export type CreateWorkoutLogBody = z.infer<typeof createWorkoutLogBodySchema>;

export const workoutLogResponseSchema = z.object({
  id: z.string(),
  workoutExerciseId: z.string().nullable(),
  exerciseNameFreeText: z.string().nullable(),
  performedAt: z.date(),
  setsCompleted: z.number().nullable(),
  repsCompleted: z.string().nullable(),
  weightUsedKg: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

export const listWorkoutLogsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
