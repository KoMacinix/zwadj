"use client";

// Fournisseur de session (Lot 5) — enveloppe l'AuthClient pur dans un état
// React. Trois états : loading (boot silencieux en cours), anonymous,
// authenticated. Le bandeau D1 lit `user.emailVerified` ici.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUserDTO, LoginInput, RegisterInput } from "@zwadj/types";
import { createAuthClient, type AuthClient } from "./auth-client";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUserDTO | null;
  /** Instance UNIQUE du client API : les vues la consomment d'ici (symétrie
   *  avec l'app pro — l'injection de test couvre AUSSI les flux anonymes). */
  api: AuthClient;
  login(input: LoginInput): Promise<AuthUserDTO>;
  /** Inscription CLIENT puis connexion enchaînée (D1 : un CLIENT non vérifié
   *  peut ouvrir sa session — le bandeau prend le relais). */
  registerClient(input: RegisterInput & { role: "CLIENT" }): Promise<AuthUserDTO>;
  logout(): Promise<void>;
  resendVerification(): Promise<void>;
  /** Recharge l'utilisateur depuis /me (ex. après vérification d'email). */
  refreshUser(): Promise<void>;
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

  const registerClient = useCallback(
    async (input: RegisterInput & { role: "CLIENT" }) => {
      await api.register(input);
      // Le register ne renvoie pas de session (Lot 1) : on enchaîne le login
      // avec les mêmes identifiants — c'est exactement le cas prévu par D1.
      // Persistant par défaut : la case « se souvenir » n'existe que sur
      // l'écran de connexion, pas dans ce parcours.
      return login({ email: input.email, password: input.password, rememberMe: true });
    },
    [api, login]
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("anonymous");
  }, [api]);

  const resendVerification = useCallback(async () => {
    if (!user) return;
    await api.resendVerification(user.email);
  }, [api, user]);

  const refreshUser = useCallback(async () => {
    const fresh = await api.me().catch(() => null);
    if (fresh) {
      setUser(fresh);
      setStatus("authenticated");
    }
  }, [api]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, api, login, registerClient, logout, resendVerification, refreshUser }),
    [status, user, api, login, registerClient, logout, resendVerification, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>.");
  return ctx;
}
