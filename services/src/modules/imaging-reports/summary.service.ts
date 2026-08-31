import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, buildDocumentBlock } from "../../lib/ai-document";
import type { S3Object } from "../../lib/s3";
import { summaryResultSchema, type SummaryResult } from "./summary.schema";

const SUMMARY_MODEL = "claude-opus-5";

const SUMMARY_PROMPT = `Você está analisando um laudo de imagem médica (ex.: ultrassom, ecodopplercardiograma, radiografia), PDF ou foto.

Gere um resumo em linguagem simples dos achados relevantes e da impressão diagnóstica, sem jargão médico não explicado. O tom deve ser sempre informativo, nunca alarmista, mesmo que algum achado pareça grave — o resumo não é uma interpretação médica e não substitui a leitura do laudo original pelo médico do paciente.

Liste também cada achado individualmente, sinalizando quais estão fora do padrão de referência mencionado no próprio laudo. Extraia a data do exame, se identificável.

Se o documento não for um laudo de imagem médico (ilegível, outro tipo de documento, etc.), retorne isImagingReport: false, summary: "" e findings: [] — nunca invente um resumo para um documento que não seja um laudo de imagem reconhecível.`;

export async function summarizeImagingReport(file: S3Object): Promise<SummaryResult> {
  const response = await getAnthropicClient().messages.parse({
    model: SUMMARY_MODEL,
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: [buildDocumentBlock(file), { type: "text", text: SUMMARY_PROMPT }],
      },
    ],
    output_config: { format: zodOutputFormat(summaryResultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Falha ao interpretar a resposta estruturada da IA");
  }

  return response.parsed_output;
}
