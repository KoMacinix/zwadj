// Fournisseur de session (app Pro). Même architecture que le client (glue
// React fine autour du paquet partagé) avec UNE différence assumée : PAS
// d'enchaînement register→login — D1 interdit la session PRO non vérifiée,
// le parcours post-inscription est « vérifiez votre email » (D21).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUserDTO, LoginInput } from "@zwadj/types";
import { createAuthClient, type AuthClient } from "../lib/auth-client";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUserDTO | null;
  /** Instance UNIQUE du client API (anonyme + authentifié) : les pages la
   *  consomment d'ici — c'est ce qui rend l'injection de test totale. */
  api: AuthClient;
  login(input: LoginInput): Promise<AuthUserDTO>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  client
}: {
  children: React.ReactNode;
  /** Injectable pour les tests de composants. */
  client?: AuthClient;
}) {
  const clientRef = useRef<AuthClient | null>(client ?? null);
  clientRef.current ??= createAuthClient();
  const api = clientRef.current;

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUserDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.bootstrap().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setStatus(restored ? "authenticated" : "anonymous");
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await api.login(input);
      setUser(session.user);
      setStatus("authenticated");
      return session.user;
    },
    [api]
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("anonymous");
  }, [api]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, api, login, logout }),
    [status, user, api, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>.");
  return ctx;
}
