import { apiRequest } from "./client";

export type BiologicalSexForCalc = "masculino" | "feminino" | "prefiro_nao_informar";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";

export interface UpsertProfileBody {
  heightCm?: number | null;
  birthDate?: string | null; // ISO datetime
  biologicalSexForCalc?: BiologicalSexForCalc | null;
  activityLevel?: ActivityLevel | null;
}

interface ProfileResponse {
  heightCm: number | null;
  birthDate: string | null;
  biologicalSexForCalc: string | null;
  activityLevel: string | null;
}

// PUT /profile — Spec 00, RF20. Todos os campos puláveis (upsert por
// userId); enviar objeto vazio é um caso válido (perfil fica todo null).
export function upsertProfile(token: string, body: UpsertProfileBody): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/profile", { method: "PUT", body, token });
}
