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
  /**
   * Lot A11a — réhydratation de la session APRÈS une mutation de compte.
   *
   * Deux formes, parce que les deux cas existent réellement :
   *  - `applyUser` quand l'API a déjà renvoyé le DTO à jour (PATCH profil) —
   *    aucun aller-retour de plus ;
   *  - `reloadUser` quand elle ne l'a pas fait (change-password répond
   *    `{ status: "ok" }`). Sans ce rechargement, `hasPassword` resterait à
   *    `false` en mémoire et l'écran mot de passe resterait bloqué en mode
   *    « définir » alors que le mot de passe VIENT d'être posé (D42).
   */
  applyUser(user: AuthUserDTO): void;
  reloadUser(): Promise<void>;
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

  const applyUser = useCallback((next: AuthUserDTO) => {
    setUser(next);
  }, []);

  const reloadUser = useCallback(async () => {
    // `authedRequest` et non une méthode dédiée d'AuthClient : étendre cette
    // interface casserait les mocks manuels des DEUX apps (piège §0.4, déjà
    // payé deux fois). Le mutex de refresh est partagé de la même façon.
    const fresh = await api.authedRequest<AuthUserDTO>("/auth/me");
    setUser(fresh);
  }, [api]);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("anonymous");
  }, [api]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, api, login, logout, applyUser, reloadUser }),
    [status, user, api, login, logout, applyUser, reloadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>.");
  return ctx;
}
