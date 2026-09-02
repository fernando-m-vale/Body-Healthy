import { useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { ActionSheet } from "../src/components/ActionSheet";
import { getUploadUrl, registerExam } from "../src/api/exams";
import { uploadFileToS3 } from "../src/upload/upload-file";
import { pickFromCamera, pickFromDocument, type PickedExamFile } from "../src/upload/pick-exam-file";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

// Tela — Upload de exame (mockups.html, classe .s11). Spec 01, seção 3.1:
// "por que pedimos" e o reforço de que não há diagnóstico/análise médica,
// exibidos antes do usuário concluir o envio.
export default function ExamUploadScreen() {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState<PickedExamFile | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePick(picker: () => Promise<PickedExamFile | null>) {
    setError(null);
    try {
      const file = await picker();
      if (file) {
        setSelectedFile(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível selecionar o arquivo.");
    }
  }

  async function handleContinue() {
    if (!selectedFile || !token) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { uploadUrl, fileKey } = await getUploadUrl(token, selectedFile.fileType, selectedFile.mimeType);
      await uploadFileToS3(uploadUrl, selectedFile.uri, selectedFile.mimeType);
      const exam = await registerExam(token, fileKey, selectedFile.fileType);
      router.replace(`/exam-status/${exam.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Não foi possível enviar o exame. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <Text style={typography.h2}>Novo exame</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Por que pedimos: </Text>
              seus marcadores ajudam a personalizar seu plano e acompanhar sua evolução ao longo do tempo. Não
              fazemos diagnóstico — a leitura clínica continua sendo do seu médico.
            </Text>
          </View>

          <Pressable style={styles.dropzone} onPress={() => setSheetVisible(true)}>
            <View style={styles.dropzoneIcon}>
              <Text style={styles.dropzoneIconText}>↑</Text>
            </View>
            {selectedFile ? (
              <>
                <Text style={styles.dropzoneTitle}>{selectedFile.name}</Text>
                <Text style={styles.dropzoneSub}>Toque pra trocar o arquivo</Text>
              </>
            ) : (
              <>
                <Text style={styles.dropzoneTitle}>Tirar foto ou escolher arquivo</Text>
                <Text style={styles.dropzoneSub}>PDF ou imagem, até 20MB</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.formats}>Fleury, Dasa, Hermes Pardini ou outro laboratório</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Button label="Continuar" onPress={handleContinue} loading={loading} disabled={!selectedFile} />
      </View>

      <ActionSheet
        visible={sheetVisible}
        title="Como você quer enviar?"
        onClose={() => setSheetVisible(false)}
        options={[
          {
            key: "camera",
            icon: "◎",
            title: "Tirar foto",
            subtitle: "Usa a câmera do celular",
            onPress: () => handlePick(pickFromCamera),
          },
          {
            key: "document",
            icon: "↑",
            title: "Escolher arquivo",
            subtitle: "PDF ou imagem já salvos",
            onPress: () => handlePick(pickFromDocument),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
  },
  infoBox: {
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  infoText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.6,
    color: colors.muted,
  },
  infoBold: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.ink,
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 38,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  dropzoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  dropzoneIconText: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 20,
    color: colors.vital,
  },
  dropzoneTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
    textAlign: "center",
  },
  dropzoneSub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  formats: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 11.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: 14,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 16,
  },
});
