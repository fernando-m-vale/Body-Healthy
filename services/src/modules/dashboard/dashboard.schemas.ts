import { z } from "zod";

// Filtro por período + paginação sobre a lista já mesclada (decisão registrada
// no planejamento desta tarefa — volume esperado de um MVP pessoal não exige
// paginação por fonte).
export const timelineQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;

export const timelineItemTypeSchema = z.enum([
  "lab_exam",
  "imaging_report",
  "bioimpedance",
  "prescription",
  "health_cycle",
  "weekly_checkin",
  "daily_calorie_log",
]);

// data é intencionalmente z.unknown() — o payload varia por type; o
// consumidor (frontend) faz o narrowing pelo campo type.
export const timelineItemSchema = z.object({
  type: timelineItemTypeSchema,
  date: z.string(),
  data: z.unknown(),
});

export const timelineResponseSchema = z.object({
  items: z.array(timelineItemSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

export const markerNameParamsSchema = z.object({
  markerName: z.string(),
});

export const markerHistoryItemSchema = z.object({
  labExamId: z.string(),
  examDate: z.date().nullable(),
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  referenceMin: z.number().nullable(),
  referenceMax: z.number().nullable(),
  trend: z.string().nullable(),
});

export const markerHistoryResponseSchema = z.object({
  markerName: z.string(),
  history: z.array(markerHistoryItemSchema),
});

export const currentCycleResponseSchema = z.object({
  cycleId: z.string().nullable(),
  status: z.string().nullable(),
  dailyCalorieGoal: z.number().nullable(),
  nextCycleExpectedDate: z.date().nullable(),
  daysUntilNextCycle: z.number().nullable(),
  adherenceRate: z.number().nullable(),
});
