import type { WorkoutExercise } from "../api/cycles";
import type { SessionHistoryItem, SetLog } from "../api/workout-sessions";

export interface LocalSet {
  setNumber: number;
  weightKg: string;
  repsCompleted: string;
  completed: boolean;
  saving: boolean;
  // Último valor efetivamente salvo (via toggle de conclusão) — usado só
  // pra saber se o campo tem edição ainda não confirmada (Spec 09 v6,
  // seção 5.3: decisão confirmada de indicador visual, depois de teste real
  // mostrar confusão sobre editar vs. salvar). Editar sem marcar concluída
  // nunca dispara upsert — isso não muda, é só sinalização visual. Sem
  // efeito na pré-visualização (Spec 09 v8, seção 5.7), que não tem campo
  // editável — só reaproveitada pra manter o mesmo formato de dado.
  savedWeightKg: string;
  savedRepsCompleted: string;
}

export interface LocalExercise {
  key: string;
  orderIndex: number;
  workoutExerciseId: string | null;
  exerciseNameFreeText: string | null;
  exerciseName: string;
  technique: string | null;
  guidanceNote: string | null;
  restSeconds: number | null;
  // Faixa de repetições alvo do plano (WorkoutExercise.reps, ex.: "8-10") —
  // fixa por exercício, não por série (cada linha em `sets` pode ter um
  // `repsCompleted` diferente, vindo do histórico). null pra avulso em
  // texto livre (sem WorkoutExercise associado). Usado pela pré-visualização
  // (Spec 09, seção 5.7) pra mostrar "{linhas} × {reps}", já que a
  // contagem de linhas pode vir do histórico mas a faixa alvo continua
  // sendo a do plano.
  planReps: string | null;
  sets: LocalSet[];
}

export function exerciseKey(workoutExerciseId: string | null, exerciseNameFreeText: string | null): string {
  return workoutExerciseId ?? `free:${exerciseNameFreeText}`;
}

// Sessão mais recente (que não a atual) contendo ao menos um setLog pra este
// exercício — a referência única pra prefill de série (Spec 09, seção 5.2:
// "a sessão mais recente", não uma varredura por várias sessões antigas).
// `currentSessionId: null` (pré-visualização, sem sessão criada ainda) não
// exclui nada — considera todo o histórico.
function findReferenceSession(
  history: SessionHistoryItem[],
  currentSessionId: string | null,
  workoutExerciseId: string | null,
  exerciseNameFreeText: string | null,
): SessionHistoryItem | undefined {
  return history
    .filter((s) => s.id !== currentSessionId)
    .filter((s) =>
      s.setLogs.some((log) =>
        workoutExerciseId
          ? log.workoutExerciseId === workoutExerciseId
          : log.exerciseNameFreeText === exerciseNameFreeText,
      ),
    )
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
}

export interface BuildSessionExercisesParams {
  // null pra pré-visualização (Spec 09, seção 5.7) — ainda não existe
  // WorkoutSession, então não há id nenhum a excluir do histórico.
  currentSessionId: string | null;
  dayLabel: string | null;
  planExercises: WorkoutExercise[];
  // [] pra pré-visualização e pra uma sessão nova; preenchido ao retomar
  // uma sessão em aberto.
  currentSetLogs: SetLog[];
  history: SessionHistoryItem[];
}

