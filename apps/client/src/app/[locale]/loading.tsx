"use client";

// Fallback de Suspense de l'App Router (Lot A12, D44) — il enveloppe les pages
// du segment [locale], donc il est rendu À L'INTÉRIEUR du layout, sous le
// `NextIntlClientProvider` : `useTranslations` y fonctionne.
//
// Composant CLIENT à dessein : un fallback doit se rendre SYNCHRONEMENT. Un
// composant serveur asynchrone (`getTranslations`) suspendrait DANS le
// fallback — exactement ce qu'un fallback ne doit pas faire.
//
// `site-chrome.tsx` reste EN L'ÉTAT sur sa branche `loading` : le vide y est
// délibéré (pas de flash « Connexion » → « Mon compte » dans l'en-tête).
import { useTranslations } from "next-intl";
import { BrandLoader } from "@zwadj/ui";

export default function LocaleLoading() {
  const t = useTranslations("common");
  return (
    <main className="auth-main" aria-busy="true">
      <BrandLoader label={t("loading")} />
    </main>
  );
}
