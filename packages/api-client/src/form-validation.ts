// Validation de formulaire PARTAGÉE client/pro (D18) : on rejoue le MÊME schéma Zod que l'API
// (packages/types) avant l'envoi — mêmes règles, mêmes clés i18n, zéro dérive.
// L'API reste l'autorité ; ceci n'est que du confort (feedback immédiat).
import type { z } from "zod";

export type FieldErrors = Record<string, string>;

/** safeParse → map { champ: clé i18n } (première erreur par champ). */
export function validate<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown
): { data: z.infer<S>; errors: null } | { data: null; errors: FieldErrors } {
  const parsed = schema.safeParse(data);
  if (parsed.success) return { data: parsed.data as z.infer<S>, errors: null };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "_";
    errors[key] ??= issue.message; // les messages Zod partagés SONT des clés i18n
  }
  return { data: null, errors };
}

/** Reporte les issues renvoyées par l'API (400 de la ZodValidationPipe) sur
 *  les champs — même format { path, message: clé i18n }. */
export function issuesToFieldErrors(issues: { path: string; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) errors[issue.path] ??= issue.message;
  return errors;
}