// Resolve a lista completa de exercícios (do plano + avulsos de sessão
// anterior do mesmo dia) com prefill de série — mesma função usada tanto
// pela sessão ao vivo (retomada ou nova) quanto pela pré-visualização do
// dia (Spec 09 v8, seção 5.7: "a pré-visualização tem que usar a mesma
// função de resolução de exercícios da sessão ao vivo, não uma versão
// simplificada separada — assim as duas telas nunca mais divergem". Bug
// real encontrado em teste: a pré-visualização mostrava só a lista crua do
// WorkoutPlan, sem o ajuste de quantidade de série nem os avulsos que a
// sessão ao vivo já resolvia corretamente).
export function buildSessionExercises({
  currentSessionId,
  dayLabel,
  planExercises,
  currentSetLogs,
  history,
}: BuildSessionExercisesParams): LocalExercise[] {
  const currentLogsByKey = new Map<string, SetLog[]>();
  for (const log of currentSetLogs) {
    const key = exerciseKey(log.workoutExerciseId, log.exerciseNameFreeText);
    const list = currentLogsByKey.get(key) ?? [];
    list.push(log);
    currentLogsByKey.set(key, list);
  }

  const exercises: LocalExercise[] = planExercises.map((exercise, index) => {
    const key = exerciseKey(exercise.id, null);
    const currentLogs = currentLogsByKey.get(key) ?? [];
    const referenceSession = findReferenceSession(history, currentSessionId, exercise.id, null);
    const referenceLogs = referenceSession?.setLogs.filter((l) => l.workoutExerciseId === exercise.id) ?? [];

    // Número de linhas nunca pode ser menor que o que já existe de dado real
    // — nem o `sets` sugerido pelo plano (pode ter mudado numa regeneração
    // posterior à sessão de referência, ficando menor do que antes) nem o
    // que a própria sessão em retomada já tem. Bug real encontrado em teste:
    // um exercício com `sets: 2` no plano ATUAL, mas 4 séries concluídas
    // numa sessão anterior (2 delas adicionadas via "+ Adicionar série"
    // naquela sessão), renderizava só 2 linhas na sessão nova — as 2 séries
    // extras ficavam invisíveis mesmo com o dado intacto no banco.
    const maxCurrentSetNumber = currentLogs.reduce((max, l) => Math.max(max, l.setNumber), 0);
    const maxReferenceSetNumber = referenceLogs.reduce((max, l) => Math.max(max, l.setNumber), 0);
    const rowCount = Math.max(exercise.sets, maxCurrentSetNumber, maxReferenceSetNumber);

    const sets: LocalSet[] = Array.from({ length: rowCount }, (_, i) => {
      const setNumber = i + 1;
      const current = currentLogs.find((l) => l.setNumber === setNumber);
      if (current) {
        const weightKg = current.weightKg != null ? String(current.weightKg) : "";
        const repsCompleted = current.repsCompleted ?? "";
        return {
          setNumber,
          weightKg,
          repsCompleted,
          completed: current.completed,
          saving: false,
          savedWeightKg: weightKg,
          savedRepsCompleted: repsCompleted,
        };
      }
      if (referenceSession) {
        // Já existe uma sessão anterior pra este exercício, mas ela não
        // tem essa série específica (teve menos séries que o plano atual
        // sugere) — fica vazia, sem cair na sugestão do plano (Spec 09,
        // seção 5.2: "séries extras ficam vazias, sem dado anterior pra
        // puxar" — não é o mesmo caso de "primeira vez", que tem a
        // sugestão de reps do plano).
        const reference = referenceLogs.find((l) => l.setNumber === setNumber);
        if (reference) {
          const weightKg = reference.weightKg != null ? String(reference.weightKg) : "";
          const repsCompleted = reference.repsCompleted ?? "";
          return {
            setNumber,
            weightKg,
            repsCompleted,
            completed: false,
            saving: false,
            savedWeightKg: weightKg,
            savedRepsCompleted: repsCompleted,
          };
        }
        return {
          setNumber,
          weightKg: "",
          repsCompleted: "",
          completed: false,
          saving: false,
          savedWeightKg: "",
          savedRepsCompleted: "",
        };
      }
      // Primeira vez pra este exercício (nenhuma sessão anterior o tocou):
      // reps sugeridas vêm do plano, carga fica vazia (Spec 05 não propõe
      // carga).
      return {
        setNumber,
        weightKg: "",
        repsCompleted: exercise.reps,
        completed: false,
        saving: false,
        savedWeightKg: "",
        savedRepsCompleted: exercise.reps,
      };
    });

    return {
      key,
      orderIndex: index,
      workoutExerciseId: exercise.id,
      exerciseNameFreeText: null,
      exerciseName: exercise.exerciseName,
      technique: exercise.technique,
      guidanceNote: exercise.notes,
      restSeconds: exercise.restSeconds,
      planReps: exercise.reps,
      sets,
    };
  });

  // Exercícios avulsos — tanto os já registrados na sessão atual (retomada)
  // quanto os de uma sessão anterior do MESMO dia (Spec 09, seção 5.2: o
  // prefill vale por workoutExerciseId OU exerciseNameFreeText exato, não
  // só pra exercícios do plano). Restrito ao mesmo dayLabel (ou mesma
  // sessão livre, ambos null) — um avulso adicionado num dia não deve
  // aparecer em outro.
  let nextOrderIndex = exercises.length;
  const sameDaySession = history
    .filter((s) => s.id !== currentSessionId && s.dayLabel === dayLabel)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  const freeTextKeys = new Set([
    ...currentSetLogs.filter((l) => l.exerciseNameFreeText).map((l) => l.exerciseNameFreeText as string),
    ...(sameDaySession?.setLogs.filter((l) => l.exerciseNameFreeText).map((l) => l.exerciseNameFreeText as string) ??
      []),
  ]);
  for (const name of freeTextKeys) {
    const currentFreeLogs = currentSetLogs
      .filter((l) => l.exerciseNameFreeText === name)
      .sort((a, b) => a.setNumber - b.setNumber);
    if (currentFreeLogs.length > 0) {
      buildFreeTextExercise(name, currentFreeLogs);
      continue;
    }
    const referenceSession = findReferenceSession(history, currentSessionId, null, name);
    const referenceFreeLogs =
      referenceSession?.setLogs.filter((l) => l.exerciseNameFreeText === name).sort((a, b) => a.setNumber - b.setNumber) ??
      [];
    buildFreeTextExercise(name, referenceFreeLogs, /* isReference */ referenceFreeLogs.length > 0);
  }

  function buildFreeTextExercise(name: string, logs: SetLog[], isReference = false) {
    exercises.push({
      key: exerciseKey(null, name),
      orderIndex: nextOrderIndex++,
      workoutExerciseId: null,
      exerciseNameFreeText: name,
      exerciseName: name,
      technique: null,
      guidanceNote: null,
      restSeconds: null,
      planReps: null,
      sets: logs.map((l) => {
        const weightKg = l.weightKg != null ? String(l.weightKg) : "";
        const repsCompleted = l.repsCompleted ?? "";
        return {
          setNumber: l.setNumber,
          weightKg,
          repsCompleted,
          // Vindo de uma sessão de referência (não a atual): é só sugestão
          // de prefill, ainda não confirmado nesta sessão — mesmo
          // tratamento do ramo de exercícios do plano.
          completed: isReference ? false : l.completed,
          saving: false,
          savedWeightKg: weightKg,
          savedRepsCompleted: repsCompleted,
        };
      }),
    });
  }

  return exercises;
}
