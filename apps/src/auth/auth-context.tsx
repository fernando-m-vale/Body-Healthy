import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearToken, getToken, saveToken } from "./token-storage";

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  setToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Fonte única do token em memória (pra não ler o SecureStore em toda tela) e
// responsável por persisti-lo. Carrega o token salvo, se houver, ao montar.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getToken()
      .then(setTokenState)
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isLoading,
      setToken: async (newToken: string) => {
        await saveToken(newToken);
        setTokenState(newToken);
      },
      logout: async () => {
        await clearToken();
        setTokenState(null);
      },
    }),
    [token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  }
  return context;
}
