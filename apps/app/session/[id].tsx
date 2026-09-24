import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { RestBar } from "../../src/components/RestBar";
import {
  getSession,
  listSessions,
  upsertSet,
  finishSession,
  discardSession,
  type SessionDetail,
  type SessionHistoryItem,
} from "../../src/api/workout-sessions";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { useRestTimer } from "../../src/lib/rest-timer";
import { buildSessionExercises, exerciseKey, type LocalExercise, type LocalSet } from "../../src/lib/session-exercises";
import { colors, radii } from "../../src/theme/tokens";
import { fontFamily, typography } from "../../src/theme/typography";

// Monta a lista de exercícios da sessão ao vivo (retomada ou nova) a partir
// de buildSessionExercises — a mesma função que a pré-visualização do dia
// usa (Spec 09 v8, seção 5.7: nunca duplicar essa lógica em duas versões
// que podem divergir).
function buildInitialExercises(session: SessionDetail, history: SessionHistoryItem[]): LocalExercise[] {
  return buildSessionExercises({
    currentSessionId: session.id,
    dayLabel: session.dayLabel,
    planExercises: session.exercises,
    currentSetLogs: session.setLogs,
    history,
  });
}

function formatSessionClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Tela — Sessão de treino ao vivo (mockups.html, classe .s27) + barra de
// descanso persistente (classe .s28), Spec 09. Substitui a Tela 21/Spec 06.
export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [addExerciseVisible, setAddExerciseVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const restTimer = useRestTimer();

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([getSession(token, id), listSessions(token)])
      .then(([detail, history]) => {
        setSession(detail);
        setExercises(buildInitialExercises(detail, history));
      })
      .catch(() => setError("Não foi possível carregar a sessão."));
  }, [id, token]);

  useEffect(() => {
    if (!session) return;
    const startedAt = new Date(session.startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  function updateSet(exerciseIdx: number, setIdx: number, patch: Partial<LocalSet>) {
    setExercises((prev) => {
      const next = [...prev];
      const exercise = { ...next[exerciseIdx] };
      const sets = [...exercise.sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      exercise.sets = sets;
      next[exerciseIdx] = exercise;
      return next;
    });
  }

  async function toggleComplete(exerciseIdx: number, setIdx: number) {
    if (!token || !session) return;
    const exercise = exercises[exerciseIdx];
    const set = exercise.sets[setIdx];
    const newCompleted = !set.completed;

    updateSet(exerciseIdx, setIdx, { saving: true });
    try {
      const weightValue = set.weightKg.trim() ? Number(set.weightKg.trim().replace(",", ".")) : null;
      await upsertSet(token, session.id, {
        workoutExerciseId: exercise.workoutExerciseId,
        exerciseNameFreeText: exercise.exerciseNameFreeText,
        exerciseOrderIndex: exercise.orderIndex,
        setNumber: set.setNumber,
        weightKg: weightValue != null && !Number.isNaN(weightValue) ? weightValue : null,
        repsCompleted: set.repsCompleted.trim() || null,
        completed: newCompleted,
      });
      updateSet(exerciseIdx, setIdx, {
        completed: newCompleted,
        saving: false,
        savedWeightKg: set.weightKg,
        savedRepsCompleted: set.repsCompleted,
      });

      if (newCompleted && exercise.restSeconds) {
        void restTimer.start(exercise.restSeconds, exercise.exerciseName, set.setNumber + 1);
      }
    } catch (err) {
      updateSet(exerciseIdx, setIdx, { saving: false });
      Alert.alert("Erro", err instanceof ApiError ? err.message : "Não foi possível salvar a série.");
    }
  }

  function addSet(exerciseIdx: number) {
    setExercises((prev) => {
      const next = [...prev];
      const exercise = { ...next[exerciseIdx] };
      const nextSetNumber = exercise.sets.length + 1;
      exercise.sets = [
        ...exercise.sets,
        {
          setNumber: nextSetNumber,
          weightKg: "",
          repsCompleted: "",
          completed: false,
          saving: false,
          savedWeightKg: "",
          savedRepsCompleted: "",
        },
      ];
      next[exerciseIdx] = exercise;
      return next;
    });
  }

  function confirmAddExercise() {
    const name = newExerciseName.trim();
    if (!name) return;
    setExercises((prev) => [
      ...prev,
      {
        key: exerciseKey(null, name),
        orderIndex: prev.length,
        workoutExerciseId: null,
        exerciseNameFreeText: name,
        exerciseName: name,
        technique: null,
        guidanceNote: null,
        restSeconds: null,
        planReps: null,
        sets: [
          {
            setNumber: 1,
            weightKg: "",
            repsCompleted: "",
            completed: false,
            saving: false,
            savedWeightKg: "",
            savedRepsCompleted: "",
          },
        ],
      },
    ]);
    setNewExerciseName("");
    setAddExerciseVisible(false);
  }

  // Peso total levantado (Spec 09 v5/v6, seção 5.8): soma peso × repetições
  // só das séries concluídas cuja repetição é um número inteiro simples
  // (ex.: "10") — "8-10" ou vazio conta pro número de séries mas não entra
  // na soma, pra não estimar em cima de dado ambíguo. Calculado em memória
  // a partir do estado que a tela já tem, sem endpoint novo.
  function computeSummaryTotals(): { setsCompleted: number; totalWeightKg: number } {
    let setsCompleted = 0;
    let totalWeightKg = 0;
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        if (!set.completed) continue;
        setsCompleted += 1;
        const reps = set.repsCompleted.trim();
        const weight = set.weightKg.trim() ? Number(set.weightKg.trim().replace(",", ".")) : null;
        if (/^\d+$/.test(reps) && weight != null && !Number.isNaN(weight)) {
          totalWeightKg += weight * Number(reps);
        }
      }
    }
    return { setsCompleted, totalWeightKg };
  }

  async function handleFinish() {
    if (!token || !session) return;
    setFinishing(true);
    try {
      const finished = await finishSession(token, session.id);
      await restTimer.skip();
      const { setsCompleted, totalWeightKg } = computeSummaryTotals();
      router.replace({
        pathname: "/session-summary",
        params: {
          day: finished.dayLabel ?? "",
          durationSeconds: String(finished.durationSeconds ?? 0),
          setsCompleted: String(setsCompleted),
          totalWeightKg: String(Math.round(totalWeightKg)),
        },
      });
    } catch (err) {
      Alert.alert("Erro", err instanceof ApiError ? err.message : "Não foi possível concluir a sessão.");
    } finally {
      setFinishing(false);
    }
  }

  function handleDiscardPress() {
    Alert.alert("Descartar este treino?", "As séries registradas nele serão perdidas.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: handleDiscardConfirmed },
    ]);
  }

  // Descarte de sessão em andamento (Spec 09 v7, seção 5.9) — sem tela de
  // resumo (não é uma sessão "concluída"), volta direto pra tela inicial.
  async function handleDiscardConfirmed() {
    if (!token || !session) return;
    setDiscarding(true);
    try {
      await discardSession(token, session.id);
      await restTimer.skip();
      router.replace("/home");
    } catch (err) {
      Alert.alert("Erro", err instanceof ApiError ? err.message : "Não foi possível descartar a sessão.");
    } finally {
      setDiscarding(false);
    }
  }

  const dayTitle = useMemo(() => session?.dayLabel ?? "Treino livre", [session]);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={[typography.bodySmall, styles.centeredText]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={typography.bodySmall}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.top}>
        <View>
          <Text style={styles.timer}>{formatSessionClock(elapsedSeconds)}</Text>
          <Text style={styles.timerLabel}>{dayTitle}</Text>
        </View>
        <View>
          <Button
            label="Concluir"
            onPress={handleFinish}
            loading={finishing}
            disabled={discarding}
            style={styles.finishBtn}
          />
          <Pressable onPress={handleDiscardPress} disabled={finishing || discarding} hitSlop={8}>
            <Text style={styles.discardLink}>Descartar</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {exercises.map((exercise, exerciseIdx) => (
          <View key={exercise.key} style={styles.exerciseCard}>
            <View style={styles.exerciseHead}>
              <View style={styles.exerciseNameRow}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                {exercise.technique ? (
                  <View style={styles.techniqueBadge}>
                    <Text style={styles.techniqueBadgeText}>{exercise.technique}</Text>
                  </View>
                ) : null}
              </View>
              {exercise.restSeconds ? <Text style={styles.restLabel}>Descanso {exercise.restSeconds}s</Text> : null}
            </View>
            {exercise.guidanceNote ? <Text style={styles.guidanceNote}>{exercise.guidanceNote}</Text> : null}

            <View style={styles.setHeadRow}>
              <Text style={[styles.setHeadCell, styles.setNumCell]} />
              <Text style={styles.setHeadCell}>Peso (kg)</Text>
              <Text style={styles.setHeadCell}>Reps</Text>
              <View style={styles.setCheckCell} />
            </View>
            {exercise.sets.map((set, setIdx) => {
              // Indicador visual de edição não confirmada (Spec 09 v6,
              // seção 5.3) — borda destacada enquanto o campo diverge do
              // último valor realmente salvo (via toggle de conclusão).
              const isDirty = set.weightKg !== set.savedWeightKg || set.repsCompleted !== set.savedRepsCompleted;
              return (
                <View key={set.setNumber} style={styles.setRow}>
                  <Text style={styles.setNum}>{set.setNumber}</Text>
                  <TextInput
                    style={[styles.setInput, isDirty && styles.setInputDirty]}
                    value={set.weightKg}
                    onChangeText={(text) => updateSet(exerciseIdx, setIdx, { weightKg: text })}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={colors.muted}
                  />
                  <TextInput
                    style={[styles.setInput, isDirty && styles.setInputDirty]}
                    value={set.repsCompleted}
                    onChangeText={(text) => updateSet(exerciseIdx, setIdx, { repsCompleted: text })}
                    placeholder="—"
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable
                    style={[styles.setCheck, set.completed && styles.setCheckDone]}
                    onPress={() => toggleComplete(exerciseIdx, setIdx)}
                    disabled={set.saving}
                  >
                    <Text style={[styles.setCheckText, set.completed && styles.setCheckTextDone]}>✓</Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={() => addSet(exerciseIdx)}>
              <Text style={styles.addSetText}>+ Adicionar série</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addExerciseBtn} onPress={() => setAddExerciseVisible(true)}>
          <Text style={styles.addExerciseText}>+ Adicionar exercício avulso</Text>
        </Pressable>
      </ScrollView>

      {restTimer.state ? <RestBar state={restTimer.state} onSkip={() => void restTimer.skip()} /> : null}

      <Modal visible={addExerciseVisible} transparent animationType="slide" onRequestClose={() => setAddExerciseVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddExerciseVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Adicionar exercício avulso</Text>
            <TextInput
              style={styles.sheetInput}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              placeholder="Ex.: Corrida na esteira"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <Button label="Adicionar" onPress={confirmAddExercise} style={styles.sheetButton} />
          </Pressable>
        </Pressable>
      </Modal>
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
    backgroundColor: colors.ink,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timer: {
    fontFamily: fontFamily.displayBold,
    fontSize: 28,
    color: colors.base,
    letterSpacing: -0.3,
  },
  timerLabel: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: "#B7C4BE",
    marginTop: 2,
  },
  finishBtn: {
    width: "auto",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  discardLink: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "#B7C4BE",
    textAlign: "right",
    marginTop: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 100,
  },
  exerciseCard: {
    marginBottom: 20,
  },
  exerciseHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flexShrink: 1,
  },
  exerciseName: {
    fontFamily: fontFamily.bodySemiBold,
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
  restLabel: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
  },
  guidanceNote: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 13 * 1.4,
    marginBottom: 8,
  },
  setHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  setHeadCell: {
    flex: 1,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
  },
  setNumCell: {
    flex: 0,
    width: 22,
  },
  setCheckCell: {
    width: 32,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  setNum: {
    width: 22,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.muted,
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.ink,
    fontFamily: fontFamily.bodyRegular,
    minWidth: 0,
  },
  setInputDirty: {
    borderColor: colors.pulse,
    borderWidth: 1.5,
  },
  setCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  setCheckDone: {
    backgroundColor: colors.vital,
    borderColor: colors.vital,
  },
  setCheckText: {
    color: colors.line,
    fontSize: 14,
  },
  setCheckTextDone: {
    color: colors.base,
  },
  addSetText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.vitalDark,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addExerciseBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: "dashed",
    backgroundColor: colors.base,
    borderRadius: radii.cardSmall,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  addExerciseText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.muted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 24, 31, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 16,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 18,
  },
  sheetButton: {
    marginBottom: 0,
  },
});
