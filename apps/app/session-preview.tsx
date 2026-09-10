import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import { BackButton } from "../src/components/BackButton";
import { startSession } from "../src/api/workout-sessions";
import { getCurrentCycle } from "../src/api/dashboard";
import { getCycle, type WorkoutExercise } from "../src/api/cycles";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

// Tela — Pré-visualização do dia antes de iniciar (mockups.html, label
// "Pré-visualização do dia (antes de iniciar)"). Spec 09 v5/v6, seção 5.7:
// tocar num dia (fora sessão livre) não cria a WorkoutSession na hora —
// mostra antes essa lista somente-leitura; só "Iniciar treino" cria a
// sessão de fato. Reaproveita a composição de orientação da IA (selo de
// technique + nota) já usada na sessão ao vivo (seção 5.6).
export default function SessionPreviewScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { token } = useAuth();
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !day) return;
    getCurrentCycle(token)
      .then((cycle) => (cycle.cycleId ? getCycle(token, cycle.cycleId) : null))
      .then((detail) => {
        setExercises(detail?.workoutPlan?.exercises.filter((e) => e.dayLabel === day) ?? []);
      })
      .catch(() => setError("Não foi possível carregar os exercícios deste dia."))
      .finally(() => setLoading(false));
  }, [day, token]);

  async function handleStart() {
    if (!token || !day || starting) return;
    setStarting(true);
    setError(null);
    try {
      const session = await startSession(token, day);
      router.replace(`/session/${session.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const activeId = (err.data as { activeSessionId?: string } | undefined)?.activeSessionId;
        if (activeId) {
          Alert.alert(
            "Sessão em andamento",
            "Você já tem uma sessão de treino aberta. Continuar essa sessão em vez de iniciar outra?",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Continuar sessão", onPress: () => router.replace(`/session/${activeId}`) },
            ],
          );
          setStarting(false);
          return;
        }
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível iniciar a sessão. Tente novamente.");
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <BackButton />
        <Text style={typography.h2}>{day}</Text>
        <Text style={styles.exerciseCount}>{exercises.length} exercícios</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text style={typography.bodySmall}>Carregando...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exRow}>
              <View style={styles.exInfo}>
                <View style={styles.exNameRow}>
                  <Text style={styles.exName}>{exercise.exerciseName}</Text>
                  {exercise.technique ? (
                    <View style={styles.techniqueBadge}>
                      <Text style={styles.techniqueBadgeText}>{exercise.technique}</Text>
                    </View>
                  ) : null}
                </View>
                {exercise.notes ? <Text style={styles.exNote}>{exercise.notes}</Text> : null}
                {exercise.restSeconds ? <Text style={styles.exSub}>Descanso {exercise.restSeconds}s</Text> : null}
              </View>
              <Text style={styles.exBadge}>
                {exercise.sets} × {exercise.reps}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.bottom}>
        <Button label="Iniciar treino" onPress={handleStart} loading={starting} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  top: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 4,
  },
  exerciseCount: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  exRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    padding: 16,
    marginBottom: 10,
  },
  exInfo: {
    flex: 1,
    marginRight: 10,
  },
  exNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  exName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  techniqueBadge: {
    backgroundColor: colors.vitalTint,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  techniqueBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.vitalDark,
  },
  exNote: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.4,
    marginTop: 3,
  },
  exSub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  exBadge: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    textAlign: "center",
    marginTop: 8,
    marginHorizontal: 20,
  },
  bottom: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
