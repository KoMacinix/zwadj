// AGENTS.md : packages/i18n contient MESSAGES + FORMATTERS, pas le runtime
// (next-intl vit dans apps/client, i18next dans apps/pro).
import fr from "../messages/fr.json";
import ar from "../messages/ar.json";

export const locales = ["fr", "ar"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "fr";

export const messages = { fr, ar } as const;
export type Messages = typeof fr;

export { formatDZD, formatRating } from "./format";
