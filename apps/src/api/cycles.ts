import { apiRequest, ApiError } from "./client";

export type ObjectiveCategory = "massa_magra" | "perda_gordura" | "manutencao" | "outro";
export type CycleStatus = "objective_set" | "generating" | "generated" | "failed";

export interface CreateCycleBody {
  objectiveText: string;
  objectiveCategory?: ObjectiveCategory | null;
  weeklyTrainingDays?: number | null;
  nextCycleExpectedDate?: string | null;
}

export interface CycleSummary {
  id: string;
  objectiveText: string;
  objectiveCategory: ObjectiveCategory | null;
  weeklyTrainingDays: number | null;
  status: CycleStatus;
  dailyCalorieGoal: number | null;
  proteinGramsGoal: number | null;
  carbGramsGoal: number | null;
  fatGramsGoal: number | null;
  nextCycleExpectedDate: string | null;
  createdAt: string;
  generatedAt: string | null;
}

export interface WorkoutExercise {
  id: string;
  dayLabel: string;
  orderIndex: number;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number | null;
  notes: string | null;
  technique: string | null;
  isNew: boolean;
}

export interface WorkoutPlan {
  id: string;
  userEdited: boolean;
  exercises: WorkoutExercise[];
}

export interface CyclePhase {
  id: string;
  orderIndex: number;
  phaseLabel: string;
  title: string;
  focusText: string;
}

export interface CycleDetail extends CycleSummary {
  actionPlanText: string | null;
  workoutPlan: WorkoutPlan | null;
  phases: CyclePhase[];
}

// POST /cycles — Spec 05, seção 6 passo 1: cria o ciclo e enfileira geração
// assíncrona (status vai pra "generating" no backend).
export function createCycle(token: string, body: CreateCycleBody): Promise<CycleSummary> {
  return apiRequest<CycleSummary>("/cycles", { method: "POST", token, body });
}

export function getCycle(token: string, id: string): Promise<CycleDetail> {
  return apiRequest<CycleDetail>(`/cycles/${id}`, { token });
}

export interface UpdateExerciseBody {
  dayLabel?: string;
  orderIndex?: number;
  exerciseName?: string;
  sets?: number;
  reps?: string;
  restSeconds?: number | null;
  notes?: string | null;
  technique?: string | null;
}

export function updateExercise(
  token: string,
  cycleId: string,
  exerciseId: string,
  body: UpdateExerciseBody,
): Promise<WorkoutExercise> {
  return apiRequest<WorkoutExercise>(`/cycles/${cycleId}/workout/exercises/${exerciseId}`, {
    method: "PUT",
    token,
    body,
  });
}

export interface FeedbackResponse {
  id: string;
  healthCycleId: string;
  feedbackText: string;
  createdAt: string;
  triggeredRegeneration: boolean;
}

// POST /cycles/:id/feedback — Spec 05, seção 9: bloqueado (409) enquanto
// status já é "generating" — a tela precisa refletir isso, não só a API.
export function createFeedback(token: string, cycleId: string, feedbackText: string): Promise<FeedbackResponse> {
  return apiRequest<FeedbackResponse>(`/cycles/${cycleId}/feedback`, {
    method: "POST",
    token,
    body: { feedbackText },
  });
}

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// GET /cycles/:id/export — retorna CSV cru (Content-Type: text/csv), não
// JSON — não passa por apiRequest (que sempre faz response.json()).
export async function exportWorkoutCsv(token: string, cycleId: string): Promise<string> {
  if (!BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL não configurada.");
  }
  const response = await fetch(`${BASE_URL}/cycles/${cycleId}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Erro inesperado";
    throw new ApiError(response.status, message);
  }
  return response.text();
}
