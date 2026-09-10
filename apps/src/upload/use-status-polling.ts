import { useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";

const POLL_INTERVAL_MS = 3000;
const SLOW_WARNING_MS = 45000;

interface UseStatusPollingOptions<T extends { status: string }> {
  id: string | undefined;
  fetchStatus: (token: string, id: string) => Promise<T>;
  doneStatuses: readonly string[];
  failedStatus: string;
  onDone: (result: T) => void;
}

// Poll fixo de 3s (Specs 01/02, seção 4/5: sem mecanismo de tempo real
// definido) — decisão registrada no planejamento da tarefa de upload de
// exame, reaproveitada aqui sem mudança de estratégia. Único ponto que
// muda por domínio é `fetchStatus` e quais strings de status contam como
// "pronto" ou "falhou".
export function useStatusPolling<T extends { status: string }>({
  id,
  fetchStatus,
  doneStatuses,
  failedStatus,
  onDone,
}: UseStatusPollingOptions<T>) {
  const { token } = useAuth();
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!token || !id) return;

    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const current = await fetchStatus(token!, id!);
        if (cancelled) return;
        setResult(current);
        setError(null);

        if (doneStatuses.includes(current.status)) {
          onDone(current);
          return;
        }
        if (current.status === failedStatus) {
          return;
        }
        pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setError("Não foi possível checar o status agora. Tentando de novo...");
        pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    const slowTimer = setTimeout(() => setSlow(true), SLOW_WARNING_MS);

    return () => {
      cancelled = true;
      clearTimeout(pollTimeout);
      clearTimeout(slowTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  return { status: result?.status ?? null, error, slow };
}
