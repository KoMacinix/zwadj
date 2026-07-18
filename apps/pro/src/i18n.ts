// Runtime i18next (app Pro) — les MESSAGES viennent de @zwadj/i18n (AGENTS.md).
// Distinction de runtime assumée : next-intl côté client (locale dans l'URL),
// i18next ici (locale = état applicatif persisté — PRO_URL n'a PAS de préfixe
// de locale, c'est le contrat des liens d'email depuis le Lot 0).
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, locales, messages } from "@zwadj/i18n";

type Locale = (typeof locales)[number];

const STORAGE_KEY = "zwadj.pro.lang";

function readStoredLang(): Locale {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw && (locales as readonly string[]).includes(raw) ? (raw as Locale) : defaultLocale;
  } catch {
    return defaultLocale;
  }
}

/** lang + dir sur <html> : le RTL de TOUTE l'app pro découle d'ici. */
function applyDocumentLanguage(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export function initI18n() {
  if (i18next.isInitialized) return i18next;
  const lng = typeof window === "undefined" ? defaultLocale : readStoredLang();
  void i18next.use(initReactI18next).init({
    resources: {
      fr: { translation: messages.fr },
      ar: { translation: messages.ar }
    },
    lng,
    fallbackLng: defaultLocale,
    // Les messages partagés utilisent l'interpolation à ACCOLADE SIMPLE
    // ({email}) — format next-intl/API. On aligne i18next dessus au lieu de
    // maintenir deux dialectes dans packages/i18n.
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" }
  });
  applyDocumentLanguage(i18next.language);
  i18next.on("languageChanged", (lang) => {
    applyDocumentLanguage(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* stockage indisponible : la langue reste valable pour la session */
    }
  });
  return i18next;
}
