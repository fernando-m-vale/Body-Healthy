import { router } from "expo-router";
import { UploadDropzoneScreen } from "../src/components/UploadDropzoneScreen";
import { useUploadFlow } from "../src/upload/use-upload-flow";
import { getUploadUrl, registerExam } from "../src/api/exams";

// Tela — Upload de exame (mockups.html, classe .s11). Spec 01, seção 3.1:
// "por que pedimos" e o reforço de que não há diagnóstico/análise médica,
// exibidos antes do usuário concluir o envio. Apresentação compartilhada
// com a tela de upload de laudo de imagem (UploadDropzoneScreen) — só a
// copy e as chamadas de API mudam por domínio.
export default function ExamUploadScreen() {
  const flow = useUploadFlow({
    getUploadUrl,
    register: (token, fileKey, fileType) => registerExam(token, fileKey, fileType),
    onUploaded: (exam) => router.replace(`/exam-status/${exam.id}`),
  });

  return (
    <UploadDropzoneScreen
      title="Novo exame"
      infoBoldText="Por que pedimos: "
      infoText="seus marcadores ajudam a personalizar seu plano e acompanhar sua evolução ao longo do tempo. Não fazemos diagnóstico — a leitura clínica continua sendo do seu médico."
      formatsText="Fleury, Dasa, Hermes Pardini ou outro laboratório"
      flow={flow}
    />
  );
}
