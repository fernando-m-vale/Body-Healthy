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
              notes: z.string().nullable().describe("Ex.: nota de progressão ou dica geral de execução (postura, amplitude, cadência)"),
              technique: z
                .string()
                .nullable()
                .describe(
                  'Nome livre da técnica de execução, só quando fizer sentido (ex.: "drop-set", "rest-pause", ' +
                    '"superset", "bi-set", "excêntrico controlado"). null na maioria dos exercícios — não é ' +
                    "vocabulário fechado, descreva com suas próprias palavras quando houver uma técnica específica.",
                ),
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
  phases: z
    .array(
      z.object({
        orderIndex: z.number().int(),
        phaseLabel: z
          .string()
          .describe(
            'Ex.: "Semanas 1-4" — SEMPRE relativo ao tempo do ciclo de treino, nunca a início/fim/duração de ' +
              "qualquer item de prescrição (medicação, hormônio, suplemento).",
          ),
        title: z.string().describe('Ex.: "Volume"'),
        focusText: z
          .string()
          .describe(
            "1-2 frases explicando o foco da fase. NUNCA mencione prescrição, medicação, hormônio ou " +
              "suplemento aqui, nem indiretamente (ex.: nunca 'nesta fase a medicação X está mais ativa' ou " +
              "'encerrando o uso de Y') — mesmo que o contexto agregado contenha prescrições, periodização " +
              "não as referencia de jeito nenhum.",
          ),
      }),
    )
    .optional()
    .describe(
      "Periodização OPCIONAL do treino em fases progressivas — omita completamente se não fizer sentido para " +
        "este ciclo. Quando presente, cada fase é definida exclusivamente em relação ao tempo do ciclo de " +
        "treino, nunca a protocolo médico/hormonal.",
    ),
});
export type GenerationResult = z.infer<typeof generationResultSchema>;
