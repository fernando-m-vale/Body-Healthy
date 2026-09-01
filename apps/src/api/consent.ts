import { apiRequest } from "./client";

interface ConsentResponse {
  accepted: boolean;
  consentVersion: string;
  consentedAt: string;
}

// POST /consent/health-data — Spec 00, RF24. Única tela que pode bloquear o
// fluxo (sem consentimento, nenhuma tela de dado de saúde é acessível).
export function acceptConsent(token: string): Promise<ConsentResponse> {
  return apiRequest<ConsentResponse>("/consent/health-data", { method: "POST", token });
}
