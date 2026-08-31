import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, buildDocumentBlock } from "../../lib/ai-document";
import type { S3Object } from "../../lib/s3";
import { extractionResultSchema, type ExtractionResult } from "./extraction.schema";

const EXTRACTION_MODEL = "claude-opus-5";

const EXTRACTION_PROMPT = `Você está analisando um exame laboratorial de sangue (PDF ou foto), possivelmente de um laboratório brasileiro (Fleury, Dasa, Hermes Pardini ou outro).

Extraia cada marcador/analito reportado no documento: nome (como aparece no laudo), valor numérico, unidade, e faixa de referência mínima/máxima quando informada. Extraia também a data do exame, se identificável.

Se o documento não for um exame laboratorial de sangue (ilegível, outro tipo de documento, etc.), retorne isLabExam: false e markers: [] — nunca invente marcadores para um documento que não seja um exame reconhecível.`;

export async function extractLabMarkers(file: S3Object): Promise<ExtractionResult> {
  const response = await getAnthropicClient().messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: [buildDocumentBlock(file), { type: "text", text: EXTRACTION_PROMPT }],
      },
    ],
    output_config: { format: zodOutputFormat(extractionResultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Falha ao interpretar a resposta estruturada da IA");
  }

  return response.parsed_output;
}
