import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Escreve o CSV num arquivo temporário e abre a folha de compartilhamento
// nativa — é o único mecanismo confiável e multiplataforma pro usuário
// salvar/enviar o arquivo (Spec 05, seção 7: formato genérico, sem
// dependência de app específico). "Baixar" e "Compartilhar" no mockup
// (Tela 19) usam o mesmo fluxo aqui — a folha de compartilhamento do
// sistema já inclui "Salvar em Arquivos"/"Salvar no dispositivo" como
// opção, então não há um "baixar direto" distinto no mobile.
export async function exportAndShareCsv(csvContent: string, filename: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Compartilhamento não está disponível neste dispositivo.");
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(csvContent);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Exportar treino",
    UTI: "public.comma-separated-values-text",
  });
}
