import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@zwadj/i18n";

// Routing localisé /fr /ar — invariant AGENTS.md (bilingue + SSR).
export const routing = defineRouting({
  locales,
  defaultLocale
});
