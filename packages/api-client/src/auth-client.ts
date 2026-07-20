// Client API auth PARTAGÉ client/pro (Lot 6 — D18). Logique PURE, framework-free :
// testée unitairement avec un fetch injecté. AUCUNE lecture d'env ici — chaque
// app injecte sa base URL (process.env côté Next, import.meta.env côté Vite).
// Trois responsabilités :
//   1. parler l'enveloppe d'erreur de l'API (filtre Nest → ApiError typée) ;
//   2. porter l'access token EN MÉMOIRE JS uniquement (D2 — jamais de storage) ;
//   3. rafraîchir en SINGLE-FLIGHT et rejouer UNE fois sur 401 (note Lot 3 :
//      le front sérialise ses refresh — c'est ce mutex).
import type {
  AuthUserDTO,
  ForgotPasswordResponse,
  GoogleAuthInput,
  GoogleAuthResponse,
  LoginInput,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RegisterInput,
  RegisterResponse,
  ResendVerificationResponse,
  ResetPasswordResponse,
  VerifyEmailResponse
} from "@zwadj/types";



/** Une issue de validation Zod telle que renvoyée par la pipe de l'API. */
export interface ApiIssue {
  path: string;
  message: string; // clé i18n auth.validation.*
}

/** Erreur API normalisée : code métier stable + clé i18n + issues éventuelles. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly messageKey: string | undefined,
    readonly issues: ApiIssue[] = []
  ) {
    super(messageKey ?? code);
    this.name = "ApiError";
  }
}

/** L'API est injoignable (réseau coupé, serveur éteint). */
export class NetworkError extends Error {
  constructor() {
    super("network");
    this.name = "NetworkError";
  }
}

interface ErrorEnvelope {
  statusCode?: number;
  message?: { code?: string; message?: string; issues?: ApiIssue[] };
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: ErrorEnvelope = {};
  try {
    body = (await res.json()) as ErrorEnvelope;
  } catch {
    /* corps non-JSON (proxy, etc.) : on retombe sur le status seul */
  }
  return new ApiError(
    res.status,
    body.message?.code ?? (res.status === 429 ? "RATE_LIMITED" : "UNKNOWN"),
    body.message?.message,
    body.message?.issues ?? []
  );
}

export interface AuthClient {
  bootstrap(): Promise<AuthUserDTO | null>;
  login(input: LoginInput): Promise<LoginResponse>;
  /** Lot 9 — POST /auth/google (ID token GIS + locale courante du front).
   *  Consommé par le Client UNIQUEMENT (cadrage OAuth : bouton absent du Pro) ;
   *  vit ici pour partager le stockage mémoire du token (D2) avec login(). */
  googleAuth(input: GoogleAuthInput): Promise<GoogleAuthResponse>;
  register(input: RegisterInput): Promise<RegisterResponse>;
  logout(): Promise<LogoutResponse>;
  me(): Promise<MeResponse>;
  verifyEmail(token: string): Promise<VerifyEmailResponse>;
  resendVerification(email: string): Promise<ResendVerificationResponse>;
  forgotPassword(email: string): Promise<ForgotPasswordResponse>;
  resetPassword(token: string, password: string): Promise<ResetPasswordResponse>;
  getAccessToken(): string | null;
}

/**
 * Fabrique du client. `fetchImpl` est injectable pour les tests ; en prod
 * c'est le fetch du navigateur, TOUJOURS avec credentials: "include" pour que
 * le cookie httpOnly `zwadj_rt` circule (D2).
 */
export function createAuthClient(
  baseUrl: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): AuthClient {
  let accessToken: string | null = null;
  let refreshInFlight: Promise<string | null> | null = null;

  async function raw<T>(path: string, init: { method?: string; body?: unknown; bearer?: boolean } = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}/api/v1${path}`, {
        method: init.method ?? "GET",
        credentials: "include",
        headers: {
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(init.bearer && accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined
      });
    } catch {
      throw new NetworkError();
    }
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as T;
  }

  /** SINGLE-FLIGHT : dix appels concurrents = UN seul POST /auth/refresh.
   *  Indispensable côté front : l'API traite un refresh concurrent du même
   *  token comme une réutilisation (D10) et révoque tout. */
  function refreshAccessToken(): Promise<string | null> {
    refreshInFlight ??= raw<LoginResponse>("/auth/refresh", { method: "POST" })
      .then((session) => {
        accessToken = session.accessToken;
        return accessToken;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  }

  /** Requête authentifiée : Bearer en mémoire, et sur 401 UNAUTHENTICATED,
   *  UN refresh puis UN rejeu — jamais de boucle. */
  async function authed<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    try {
      return await raw<T>(path, { ...init, bearer: true });
    } catch (e) {
      const expired = e instanceof ApiError && e.status === 401 && e.code === "UNAUTHENTICATED";
      if (!expired) throw e;
      const renewed = await refreshAccessToken();
      if (!renewed) throw e;
      return raw<T>(path, { ...init, bearer: true });
    }
  }

  return {
    /** Boot d'app : tentative silencieuse de session via le cookie (D12 :
     *  la réponse du refresh porte déjà l'utilisateur — zéro /me en plus). */
    async bootstrap() {
      const session = await raw<LoginResponse>("/auth/refresh", { method: "POST" }).catch(() => null);
      if (!session) return null;
      accessToken = session.accessToken;
      return session.user;
    },

    async login(input) {
      const session = await raw<LoginResponse>("/auth/login", { method: "POST", body: input });
      accessToken = session.accessToken;
      return session;
    },

    async googleAuth(input) {
      // 200 même à la création (arbitrage Lot 8) : une seule forme de réponse,
      // donc un seul chemin d'hydratation — identique à login().
      const session = await raw<GoogleAuthResponse>("/auth/google", { method: "POST", body: input });
      accessToken = session.accessToken;
      return session;
    },

    register: (input) => raw<RegisterResponse>("/auth/register", { method: "POST", body: input }),

    async logout() {
      const res = await raw<LogoutResponse>("/auth/logout", { method: "POST" }).catch(() => ({ status: "ok" }) as LogoutResponse);
      accessToken = null; // même si l'API était injoignable : état local cohérent
      return res;
    },

    me: () => authed<MeResponse>("/auth/me"),
    verifyEmail: (token) => raw<VerifyEmailResponse>(`/auth/verify-email/${encodeURIComponent(token)}`),
    resendVerification: (email) => raw<ResendVerificationResponse>("/auth/resend-verification", { method: "POST", body: { email } }),
    forgotPassword: (email) => raw<ForgotPasswordResponse>("/auth/forgot-password", { method: "POST", body: { email } }),
    resetPassword: (token, password) =>
      raw<ResetPasswordResponse>("/auth/reset-password", { method: "POST", body: { token, password } }),

    getAccessToken: () => accessToken
  };
}
