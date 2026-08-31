import { z } from "zod";

// Saída estruturada única da IA (Spec 05, seção 6 passo 3): plano de ação em
// texto + treino estruturado, na mesma chamada.
export const generationResultSchema = z.object({
  actionPlanText: z
    .string()
    .describe(
      "Plano de ação em linguagem simples (nutrição, treino, sono), nunca sugerindo dose/ajuste/início/fim " +
        "de medicação — prescrições são só contexto histórico. Se o sexo biológico usado no cálculo calórico " +
        "for a média de ambas as fórmulas, sinalizar que a estimativa é menos precisa.",
    ),
  workoutDays: z
    .array(
      z.object({
        dayLabel: z.string().describe('Ex.: "Dia A — Peito/Tríceps"'),
        exercises: z
          .array(
            z.object({
              orderIndex: z.number().int(),
              exerciseName: z.string(),
              sets: z.number().int(),
              reps: z.string().describe('Texto livre, ex.: "8-12" ou "até a falha"'),
              restSeconds: z.number().int().nullable(),
              notes: z.string().nullable().describe("Ex.: nota de progressão"),
            }),
          )
          .min(1)
          .describe("Lista completa de exercícios deste dia — nunca vazia; cada dia citado precisa ter exercícios de verdade aqui, não só descrição em texto"),
      }),
    )
    .min(1)
    .describe(
      "Treino estruturado completo, dia a dia — obrigatório, mesmo nível de detalhe do que está descrito em " +
        "prosa no actionPlanText. Nunca retornar vazio: se o actionPlanText menciona dias de treino, cada um " +
        "deles precisa aparecer aqui com seus exercícios.",
    ),
});
export type GenerationResult = z.infer<typeof generationResultSchema>;
