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

/** Exporté (Lot A5) : le client venue réutilise CE parseur — la doctrine
 *  `ApiError` (code métier + clé i18n + issues) ne doit exister qu'ici. */
export async function toApiError(res: Response): Promise<ApiError> {
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

/** Init d'une requête authentifiée générique (Lot A5). Volontairement pauvre :
 *  ni `bearer` (toujours vrai ici) ni headers libres — la primitive reste une
 *  primitive, pas un second client HTTP.
 *
 *  Lot A6a-P : `body` reste `unknown` — AUCUN élargissement de type n'est
 *  nécessaire pour le multipart, `FormData` y entre déjà. La seule chose qui
 *  change est le RUNTIME de `raw()` : un `FormData` passe tel quel, sans
 *  `JSON.stringify` ni `Content-Type` (le navigateur pose la boundary). */
export interface AuthedRequestInit {
  method?: string;
  body?: unknown;
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
  /**
   * Lot A5 (§8, option a) — primitive authentifiée GÉNÉRIQUE, ouverte aux
   * autres domaines (venue aujourd'hui, réservations demain). Délègue au
   * `authed<T>` privé : MÊME token mémoire (D2), MÊME mutex single-flight —
   * N appels 401 concurrents ⇒ UN `POST /auth/refresh` et UN rejeu, jamais de
   * boucle. C'est ce qui évite une 3ᵉ voie à `fetch` nu authentifié.
   */
  authedRequest<T>(path: string, init?: AuthedRequestInit): Promise<T>;
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
    // A6a-P — PASSE-PLAT multipart : un FormData part tel quel et SANS
    // Content-Type. Le poser à la main casse le multipart (la boundary est
    // générée par le navigateur et doit figurer dans l'en-tête). `typeof` en
    // garde : ce fichier tourne aussi côté Node (SSR du client Next).
    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}/api/v1${path}`, {
        method: init.method ?? "GET",
        credentials: "include",
        headers: {
          ...(init.body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...(init.bearer && accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        // Le rejeu après 401 réutilise CETTE MÊME instance : un FormData n'est
        // pas consommé par fetch (le corps est sérialisé à chaque envoi), il
        // reste donc ré-émissible — contrairement à un ReadableStream.
        body: init.body === undefined ? undefined : isFormData ? (init.body as FormData) : JSON.stringify(init.body)
      });
    } catch {
      throw new NetworkError();
    }
    if (!res.ok) throw await toApiError(res);
    // 204 sans corps (Lot A5 : DELETE /venues/:id) — rien à parser. Tolérance
    // VOLONTAIREMENT limitée à ce cas : toute autre réponse doit porter du JSON,
    // un corps vide inattendu reste une erreur (et non un `undefined` silencieux).
    if (res.status === 204) return undefined as T;
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

    authedRequest: <T,>(path: string, init?: AuthedRequestInit) => authed<T>(path, init),

    getAccessToken: () => accessToken
  };
}
