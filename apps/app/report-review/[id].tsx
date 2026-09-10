import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { ActionSheet } from "../../src/components/ActionSheet";
import {
  getReport,
  reviewReport,
  retryReport,
  discardReport,
  type ReportDetail,
} from "../../src/api/imaging-reports";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { colors, radii } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

function formatEyebrow(report: ReportDetail): string {
  const label = report.reportType ?? "Laudo de imagem";
  if (!report.examDate) return label;
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(report.examDate),
  );
  return `${label} — ${date}`;
}

// Tela — Revisão de resumo de laudo (mockups.html, "Revisão de laudo de
// imagem"). Spec 02, seção 5 passo 5: aceitar ou sinalizar como incorreto.
// Diferente do exame (Spec 01), não há edição de campo estruturado — é
// texto único.
export default function ReportReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [flagging, setFlagging] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    getReport(token, id)
      .then(setReport)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Não foi possível carregar o laudo."));
  }, [id, token]);

  async function handleAccept() {
    if (!token || !id) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await reviewReport(token, id, false);
      Alert.alert("Resumo aceito", "O resumo do laudo foi salvo com sucesso.", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmFlag() {
    if (!token || !id) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await reviewReport(token, id, true, comment.trim() || undefined);
      setSheetVisible(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Não foi possível sinalizar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    if (!token || !id) return;
    setActionError(null);
    try {
      await retryReport(token, id);
      router.replace(`/report-status/${id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível reprocessar. Tente novamente.");
    }
  }

  async function handleDiscard(destination: "/report-upload" | "/home") {
    if (!token || !id) return;
    setActionError(null);
    try {
      await discardReport(token, id);
      router.replace(destination);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível descartar. Tente novamente.");
    }
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={[typography.bodySmall, styles.centeredText]}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={typography.bodySmall}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{formatEyebrow(report)}</Text>
        <Text style={typography.h2}>Resumo do laudo</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{report.aiSummary}</Text>
        </View>
        <Text style={styles.note}>
          Resumo informativo em linguagem simples — não substitui a leitura do seu médico sobre o laudo original.
        </Text>

        {flagging ? (
          <View style={styles.flagArea}>
            <TextField
              label="Quer contar o que não bateu? (opcional)"
              value={comment}
              onChangeText={setComment}
              placeholder="Ex.: o resumo fala de outro exame"
              multiline
            />
            {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
            <Button label="Confirmar sinalização" onPress={handleConfirmFlag} loading={submitting} />
          </View>
        ) : null}
      </ScrollView>

      {!flagging ? (
        <View style={styles.bottom}>
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
          <Button label="Aceitar resumo" onPress={handleAccept} loading={submitting} />
          <Button label="Não reflete meu laudo" variant="link" onPress={() => setFlagging(true)} style={styles.flagButton} />
        </View>
      ) : null}

      <ActionSheet
        visible={sheetVisible}
        title="O que você quer fazer?"
        onClose={() => setSheetVisible(false)}
        options={[
          {
            key: "retry",
            icon: "↻",
            title: "Tentar reprocessar",
            subtitle: "Reenviamos o mesmo arquivo",
            onPress: handleRetry,
          },
          {
            key: "replace",
            icon: "↑",
            title: "Enviar outro arquivo",
            subtitle: "Substitui este laudo",
            onPress: () => handleDiscard("/report-upload"),
          },
          {
            key: "discard",
            icon: "×",
            title: "Não subir agora",
            subtitle: "Descarta este envio",
            variant: "warn",
            onPress: () => handleDiscard("/home"),
          },
        ]}
      />
      {actionError ? (
        <View style={styles.actionErrorWrap}>
          <Text style={styles.error}>{actionError}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centeredText: {
    textAlign: "center",
  },
  top: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 4,
  },
  eyebrow: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 22,
  },
  summaryCard: {
    backgroundColor: colors.mist,
    borderRadius: radii.card,
    padding: 18,
    marginTop: 16,
    marginBottom: 14,
  },
  summaryText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.7,
    color: colors.ink,
  },
  note: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.5,
  },
  flagArea: {
    marginTop: 20,
  },
  bottom: {
    padding: 22,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  flagButton: {
    marginTop: 4,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginBottom: 10,
    textAlign: "center",
  },
  actionErrorWrap: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
});
