import { apiRequest } from "./client";

export type WorkoutAdherence = "completo" | "parcial" | "nao_realizado";

export interface UpsertCheckInBody {
  weekStartDate: string;
  weightKg?: number | null;
  workoutAdherence?: WorkoutAdherence | null;
  energyLevel?: number | null;
  sleepQuality?: number | null;
}

export interface CheckIn {
  id: string;
  healthCycleId: string | null;
  weekStartDate: string;
  weightKg: number | null;
  workoutAdherence: WorkoutAdherence | null;
  energyLevel: number | null;
  sleepQuality: number | null;
  createdAt: string;
}

// POST /check-ins — Spec 06, seção 8 passo 1: upsert por userId+weekStartDate,
// reenvio na mesma semana substitui o registro anterior por completo.
export function upsertCheckIn(token: string, body: UpsertCheckInBody): Promise<CheckIn> {
  return apiRequest<CheckIn>("/check-ins", { method: "POST", token, body });
}

export function listCheckIns(token: string): Promise<CheckIn[]> {
  return apiRequest<CheckIn[]>("/check-ins", { token });
}
