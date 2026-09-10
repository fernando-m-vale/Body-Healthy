import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { BackButton } from "../src/components/BackButton";
import { ChipRow } from "../src/components/Chip";
import { DateField } from "../src/components/DateField";
import { createCycle, type ObjectiveCategory } from "../src/api/cycles";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

const TODAY = new Date();

const CATEGORY_OPTIONS: { value: ObjectiveCategory; label: string }[] = [
  { value: "massa_magra", label: "Massa magra" },
  { value: "perda_gordura", label: "Perda de gordura" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outro", label: "Outro" },
];

// Mockup (Tela 13) desenhava só 3x-6x; 7x adicionado depois do teste da
// Etapa 1 (uso real mostrou que fazia falta) — decisão que substitui a
// original de ficar restrito ao que o mockup desenhava.
const WEEKLY_DAYS_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: "3x" },
  { value: 4, label: "4x" },
  { value: 5, label: "5x" },
  { value: 6, label: "6x" },
  { value: 7, label: "7x" },
];

function toIsoNoonUtc(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

// Tela — Declaração de objetivo (mockups.html, classe .s7). Spec 05, seção
// 6 passo 1: objectiveText é o único campo obrigatório; categoria,
// weeklyTrainingDays e nextCycleExpectedDate são opcionais (RF04a) — nada
// aqui bloqueia por falta desses três.
export default function CycleDeclareScreen() {
  const { token } = useAuth();
  const [objectiveText, setObjectiveText] = useState("");
  const [category, setCategory] = useState<ObjectiveCategory | null>(null);
  const [nextExamDate, setNextExamDate] = useState<Date | null>(null);
  const [weeklyDays, setWeeklyDays] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!token) {
      setError("Sessão expirada. Volte e entre novamente.");
      return;
    }
    if (!objectiveText.trim()) {
      setError("Conte qual é o seu objetivo pra este ciclo.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cycle = await createCycle(token, {
        objectiveText: objectiveText.trim(),
        objectiveCategory: category,
        weeklyTrainingDays: weeklyDays,
        nextCycleExpectedDate: nextExamDate ? toIsoNoonUtc(nextExamDate) : null,
      });
      router.replace(`/cycle-status/${cycle.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o ciclo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BackButton />

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={typography.h1}>Qual o seu objetivo{"\n"}para este ciclo?</Text>

          <TextInput
            style={styles.textarea}
            value={objectiveText}
            onChangeText={setObjectiveText}
            placeholder="Ex.: quero ganhar massa magra mantendo o percentual de gordura atual"
            placeholderTextColor={colors.muted}
            multiline
          />

          <Text style={typography.label}>Ou escolha uma categoria</Text>
          <View style={styles.chipWrap}>
            <ChipRow options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          </View>

          <View style={styles.fieldSpacing}>
            <DateField
              label="Próximo exame previsto (opcional)"
              value={nextExamDate}
              onChange={setNextExamDate}
              format="long"
              minimumDate={TODAY}
            />
          </View>

          <Text style={typography.label}>Quantas vezes por semana pretende treinar?</Text>
          <View style={styles.chipWrap}>
            <ChipRow options={WEEKLY_DAYS_OPTIONS} value={weeklyDays} onChange={setWeeklyDays} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <Button label="Gerar meu plano" onPress={handleGenerate} loading={loading} />
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
  },
  scroll: {
    flex: 1,
    marginTop: 12,
  },
  textarea: {
    marginTop: 20,
    height: 88,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  chipWrap: {
    marginTop: 8,
    marginBottom: 22,
  },
  fieldSpacing: {
    marginBottom: 22,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 14,
  },
});
