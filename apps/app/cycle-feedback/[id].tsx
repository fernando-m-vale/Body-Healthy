import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { BackButton } from "../../src/components/BackButton";
import { getCycle, createFeedback, type CycleStatus } from "../../src/api/cycles";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { colors, radii } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

const QUICK_TAGS = ["Trocar exercício", "Reduzir volume", "Mudar frequência"];

// Tela — Feedback do plano (mockups.html, classe .s18). Spec 05, seção 9:
// "status: 'generating' bloqueia novo POST /cycles/:id/feedback até
// resolver" — checado aqui na tela (não só confiando no erro 409 da API),
// pra já entrar bloqueada se uma regeneração anterior ainda estiver rolando.
export default function CycleFeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [status, setStatus] = useState<CycleStatus | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    getCycle(token, id)
      .then((cycle) => setStatus(cycle.status))
      .catch((err) => setCheckError(err instanceof ApiError ? err.message : "Não foi possível carregar o ciclo."));
  }, [id, token]);

  function appendTag(tag: string) {
    setFeedbackText((prev) => (prev.trim() ? `${prev.trim()} — ${tag}` : tag));
  }

  async function handleSubmit() {
    if (!token || !id) return;
    if (!feedbackText.trim()) {
      setSubmitError("Conte o que não está funcionando.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await createFeedback(token, id, feedbackText.trim());
      router.replace(`/cycle-status/${id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={[typography.bodySmall, styles.centeredText]}>{checkError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={typography.bodySmall}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === "generating") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <BackButton />
          <View style={styles.centered}>
            <Text style={typography.h2}>Seu plano está sendo atualizado</Text>
            <Text style={[typography.bodySmall, styles.blockedText]}>
              Já existe uma nova versão sendo gerada a partir de um feedback anterior. Aguarde terminar antes de
              enviar outro.
            </Text>
            <Button label="Ver status" variant="secondary" onPress={() => router.replace(`/cycle-status/${id}`)} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BackButton />
        <Text style={typography.h2}>Ajustar plano</Text>
        <Text style={[typography.bodySmall, styles.sub]}>Conte o que não está funcionando</Text>

        <TextInput
          style={styles.textarea}
          value={feedbackText}
          onChangeText={setFeedbackText}
          placeholder="Ex.: não consigo fazer agachamento, tenho dor no joelho"
          placeholderTextColor={colors.muted}
          multiline
        />

        <View style={styles.chipRow}>
          {QUICK_TAGS.map((tag) => (
            <Pressable key={tag} style={styles.chip} onPress={() => appendTag(tag)}>
              <Text style={styles.chipText}>{tag}</Text>
            </Pressable>
          ))}
        </View>

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      </View>

      <View style={styles.bottom}>
        <Button label="Enviar feedback" onPress={handleSubmit} loading={submitting} />
        <Text style={styles.note}>Geramos uma nova versão em alguns minutos</Text>
      </View>
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
    paddingHorizontal: 8,
    gap: 12,
  },
  centeredText: {
    textAlign: "center",
  },
  blockedText: {
    textAlign: "center",
    marginBottom: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  sub: {
    marginTop: 4,
    marginBottom: 18,
  },
  textarea: {
    height: 110,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.muted,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 16,
    textAlign: "center",
  },
  bottom: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 10,
  },
  note: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 10,
  },
});
