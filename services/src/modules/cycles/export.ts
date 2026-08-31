// Exportação genérica do treino (Spec 05, seção 7) — CSV com colunas comuns o
// suficiente para uso manual em qualquer app de treino, sem vínculo a app
// específico (nem Hevy, nem qualquer outro).
interface ExportableExercise {
  dayLabel: string;
  orderIndex: number;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number | null;
  notes: string | null;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildWorkoutCsv(exercises: ExportableExercise[]): string {
  const header = ["Dia", "Ordem", "Exercício", "Séries", "Repetições", "Descanso (s)", "Observações"];
  const rows = exercises.map((e) =>
    [
      e.dayLabel,
      String(e.orderIndex),
      e.exerciseName,
      String(e.sets),
      e.reps,
      e.restSeconds != null ? String(e.restSeconds) : "",
      e.notes ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  return [header.join(","), ...rows].join("\r\n");
}
