import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { BackButton } from "../../src/components/BackButton";
import { ExerciseRow } from "../../src/components/ExerciseRow";
import { getCycle, type CycleDetail, type WorkoutExercise } from "../../src/api/cycles";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { colors } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

// Extrai a letra/identificador curto do dia pro pill (ex.: "Dia A — Peito..."
// → "A"). dayLabel sempre começa com "Dia X" na saída da IA (generation.service.ts).
function dayShortLabel(dayLabel: string): string {
  const match = dayLabel.match(/^Dia\s+(\S+)/i);
  return match ? match[1] : dayLabel.slice(0, 2);
}

// Tela — Treino gerado (mockups.html, classe .s4-top/ex-list). Spec 05,
// seção 6 passos 4-5: treino completo sempre visível em tela, exercícios
// editáveis (nome/séries/reps/ordem — ExerciseRow). Botão de exportação
// nesta etapa; "Dar feedback" chega na Etapa 3.
export default function CycleWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    getCycle(token, id)
      .then((result) => {
        setCycle(result);
        const firstDay = result.workoutPlan?.exercises[0]?.dayLabel ?? null;
        setSelectedDay(firstDay);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar o treino."));
  }, [id, token]);

  const dayLabels = useMemo(() => {
    if (!cycle?.workoutPlan) return [];
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const exercise of cycle.workoutPlan.exercises) {
      if (!seen.has(exercise.dayLabel)) {
        seen.add(exercise.dayLabel);
        ordered.push(exercise.dayLabel);
      }
    }
    return ordered;
  }, [cycle]);

  const dayExercises = useMemo(() => {
    if (!cycle?.workoutPlan || !selectedDay) return [];
    return cycle.workoutPlan.exercises
      .filter((exercise) => exercise.dayLabel === selectedDay)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [cycle, selectedDay]);

  function handleExerciseSaved(updated: WorkoutExercise) {
    setCycle((prev) => {
      if (!prev?.workoutPlan) return prev;
      return {
        ...prev,
        workoutPlan: {
          ...prev.workoutPlan,
          userEdited: true,
          exercises: prev.workoutPlan.exercises.map((e) => (e.id === updated.id ? updated : e)),
        },
      };
    });
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={[typography.bodySmall, styles.centeredText]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cycle || !cycle.workoutPlan) {
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
        <BackButton />
        <Text style={typography.h2}>{selectedDay ?? "Treino"}</Text>
        <View style={styles.pillRow}>
          {dayLabels.map((dayLabel) => {
            const active = dayLabel === selectedDay;
            return (
              <Pressable
                key={dayLabel}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setSelectedDay(dayLabel)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{dayShortLabel(dayLabel)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {dayExercises.map((exercise) => (
          <ExerciseRow key={exercise.id} cycleId={cycle.id} exercise={exercise} onSaved={handleExerciseSaved} />
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.bottomButton}>
          <Button
            label="Dar feedback"
            variant="secondary"
            onPress={() => router.push(`/cycle-feedback/${cycle.id}`)}
          />
        </View>
        <View style={styles.bottomButton}>
          <Button label="Exportar treino" onPress={() => router.push(`/cycle-export/${cycle.id}`)} />
        </View>
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
    paddingHorizontal: 24,
  },
  centeredText: {
    textAlign: "center",
  },
  top: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 4,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  pill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: colors.vital,
  },
  pillText: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 14,
    color: colors.muted,
  },
  pillTextActive: {
    color: colors.base,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottom: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bottomButton: {
    flex: 1,
  },
});
