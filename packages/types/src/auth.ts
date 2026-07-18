import { z } from "zod";
import type { Locale, UserRole } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Schémas Zod AUTH — partagés front/back (AGENTS.md : « Validation Zod
// (partagé front/back) », « DTOs + validation Zod aux frontières »).
// Les messages sont des CLÉS i18n (auth.validation.*) : l'API les renvoie
// telles quelles dans son enveloppe d'erreur, les fronts les localisent.
// ─────────────────────────────────────────────────────────────────────────────

/** Politique mot de passe validée (Lot 0) : min 8, ≥ 1 lettre, ≥ 1 chiffre, max 128. */
export const passwordSchema = z
  .string({ required_error: "auth.validation.passwordRequired" })
  .min(8, "auth.validation.passwordTooShort")
  .max(128, "auth.validation.passwordTooLong")
  .regex(/[\p{L}]/u, "auth.validation.passwordNeedsLetter")
  .regex(/\d/, "auth.validation.passwordNeedsDigit");

export const emailSchema = z
  .string({ required_error: "auth.validation.emailRequired" })
  .trim()
  .toLowerCase()
  .email("auth.validation.emailInvalid")
  .max(254, "auth.validation.emailInvalid");

/**
 * Téléphone pro : +213 suivi de 8 ou 9 chiffres (fixe/mobile DZ).
 * Volontairement permissif au MVP — normalisation/validation fine via
 * libphonenumber prévue au backlog (23.9), ne pas durcir ici.
 */
export const dzPhoneSchema = z
  .string({ required_error: "auth.validation.phoneRequired" })
  .trim()
  .regex(/^\+213\d{8,9}$/, "auth.validation.phoneInvalid");

export const localeSchema = z.enum(["fr", "ar"]).default("fr");

/** Inscription CLIENT (D3 : le pro a son propre schéma, champs métier en plus). */
export const registerClientSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  locale: localeSchema
});
export type RegisterClientInput = z.infer<typeof registerClientSchema>;

/** Inscription PRO (D3 option A) : businessName + phone dès l'inscription,
 *  création User + ProProfile en une transaction côté API. */
export const registerProSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  businessName: z
    .string({ required_error: "auth.validation.businessNameRequired" })
    .trim()
    .min(2, "auth.validation.businessNameTooShort")
    .max(150, "auth.validation.businessNameTooLong"),
  phone: dzPhoneSchema,
  locale: localeSchema
});
export type RegisterProInput = z.infer<typeof registerProSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "auth.validation.passwordRequired" }).min(1, "auth.validation.passwordRequired"),
  // Lot 7 — « Se souvenir de moi » : true (défaut) = cookie refresh persistant
  // 30 j ; false = cookie de SESSION (meurt avec le navigateur). Le défaut
  // couvre aussi le pro, qui n'expose pas la case.
  rememberMe: z.boolean().optional().default(true)
});
// z.INPUT (pas z.infer/output) : rememberMe porte un .default(true), donc le
// type d'ENTRÉE le laisse optionnel pour tout appelant de login() ; le
// default n'est matérialisé qu'au .parse() (ValidationPipe côté API).
export type LoginInput = z.input<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: "auth.validation.tokenRequired" }).min(20, "auth.validation.tokenInvalid"),
  password: passwordSchema
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resendVerificationSchema = z.object({ email: emailSchema });
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/** Codes d'erreur métier auth (stables, consommés par les fronts). */
export const AuthErrorCode = {
  EMAIL_ALREADY_USED: "EMAIL_ALREADY_USED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS", // login : email inconnu OU mauvais mdp (anti-énumération, D5)
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED", // D1 : bloquant pour PRO/ADMIN uniquement
  TOKEN_INVALID_OR_EXPIRED: "TOKEN_INVALID_OR_EXPIRED",
  UNAUTHENTICATED: "UNAUTHENTICATED", // JWT absent/invalide/expiré (JwtAuthGuard global, Lot 2)
  FORBIDDEN: "FORBIDDEN" // rôle insuffisant (RolesGuard, Lot 2)
} as const;
export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

/**
 * Schéma de POST /auth/register — endpoint unique, union discriminée par rôle
 * (backlog : « Implement POST /auth/register » ; D3 : le PRO fournit
 * businessName + phone). ADMIN est volontairement inéligible à l'inscription.
 */
export const registerSchema = z.discriminatedUnion("role", [
  registerClientSchema.extend({ role: z.literal("CLIENT") }),
  registerProSchema.extend({ role: z.literal("PRO") })
]);
export type RegisterInput = z.infer<typeof registerSchema>;

/** Token opaque de vérification/reset : 43 caractères base64url (256 bits). */
export const opaqueTokenSchema = z
  .string({ required_error: "auth.validation.tokenRequired" })
  .regex(/^[A-Za-z0-9_-]{43}$/, "auth.validation.tokenInvalid");

// ── DTOs de réponse (contrats consommés par les fronts, Lots 5/6) ───────────
export interface RegisteredUserDTO {
  id: string;
  email: string;
  role: "CLIENT" | "PRO";
  locale: "fr" | "ar";
}
export interface RegisterResponse {
  user: RegisteredUserDTO;
}
export interface VerifyEmailResponse {
  status: "verified";
}
/**
 * Utilisateur authentifié tel qu'exposé par POST /auth/login et GET /auth/me.
 * `emailVerified` est un booléen dérivé (jamais la date brute) : c'est LA
 * source du bandeau « vérifiez votre email » côté Client (D1) — le JWT ne
 * porte volontairement pas cette info (D4 : claims minimales, données
 * fraîches via /auth/me).
 */
export interface AuthUserDTO {
  id: string;
  email: string;
  role: UserRole;
  locale: Locale;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  /** Renseigné pour un PRO uniquement (D3) — null pour CLIENT/ADMIN. */
  proProfile: { businessName: string; phone: string } | null;
}
/** POST /auth/login — l'access token va en mémoire JS ; le refresh token, lui,
 *  n'apparaît JAMAIS dans le corps : cookie httpOnly `zwadj_rt` (D2). */
export interface LoginResponse {
  accessToken: string;
  user: AuthUserDTO;
}
/** GET /auth/me — lecture BDD fraîche, pas un décodage du JWT. */
export type MeResponse = AuthUserDTO;
/** POST /auth/refresh (D12) — même forme que le login : le front n'a qu'UN
 *  chemin d'hydratation de session (boot d'app = refresh, mêmes données). */
export type RefreshResponse = LoginResponse;
/** POST /auth/logout — constante, idempotente : un logout n'échoue jamais. */
export interface LogoutResponse {
  status: "ok";
}
/** Réponse CONSTANTE de resend-verification (anti-énumération). */
export interface ResendVerificationResponse {
  status: "ok";
}
/** Réponse CONSTANTE de forgot-password (anti-énumération, même patron). */
export interface ForgotPasswordResponse {
  status: "ok";
}
/** POST /auth/reset-password — ne connecte PAS (D17) : l'utilisateur se
 *  reconnecte avec son nouveau mot de passe. */
export interface ResetPasswordResponse {
  status: "ok";
}
