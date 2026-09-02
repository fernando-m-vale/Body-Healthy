// PUT direto no S3 com a URL assinada (Spec 01, seção 4 passo 1) — corpo
// binário puro, mesmo Content-Type usado ao pedir a URL. `fetch` no React
// Native resolve URIs locais (file://) via Blob normalmente.
export async function uploadFileToS3(uploadUrl: string, fileUri: string, contentType: string): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Falha ao enviar o arquivo. Tente novamente.");
  }
}
