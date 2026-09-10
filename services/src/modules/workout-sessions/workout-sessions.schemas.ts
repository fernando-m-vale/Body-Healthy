import { z } from "zod";
import { exerciseSchema } from "../cycles/cycles.schemas";

// Spec 09, seção 4 — sessão vinculada a um dia (WorkoutPlan.dayLabel) ou
// livre (dayLabel: null).
export const startSessionBodySchema = z.object({
  dayLabel: z.string().min(1).nullable().optional(),
});
export type StartSessionBody = z.infer<typeof startSessionBodySchema>;

export const sessionSummarySchema = z.object({
  id: z.string(),
  healthCycleId: z.string().nullable(),
  dayLabel: z.string().nullable(),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  durationSeconds: z.number().nullable(),
});

export const setLogSchema = z.object({
  id: z.string(),
  workoutExerciseId: z.string().nullable(),
  exerciseNameFreeText: z.string().nullable(),
  exerciseOrderIndex: z.number(),
  setNumber: z.number(),
  weightKg: z.number().nullable(),
  repsCompleted: z.string().nullable(),
  completed: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Precisa de ao menos um identificador do que está sendo executado — mesma
// regra já usada na Spec 06 (WorkoutExecutionLog, agora removido).
export const upsertSetBodySchema = z
  .object({
    workoutExerciseId: z.string().nullable().optional(),
    exerciseNameFreeText: z.string().nullable().optional(),
    exerciseOrderIndex: z.number().int().min(0),
    setNumber: z.number().int().positive(),
    weightKg: z.number().min(0).max(500).nullable().optional(),
    repsCompleted: z.string().nullable().optional(),
    completed: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => Boolean(data.workoutExerciseId) || Boolean(data.exerciseNameFreeText), {
    message: "Informe workoutExerciseId ou exerciseNameFreeText",
    path: ["exerciseNameFreeText"],
  });
export type UpsertSetBody = z.infer<typeof upsertSetBodySchema>;

// GET /workout-sessions/:id (Spec 09, seção 7) — inclui technique/notes/
// restSeconds de cada exercício do dia, já vindos do WorkoutExercise (Spec
// 05), e as séries já registradas nesta sessão.
export const sessionDetailSchema = sessionSummarySchema.extend({
  exercises: z.array(exerciseSchema),
  setLogs: z.array(setLogSchema),
});

// GET /workout-sessions (histórico bruto, seção 7) — inclui os setLogs de
// cada sessão (não só o resumo): é o que o cliente usa pra calcular a
// pré-sugestão de série a partir da sessão mais recente que tocou o mesmo
// exercício (seção 5.2), sem precisar de um endpoint dedicado pra isso.
export const sessionHistoryItemSchema = sessionSummarySchema.extend({
  setLogs: z.array(setLogSchema),
});

export const sessionIdParamsSchema = z.object({
  id: z.string(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const activeSessionErrorResponseSchema = z.object({
  error: z.string(),
  activeSessionId: z.string(),
});
