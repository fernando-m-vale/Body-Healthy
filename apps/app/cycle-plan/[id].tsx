import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { BackButton } from "../../src/components/BackButton";
import { getCycle, type CycleDetail } from "../../src/api/cycles";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { formatDayMonth } from "../../src/lib/format-date";
import { colors, radii } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

function MacroCard({ value, label, attention }: { value: string; label: string; attention?: boolean }) {
  return (
    <View style={[styles.macroCard, attention && styles.macroCardAttention]}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

// Tela — Plano de ação gerado (mockups.html, label "Plano de ação gerado").
// Spec 05, seção 5.1: toda exibição de meta calórica/macro precisa do
// disclaimer de estimativa — o mockup não desenha essa caixa, adicionada
// aqui por exigência da spec (decisão registrada no planejamento desta
// tarefa, mesmo padrão já usado em Consentimento/Nova prescrição).
export default function CyclePlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    getCycle(token, id)
      .then(setCycle)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar o ciclo."));
  }, [id, token]);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={[typography.bodySmall, styles.centeredText]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cycle) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={typography.bodySmall}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasMacros = cycle.dailyCalorieGoal != null;
  const paragraphs = (cycle.actionPlanText ?? "").split(/\n\n+/).filter((p) => p.trim().length > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <BackButton />
        <Text style={styles.eyebrow}>Ciclo iniciado em {formatDayMonth(cycle.createdAt)}</Text>
        <Text style={typography.h2}>Seu plano</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {hasMacros ? (
          <>
            <View style={styles.macroRow}>
              <MacroCard value={`${cycle.dailyCalorieGoal}`} label="kcal" />
              <MacroCard value={`${cycle.proteinGramsGoal}g`} label="proteína" attention />
              <MacroCard value={`${cycle.carbGramsGoal}g`} label="carbo" />
              <MacroCard value={`${cycle.fatGramsGoal}g`} label="gordura" />
            </View>
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                Meta calórica e macros são uma <Text style={styles.disclaimerBold}>estimativa</Text>, calculada a
                partir do seu perfil e peso mais recente — não é prescrição nutricional. Qualquer ajuste de dieta
                deve ter orientação de um profissional.
              </Text>
            </View>
          </>
        ) : null}

        {cycle.phases.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseScroll}>
            {cycle.phases.map((phase) => (
              <View key={phase.id} style={styles.phaseChip}>
                <Text style={styles.phaseWeeks}>{phase.phaseLabel}</Text>
                <Text style={styles.phaseTitle}>{phase.title}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.prose}>
            {paragraph}
          </Text>
        ))}

        {cycle.workoutPlan ? (
          <Button
            label="Ver treino completo"
            onPress={() => router.push(`/cycle-workout/${cycle.id}`)}
            style={styles.workoutButton}
          />
        ) : null}
      </ScrollView>
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
    paddingBottom: 10,
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
  macroRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  macroCardAttention: {
    backgroundColor: colors.pulseTint,
  },
  macroValue: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 17,
    color: colors.ink,
  },
  macroLabel: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  disclaimerBox: {
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  disclaimerText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.muted,
  },
  disclaimerBold: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.ink,
  },
  phaseScroll: {
    marginBottom: 20,
  },
  phaseChip: {
    backgroundColor: colors.mist,
    borderRadius: radii.field,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 6,
  },
  phaseWeeks: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 2,
  },
  phaseTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  prose: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.7,
    color: colors.ink,
    marginBottom: 12,
  },
  workoutButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});
