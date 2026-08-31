import { z } from "zod";

// Formato pedido à IA (Spec 02, seção 5 passo 3): resumo em linguagem simples,
// achados individuais (sinalizando os fora do padrão de referência do próprio
// laudo), e data do exame se identificável. isImagingReport cobre o caso de
// "arquivo não é laudo de imagem médico" (seção 7) — mesmo princípio do
// isLabExam da Spec 01.
export const summaryResultSchema = z.object({
  isImagingReport: z.boolean().describe(
    "false se o documento não for reconhecível como laudo de imagem médico (ex.: ilegível, outro tipo de documento)",
  ),
  examDate: z
    .string()
    .nullable()
    .describe("Data do laudo no formato ISO 8601 (YYYY-MM-DD), se identificável no documento; null caso contrário"),
  summary: z
    .string()
    .describe(
      "Resumo em linguagem simples dos achados relevantes, sem jargão médico não explicado, tom informativo " +
        "e nunca alarmista, reforçando que não substitui avaliação médica",
    ),
  findings: z.array(
    z.object({
      description: z.string().describe("Um achado individual do laudo, em linguagem simples"),
      outOfReferenceRange: z
        .boolean()
        .describe("true se o próprio laudo indicar que este achado está fora do padrão/referência esperado"),
    }),
  ),
});
export type SummaryResult = z.infer<typeof summaryResultSchema>;
