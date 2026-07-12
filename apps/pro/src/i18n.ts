// Runtime i18next (app Pro) — les MESSAGES viennent de @zwadj/i18n (AGENTS.md).
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, messages } from "@zwadj/i18n";

export function initI18n() {
  if (i18next.isInitialized) return i18next;
  void i18next.use(initReactI18next).init({
    resources: {
      fr: { translation: messages.fr },
      ar: { translation: messages.ar }
    },
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    interpolation: { escapeValue: false }
  });
  return i18next;
}
