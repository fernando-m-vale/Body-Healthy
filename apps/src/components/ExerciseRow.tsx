import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "./Button";
import { updateExercise, type UpdateExerciseBody, type WorkoutExercise } from "../api/cycles";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { colors, radii } from "../theme/tokens";
import { fontFamily, typography } from "../theme/typography";

interface ExerciseRowProps {
  cycleId: string;
  exercise: WorkoutExercise;
  onSaved: (updated: WorkoutExercise) => void;
}

interface EditState {
  exerciseName: string;
  orderIndex: string;
  sets: string;
  reps: string;
  restSeconds: string;
  technique: string;
  notes: string;
}

function toEditState(exercise: WorkoutExercise): EditState {
  return {
    exerciseName: exercise.exerciseName,
    orderIndex: String(exercise.orderIndex),
    sets: String(exercise.sets),
    reps: exercise.reps,
    restSeconds: exercise.restSeconds != null ? String(exercise.restSeconds) : "",
    technique: exercise.technique ?? "",
    notes: exercise.notes ?? "",
  };
}

function subtitle(exercise: WorkoutExercise): string {
  const parts: string[] = [];
  if (exercise.restSeconds != null) parts.push(`Descanso ${exercise.restSeconds}s`);
  if (exercise.technique) parts.push(exercise.technique);
  if (exercise.notes) parts.push(exercise.notes);
  return parts.join(" · ");
}

// Linha de exercício editável — sem mockup pra interação de edição (a spec
// permite editar nome/séries/reps/ordem, o mockup só mostra o estado
// gerado); mesmo padrão de toque-pra-expandir já usado no MarkerRow
// (Spec 01). Cada linha salva individualmente via PUT ao tocar "Salvar",
// diferente da confirmação em lote do exame — o backend marca
// WorkoutPlan.userEdited a cada edição (Spec 05, seção 6 passo 5).
export function ExerciseRow({ cycleId, exercise, onSaved }: ExerciseRowProps) {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState<EditState>(() => toEditState(exercise));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(patch: Partial<EditState>) {
    setEdit((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (!token) return;
    setError(null);

    const orderIndex = Number(edit.orderIndex);
    const sets = Number(edit.sets);
    if (!edit.exerciseName.trim()) {
      setError("Nome não pode ficar vazio.");
      return;
    }
    if (Number.isNaN(orderIndex) || Number.isNaN(sets)) {
      setError("Ordem e séries precisam ser números.");
      return;
    }

    const body: UpdateExerciseBody = {
      exerciseName: edit.exerciseName.trim(),
      orderIndex,
      sets,
      reps: edit.reps.trim(),
      restSeconds: edit.restSeconds.trim() ? Number(edit.restSeconds) : null,
      technique: edit.technique.trim() || null,
      notes: edit.notes.trim() || null,
    };

    setSaving(true);
    try {
      const updated = await updateExercise(token, cycleId, exercise.id, body);
      onSaved(updated);
      setExpanded(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.row} onPress={() => setExpanded((prev) => !prev)}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{exercise.exerciseName}</Text>
            {exercise.isNew ? (
              <View style={styles.badgeNew}>
                <Text style={styles.badgeNewText}>novo</Text>
              </View>
            ) : null}
          </View>
          {subtitle(exercise) ? <Text style={styles.sub}>{subtitle(exercise)}</Text> : null}
        </View>
        <Text style={styles.badge}>
          {exercise.sets} × {exercise.reps}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.editArea}>
          <View style={styles.field}>
            <Text style={typography.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={edit.exerciseName}
              onChangeText={(text) => updateField({ exerciseName: text })}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={typography.label}>Séries</Text>
              <TextInput
                style={styles.input}
                value={edit.sets}
                onChangeText={(text) => updateField({ sets: text })}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={typography.label}>Repetições</Text>
              <TextInput style={styles.input} value={edit.reps} onChangeText={(text) => updateField({ reps: text })} />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={typography.label}>Descanso (s)</Text>
              <TextInput
                style={styles.input}
                value={edit.restSeconds}
                onChangeText={(text) => updateField({ restSeconds: text })}
                keyboardType="numeric"
                placeholder="—"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={typography.label}>Ordem no dia</Text>
              <TextInput
                style={styles.input}
                value={edit.orderIndex}
                onChangeText={(text) => updateField({ orderIndex: text })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={typography.label}>Técnica (opcional)</Text>
            <TextInput
              style={styles.input}
              value={edit.technique}
              onChangeText={(text) => updateField({ technique: text })}
              placeholder="Ex.: drop-set"
            />
          </View>

          <View style={styles.field}>
            <Text style={typography.label}>Observações (opcional)</Text>
            <TextInput style={styles.input} value={edit.notes} onChangeText={(text) => updateField({ notes: text })} multiline />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar" onPress={handleSave} loading={saving} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.mist,
    borderRadius: radii.cardSmall,
    marginTop: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  name: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  badgeNew: {
    backgroundColor: colors.pulse,
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginLeft: 8,
  },
  badgeNewText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.base,
  },
  sub: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  badge: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  editArea: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  field: {
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.field,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.base,
  },
  error: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: colors.pulseDark,
    marginBottom: 10,
    textAlign: "center",
  },
});
