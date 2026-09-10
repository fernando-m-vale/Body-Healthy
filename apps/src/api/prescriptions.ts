import { apiRequest } from "./client";

export type PrescriptionCategory = "medicacao" | "hormonio" | "suplemento";

export interface PrescriptionEntry {
  id: string;
  name: string;
  category: PrescriptionCategory;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionEntryBody {
  name: string;
  category: PrescriptionCategory;
  startDate: string; // ISO datetime
  endDate?: string | null;
  notes?: string | null;
}

// POST /prescriptions — Spec 04, seção 6: backend cifra name/notes antes de
// persistir (envelope encryption). Pro app, é uma chamada REST comum — a
// cifragem/decifragem é transparente, já implementada e testada no backend.
export function createEntry(token: string, body: CreatePrescriptionEntryBody): Promise<PrescriptionEntry> {
  return apiRequest<PrescriptionEntry>("/prescriptions", { method: "POST", token, body });
}

// GET /prescriptions — cada leitura gera uma entrada em HealthDataAccessLog
// no backend (seção 6 passo 3), sem nada especial do lado do app.
export function listEntries(token: string): Promise<PrescriptionEntry[]> {
  return apiRequest<PrescriptionEntry[]>("/prescriptions", { token });
}
