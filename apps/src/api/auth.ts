import { apiRequest } from "./client";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

// Espelha services/src/modules/auth/auth.schemas.ts — signupBodySchema exige
// senha com pelo menos 8 caracteres.
export function signup(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/signup", { method: "POST", body: { email, password } });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
}
