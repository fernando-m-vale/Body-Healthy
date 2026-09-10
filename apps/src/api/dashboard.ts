import { apiRequest } from "./client";

export interface CurrentCycleSummary {
  cycleId: string | null;
  status: string | null;
  dailyCalorieGoal: number | null;
  nextCycleExpectedDate: string | null;
  daysUntilNextCycle: number | null;
  adherenceRate: number | null;
}

// GET /dashboard/current-cycle — Spec 07, já existente no backend (não é
// endpoint novo desta tarefa). Usado aqui só pra saber o dailyCalorieGoal do
// ciclo ativo quando ainda não há registro de calorias hoje (GET
// /calorie-logs só traz a meta junto de um log existente).
export function getCurrentCycle(token: string): Promise<CurrentCycleSummary> {
  return apiRequest<CurrentCycleSummary>("/dashboard/current-cycle", { token });
}
