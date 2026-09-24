import { apiRequest } from "./client";
import type { WorkoutExercise } from "./cycles";

export interface WorkoutSession {
  id: string;
  healthCycleId: string | null;
  dayLabel: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
}

export interface SetLog {
  id: string;
  workoutExerciseId: string | null;
  exerciseNameFreeText: string | null;
  exerciseOrderIndex: number;
  setNumber: number;
  weightKg: number | null;
  repsCompleted: string | null;
  completed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetail extends WorkoutSession {
  exercises: WorkoutExercise[];
  setLogs: SetLog[];
}

export interface SessionHistoryItem extends WorkoutSession {
  setLogs: SetLog[];
}

export interface UpsertSetBody {
  workoutExerciseId?: string | null;
  exerciseNameFreeText?: string | null;
  exerciseOrderIndex: number;
  setNumber: number;
  weightKg?: number | null;
  repsCompleted?: string | null;
  completed?: boolean;
  notes?: string | null;
}

export function getActiveSession(token: string): Promise<WorkoutSession | null> {
  return apiRequest<WorkoutSession | null>("/workout-sessions/active", { token });
}

// POST /workout-sessions — Spec 09, seção 5.1: 409 com activeSessionId
// quando já existe uma sessão em aberto (o app checa antes via
// getActiveSession, isso é a guarda de servidor).
export function startSession(token: string, dayLabel: string | null): Promise<WorkoutSession> {
  return apiRequest<WorkoutSession>("/workout-sessions", { method: "POST", token, body: { dayLabel } });
}

export function getSession(token: string, id: string): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/workout-sessions/${id}`, { token });
}

export function listSessions(token: string): Promise<SessionHistoryItem[]> {
  return apiRequest<SessionHistoryItem[]>("/workout-sessions", { token });
}

// PUT /workout-sessions/:id/sets — upsert imediato por série (Spec 09,
// seção 5.3), chave (exerciseOrderIndex, setNumber) dentro da sessão.
export function upsertSet(token: string, sessionId: string, body: UpsertSetBody): Promise<SetLog> {
  return apiRequest<SetLog>(`/workout-sessions/${sessionId}/sets`, { method: "PUT", token, body });
}

export function finishSession(token: string, sessionId: string): Promise<WorkoutSession> {
  return apiRequest<WorkoutSession>(`/workout-sessions/${sessionId}/finish`, { method: "PUT", token });
}

// DELETE /workout-sessions/:id — descarte de sessão em andamento (Spec 09,
// seção 5.9): exclusão definitiva, sem passar pela tela de resumo.
export function discardSession(token: string, sessionId: string): Promise<void> {
  return apiRequest<void>(`/workout-sessions/${sessionId}`, { method: "DELETE", token });
}
