import { Blob } from "expo-blob";

// PUT direto no S3 com a URL assinada (Spec 01, seção 4 passo 1) — corpo
// binário puro, mesmo Content-Type usado ao pedir a URL.
//
// Lê o arquivo via arrayBuffer() (não passa pelo Blob store nativo do React
// Native) e constrói o Blob explicitamente com expo-blob, em vez de
// Response.blob() — evita o aviso de performance do RN Blob (cópia +
// round-trip em base64 pela bridge) confirmado em investigação anterior
// como inofensivo, mas incômodo; expo-blob é a implementação recomendada
// pelo próprio aviso.
export async function uploadFileToS3(uploadUrl: string, fileUri: string, contentType: string): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const arrayBuffer = await fileResponse.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: contentType });

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    // expo-blob's Blob is structurally incompatible with lib.dom's BodyInit
    // type (ArrayBufferLike vs ArrayBuffer narrowing on bytes()) — a typing
    // friction point only, works fine as a fetch body at runtime.
    body: blob as unknown as BodyInit,
  });

  if (!uploadResponse.ok) {
    throw new Error("Falha ao enviar o arquivo. Tente novamente.");
  }
}
