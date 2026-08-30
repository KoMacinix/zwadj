import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("legal");
  return {
    title: `${t("privacy")} — Zwadj`,
    // Page légale : INDEXABLE. Elle est stable, unique, et sa présence
    // dans l'index est un signal de sérieux pour un marchand.
    ...publicMetadata({ locale, canonicalPath: "/confidentialite", indexable: true })
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <main className="auth-main">
      <div className="state-panel">
        <h1>{t("privacy")}</h1>
        <p>{t("comingSoon")} / قريباً</p>
      </div>
    </main>
  );
}
