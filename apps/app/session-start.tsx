import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../src/components/Button";
import {
  getActiveSession,
  startSession,
  listSessions,
  type WorkoutSession,
  type SessionHistoryItem,
} from "../src/api/workout-sessions";
import { getCurrentCycle } from "../src/api/dashboard";
import { getCycle, type WorkoutExercise } from "../src/api/cycles";
import { ApiError } from "../src/api/client";
import { useAuth } from "../src/auth/auth-context";
import { colors, radii } from "../src/theme/tokens";
import { fontFamily, typography } from "../src/theme/typography";

interface DayInfo {
  dayLabel: string;
  exerciseCount: number;
  lastTrainedLabel: string;
}

function daysAgoLabel(finishedAt: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(finishedAt).getTime()) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "último treino hoje";
  if (days === 1) return "último treino há 1 dia";
  return `último treino há ${days} dias`;
}

// Tela — Iniciar sessão de treino (mockups.html, classe .s26). Spec 09,
// seção 5.1. O resumo "último treino há N dias"/"ainda não treinado" por
// dia não tem endpoint próprio (seção 7) — calculado aqui a partir de
// GET /workout-sessions (decisão de composição confirmada no planejamento
// desta tarefa, tela é conveniência de UI, sem critério de aceite formal).
export default function SessionStartScreen() {
  const { token } = useAuth();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [days, setDays] = useState<DayInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      getActiveSession(token),
      listSessions(token),
      getCurrentCycle(token)
        .then((cycle) => (cycle.cycleId ? getCycle(token, cycle.cycleId) : null))
        .catch(() => null),
    ])
      .then(([active, sessions, cycleDetail]) => {
        setActiveSession(active);
        setDays(buildDayInfos(cycleDetail?.workoutPlan?.exercises ?? [], sessions));
      })
      .catch(() => {
        setError("Não foi possível carregar seus dias de treino agora.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  function buildDayInfos(exercises: WorkoutExercise[], sessions: SessionHistoryItem[]): DayInfo[] {
    const order: string[] = [];
    const counts: Record<string, number> = {};
    for (const exercise of exercises) {
      if (!(exercise.dayLabel in counts)) order.push(exercise.dayLabel);
      counts[exercise.dayLabel] = (counts[exercise.dayLabel] ?? 0) + 1;
    }
    return order.map((dayLabel) => {
      const lastFinished = sessions
        .filter((s) => s.dayLabel === dayLabel && s.finishedAt)
        .sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime())[0];
      return {
        dayLabel,
        exerciseCount: counts[dayLabel],
        lastTrainedLabel: lastFinished ? daysAgoLabel(lastFinished.finishedAt!) : "ainda não treinado",
      };
    });
  }

  async function beginSession(dayLabel: string | null) {
    if (!token || starting) return;
    setStarting(true);
    setError(null);
    try {
      const session = await startSession(token, dayLabel);
      router.replace(`/session/${session.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const activeId = (err.data as { activeSessionId?: string } | undefined)?.activeSessionId;
        if (activeId) {
          router.replace(`/session/${activeId}`);
          return;
        }
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível iniciar a sessão. Tente novamente.");
    } finally {
      setStarting(false);
    }
  }

  // Tocar num dia (fora sessão livre) não inicia a sessão direto — abre a
  // pré-visualização somente-leitura primeiro (Spec 09, seção 5.7). O
  // conflito de sessão já em aberto (§5.1) é resolvido lá, no momento real
  // de criar a sessão ("Iniciar treino"), não aqui.
  function handleDayPress(dayLabel: string) {
    router.push({ pathname: "/session-preview", params: { day: dayLabel } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={typography.h2}>Iniciar treino</Text>
        <Text style={[typography.bodySmall, styles.sub]}>Escolha o dia do seu ciclo atual, ou treine livre</Text>

        {activeSession ? (
          <View style={styles.resumeCard}>
            <View style={styles.resumeInfo}>
              <Text style={styles.resumeTitle}>Sessão em andamento</Text>
              <Text style={styles.resumeSub}>{activeSession.dayLabel ?? "Treino livre"}</Text>
            </View>
            <Button
              label="Continuar"
              onPress={() => router.replace(`/session/${activeSession.id}`)}
              style={styles.resumeButton}
            />
          </View>
        ) : null}

        {loading ? (
          <Text style={typography.bodySmall}>Carregando...</Text>
        ) : (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {days.map((day) => (
              <Pressable key={day.dayLabel} style={styles.dayCard} onPress={() => handleDayPress(day.dayLabel)}>
                <View>
                  <Text style={styles.dayTitle}>{day.dayLabel}</Text>
                  <Text style={styles.daySub}>
                    {day.exerciseCount} exercícios · {day.lastTrainedLabel}
                  </Text>
                </View>
                <Text style={styles.dayArrow}>›</Text>
              </Pressable>
            ))}
            {days.length === 0 ? (
              <Text style={[typography.bodySmall, styles.noPlanText]}>
                Sem ciclo com treino gerado ainda — você ainda pode treinar livre, sem dia vinculado.
              </Text>
            ) : null}
          </ScrollView>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Button
        label="Treino livre (sem dia específico)"
        variant="link"
        onPress={() => void beginSession(null)}
        style={styles.freeLink}
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
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  sub: {
    marginTop: 4,
    marginBottom: 18,
  },
  resumeCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  resumeInfo: {
    flex: 1,
  },
  resumeTitle: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 15,
    color: colors.base,
    marginBottom: 2,
  },
  resumeSub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: "#B7C4BE",
  },
  resumeButton: {
    width: "auto",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scroll: {
    flex: 1,
  },
  dayCard: {
    backgroundColor: colors.mist,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  daySub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  dayArrow: {
    color: colors.muted,
    fontSize: 16,
  },
  noPlanText: {
    marginTop: 8,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginTop: 12,
  },
  freeLink: {
    marginHorizontal: 24,
    marginBottom: 22,
  },
});
