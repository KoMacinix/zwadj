import { z } from "zod";

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
  password: z.string({ required_error: "auth.validation.passwordRequired" }).min(1, "auth.validation.passwordRequired")
});
export type LoginInput = z.infer<typeof loginSchema>;

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
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED", // D1 : bloquant pour PRO uniquement
  TOKEN_INVALID_OR_EXPIRED: "TOKEN_INVALID_OR_EXPIRED"
} as const;
export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
