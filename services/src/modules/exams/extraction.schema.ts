import { z } from "zod";

// Formato pedido à IA (Spec 01, seção 4 passo 3): marcadores em JSON
// estruturado (nome, valor, unidade, faixa de referência min/max, data do
// exame se identificável). isLabExam cobre o caso de "arquivo ilegível/não é
// exame de sangue" (seção 6) — a IA deve sinalizar em vez de inventar marcador.
export const extractionResultSchema = z.object({
  isLabExam: z.boolean().describe(
    "false se o documento não for reconhecível como exame laboratorial (ex.: ilegível, outro tipo de documento)",
  ),
  examDate: z
    .string()
    .nullable()
    .describe("Data do exame no formato ISO 8601 (YYYY-MM-DD), se identificável no documento; null caso contrário"),
  markers: z.array(
    z.object({
      name: z.string().describe('Nome do marcador, ex.: "Glicose em jejum"'),
      value: z.number(),
      unit: z.string().describe('Unidade, ex.: "mg/dL"'),
      referenceMin: z.number().nullable(),
      referenceMax: z.number().nullable(),
    }),
  ),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
