import Anthropic from "@anthropic-ai/sdk";
import type { S3Object } from "./s3";

// Compartilhado entre Spec 01 (extração de exame) e Spec 02 (resumo de laudo de
// imagem) — mesmo mecanismo de enviar um arquivo (PDF/imagem) do S3 para a API
// da Anthropic, extraído sem alterar o comportamento já testado da Spec 01.

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export function buildDocumentBlock(file: S3Object): Anthropic.Messages.ContentBlockParam {
  const base64 = file.bytes.toString("base64");

  if (file.contentType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };
  }

  return {
    type: "image",
    source: { type: "base64", media_type: file.contentType as "image/jpeg" | "image/png", data: base64 },
  };
}
