import { router, useLocalSearchParams } from "expo-router";
import { ProcessingStatusScreen } from "../../src/components/ProcessingStatusScreen";
import { useStatusPolling } from "../../src/upload/use-status-polling";
import { getExam } from "../../src/api/exams";

const DONE_STATUSES = ["pending_confirmation"] as const;

// Tela — Status de processamento (mockups.html, classe .s15). Spec 01,
// seção 4 passos 2-4: acompanha "uploaded" → "processing" →
// "pending_confirmation"/"failed". Apresentação compartilhada com a tela
// de status do laudo de imagem (ProcessingStatusScreen).
export default function ExamStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { status, error, slow } = useStatusPolling({
    id,
    fetchStatus: getExam,
    doneStatuses: DONE_STATUSES,
    failedStatus: "failed",
    onDone: () => router.replace(`/exam-confirm/${id}`),
  });

  return (
    <ProcessingStatusScreen
      status={status}
      error={error}
      slow={slow}
      title="Analisando seu exame"
      bodyText="Isso pode levar alguns minutos. A gente te avisa assim que terminar."
      failedTitle="Não conseguimos processar"
      failedText="Algo deu errado na extração dos marcadores. Você pode tentar enviar de novo."
      onRetry={() => router.replace("/exam-upload")}
    />
  );
}
