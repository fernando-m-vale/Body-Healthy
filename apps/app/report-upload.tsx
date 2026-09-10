import { router } from "expo-router";
import { UploadDropzoneScreen } from "../src/components/UploadDropzoneScreen";
import { useUploadFlow } from "../src/upload/use-upload-flow";
import { getUploadUrl, registerReport } from "../src/api/imaging-reports";

// Tela — Upload de laudo de imagem. Reaproveita a tela de Upload de exame
// com copy diferente (sistema-visual.md, seção 7: "Reaproveita tela 4,
// copy diferente"). Spec 02, seção 4.1: "por que pedimos" e reforço do
// disclaimer clínico.
export default function ReportUploadScreen() {
  const flow = useUploadFlow({
    getUploadUrl,
    register: (token, fileKey, fileType) => registerReport(token, fileKey, fileType),
    onUploaded: (report) => router.replace(`/report-status/${report.id}`),
  });

  return (
    <UploadDropzoneScreen
      title="Novo laudo de imagem"
      infoBoldText="Por que pedimos: "
      infoText="o resumo do laudo entra no seu histórico de saúde e ajuda a contextualizar sua evolução junto com exames e bioimpedância, alimentando seu plano de ação. Não fazemos interpretação médica — a leitura do laudo original continua sendo do seu médico."
      formatsText="Ultrassom, ecodopplercardiograma, ressonância ou outro laudo de imagem"
      flow={flow}
    />
  );
}
