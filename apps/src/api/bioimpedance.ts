import { apiRequest } from "./client";

export type TrendValue = "up" | "down" | "stable" | null;

export interface BioimpedanceTrend {
  weightKg: TrendValue;
  bodyFatPercent: TrendValue;
  leanMassKg: TrendValue;
}

export interface BioimpedanceEntry {
  id: string;
  measuredAt: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  extraMetrics: unknown | null;
  deviceName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  trend: BioimpedanceTrend;
}

export interface CreateBioimpedanceEntryBody {
  measuredAt: string; // ISO datetime
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  leanMassKg?: number | null;
  deviceName?: string | null;
  notes?: string | null;
}

// POST /bioimpedance — Spec 03, seção 5: escrita síncrona, sem pipeline
// assíncrono (não há IA envolvida). Todos os campos numéricos opcionais,
// só measuredAt é obrigatório.
export function createEntry(token: string, body: CreateBioimpedanceEntryBody): Promise<BioimpedanceEntry> {
  return apiRequest<BioimpedanceEntry>("/bioimpedance", { method: "POST", token, body });
}

// GET /bioimpedance — usado aqui só pra pegar a medição mais recente e
// mostrar "Última medição: X kg · há N dias" (mockup Tela 10), não pra uma
// tela de listagem (fora de escopo desta tarefa).
export function listEntries(token: string): Promise<BioimpedanceEntry[]> {
  return apiRequest<BioimpedanceEntry[]>("/bioimpedance", { token });
}
