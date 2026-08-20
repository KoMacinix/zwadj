import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";

// Placeholder « Bientôt disponible » (motif de la décision produit n°11) :
// cible du lien CGU de l'inscription. Le document existe (référentiel projet),
// sa mise en page arrive avant le lancement — hors périmètre Lot 5.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("legal");
  return {
    title: `${t("cgu")} — Zwadj`,
    // Page légale : INDEXABLE. Elle est stable, unique, et sa présence
    // dans l'index est un signal de sérieux pour un marchand.
    ...publicMetadata({ locale, canonicalPath: "/cgu", indexable: true })
  };
}

export default async function CguPage() {
  const t = await getTranslations("legal");
  return (
    <main className="auth-main">
      <div className="state-panel">
        <h1>{t("cgu")}</h1>
        <p>{t("comingSoon")} / قريباً</p>
      </div>
    </main>
  );
}
