import { apiRequest } from "./client";

export interface UpsertCalorieLogBody {
  logDate: string;
  caloriesConsumed?: number | null;
}

export interface CalorieLog {
  id: string;
  healthCycleId: string | null;
  logDate: string;
  caloriesConsumed: number | null;
  notes: string | null;
  createdAt: string;
  // Comparação com a meta calórica do ciclo (Spec 06, seção 7) — calculada
  // na leitura, nunca persistida. null quando o ciclo não tem
  // dailyCalorieGoal calculado.
  dailyCalorieGoal: number | null;
  differenceFromGoal: number | null;
}

// POST /calorie-logs — upsert por userId+logDate (Spec 06, seção 8 passo 3):
// reenvio no mesmo dia substitui o total anterior.
export function upsertCalorieLog(token: string, body: UpsertCalorieLogBody): Promise<CalorieLog> {
  return apiRequest<CalorieLog>("/calorie-logs", { method: "POST", token, body });
}

export function listCalorieLogs(token: string): Promise<CalorieLog[]> {
  return apiRequest<CalorieLog[]>("/calorie-logs", { token });
}
