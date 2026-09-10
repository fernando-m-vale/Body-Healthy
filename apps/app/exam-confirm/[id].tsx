import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { MarkerRow, type MarkerEditState } from "../../src/components/MarkerRow";
import { confirmExam, discardExam, getExam, type ExamDetail } from "../../src/api/exams";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { colors } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

function toEditState(marker: ExamDetail["markers"][number]): MarkerEditState {
  return {
    value: String(marker.value),
    unit: marker.unit,
    referenceMin: marker.referenceMin != null ? String(marker.referenceMin) : "",
    referenceMax: marker.referenceMax != null ? String(marker.referenceMax) : "",
  };
}

function parseNumber(text: string): number {
  return Number(text.trim().replace(",", "."));
}

// Tela — Confirmação de marcadores (mockups.html, label "Confirmação de
// exame"). Spec 01, RNF03: revisão humana obrigatória, não pulável. Nome do
// marcador nunca editável; valor/unidade/faixa editáveis por marcador
// (MarkerRow) antes de confirmar.
export default function ExamConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [edits, setEdits] = useState<Record<string, MarkerEditState>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    getExam(token, id)
      .then((result) => {
        setExam(result);
        const initialEdits: Record<string, MarkerEditState> = {};
        for (const marker of result.markers) {
          initialEdits[marker.id] = toEditState(marker);
        }
        setEdits(initialEdits);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Não foi possível carregar o exame.");
      });
  }, [id, token]);

  function updateMarker(markerId: string, patch: Partial<MarkerEditState>) {
    setEdits((prev) => ({ ...prev, [markerId]: { ...prev[markerId], ...patch } }));
  }

  async function handleConfirm() {
    if (!token || !id || !exam) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await confirmExam(
        token,
        id,
        exam.markers.map((marker) => {
          const edit = edits[marker.id];
          return {
            id: marker.id,
            value: parseNumber(edit.value),
            unit: edit.unit,
            referenceMin: edit.referenceMin.trim() ? parseNumber(edit.referenceMin) : null,
            referenceMax: edit.referenceMax.trim() ? parseNumber(edit.referenceMax) : null,
          };
        }),
      );
      // Feedback provisório (sem Dashboard ainda pra navegar mostrando o
      // exame na linha do tempo) — mesma lógica do placeholder pós-onboarding.
      Alert.alert("Exame confirmado", `${exam.markers.length} marcador(es) salvos com sucesso.`, [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Não foi possível confirmar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDiscardPress() {
    Alert.alert(
      "Não é meu exame?",
      "Isso descarta este exame — os dados extraídos não são salvos. Você pode enviar outro arquivo depois.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Descartar", style: "destructive", onPress: handleDiscardConfirmed },
      ],
    );
  }

  async function handleDiscardConfirmed() {
    if (!token || !id) return;
    setSubmitError(null);
    setDiscarding(true);
    try {
      await discardExam(token, id);
      router.replace("/exam-upload");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Não foi possível descartar. Tente novamente.");
    } finally {
      setDiscarding(false);
    }
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredContainer}>
          <Text style={[typography.bodySmall, styles.centeredText]}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exam) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredContainer}>
          <Text style={typography.bodySmall}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Text style={typography.h2}>Revisar exame</Text>
        <Text style={[typography.bodySmall, styles.sub]}>Confira os valores antes de confirmar</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {exam.markers.map((marker) => (
          <MarkerRow
            key={marker.id}
            name={marker.name}
            edit={edits[marker.id]}
            onChange={(patch) => updateMarker(marker.id, patch)}
          />
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        <Button label="Confirmar marcadores" onPress={handleConfirm} loading={submitting} disabled={discarding} />
        <Button
          label="Não é meu exame"
          variant="link"
          onPress={handleDiscardPress}
          loading={discarding}
          disabled={submitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centeredText: {
    textAlign: "center",
  },
  top: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sub: {
    marginTop: 4,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottom: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginBottom: 10,
    textAlign: "center",
  },
});
