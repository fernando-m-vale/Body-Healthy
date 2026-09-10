import { router, useLocalSearchParams } from "expo-router";
import { ProcessingStatusScreen } from "../../src/components/ProcessingStatusScreen";
import { useStatusPolling } from "../../src/upload/use-status-polling";
import { getReport } from "../../src/api/imaging-reports";

const DONE_STATUSES = ["pending_review"] as const;

// Tela — Status de processamento do laudo de imagem. Spec 02, seção 5
// passos 2-4: acompanha "uploaded" → "processing" → "pending_review"/
// "failed". Mesma tela compartilhada do exame (ProcessingStatusScreen) —
// também usada aqui pelo passo "Tentar reprocessar" (retry), que volta o
// status pra "processing" no mesmo registro.
export default function ReportStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { status, error, slow } = useStatusPolling({
    id,
    fetchStatus: getReport,
    doneStatuses: DONE_STATUSES,
    failedStatus: "failed",
    onDone: () => router.replace(`/report-review/${id}`),
  });

  return (
    <ProcessingStatusScreen
      status={status}
      error={error}
      slow={slow}
      title="Analisando seu laudo"
      bodyText="Isso pode levar alguns minutos. A gente te avisa assim que terminar."
      failedTitle="Não conseguimos processar"
      failedText="Algo deu errado ao gerar o resumo do laudo. Você pode tentar enviar de novo."
      onRetry={() => router.replace("/report-upload")}
    />
  );
}
