import { router, useLocalSearchParams } from "expo-router";
import { ProcessingStatusScreen } from "../../src/components/ProcessingStatusScreen";
import { useStatusPolling } from "../../src/upload/use-status-polling";
import { getCycle } from "../../src/api/cycles";

const DONE_STATUSES = ["generated"] as const;

// Tela — Status de geração do ciclo. Spec 05, seção 6 passo 3: "generating"
// → "generated"/"failed". Mesma tela compartilhada de exame/laudo
// (ProcessingStatusScreen + useStatusPolling) — geração de ciclo segue o
// mesmo padrão assíncrono, só troca o endpoint.
export default function CycleStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { status, error, slow } = useStatusPolling({
    id,
    fetchStatus: getCycle,
    doneStatuses: DONE_STATUSES,
    failedStatus: "failed",
    onDone: () => router.replace(`/cycle-plan/${id}`),
  });

  return (
    <ProcessingStatusScreen
      status={status}
      error={error}
      slow={slow}
      title="Montando seu plano"
      bodyText="Isso pode levar alguns minutos. A gente te avisa assim que terminar."
      failedTitle="Não conseguimos gerar"
      failedText="Algo deu errado ao montar seu plano e treino. Você pode tentar de novo."
      onRetry={() => router.replace("/cycle-declare")}
      activeStatus="generating"
    />
  );
}
