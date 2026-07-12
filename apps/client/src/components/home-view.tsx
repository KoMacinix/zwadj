"use client";

// Vue d'accueil (client component) — séparée de la page serveur pour être
// testable unitairement sous NextIntlClientProvider (test du squelette).
import { useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";

export function HomeView({ apiStatus }: { apiStatus: string }) {
  const t = useTranslations("home");
  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("tagline")}</p>
      <p>{t("apiStatus", { status: apiStatus })}</p>
      {/* Preuve d'import runtime cross-package (formatter DZD, centimes entiers) */}
      <p data-testid="sample-price">{formatDZD(85000000)}</p>
    </main>
  );
}
