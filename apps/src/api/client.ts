const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;
  // Corpo de erro bruto, quando o endpoint manda campos além de `error` (ex.:
  // activeSessionId no 409 de POST /workout-sessions, Spec 09) — a maioria
  // dos endpoints só usa `message`, isso é opt-in pra quem precisar do resto.
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
}

// Wrapper fino sobre fetch — todo endpoint do backend responde erro no
// formato `{ error: string }` (mesmo contrato em todas as specs), então essa
// é a única forma de erro que o client precisa entender.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL não configurada — copie apps/.env.example para apps/.env e ajuste o valor.",
    );
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const isEmptyResponse = response.status === 204;
  const data = isEmptyResponse ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Erro inesperado";
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
