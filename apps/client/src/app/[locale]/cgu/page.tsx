import { getTranslations } from "next-intl/server";

// Placeholder « Bientôt disponible » (motif de la décision produit n°11) :
// cible du lien CGU de l'inscription. Le document existe (référentiel projet),
// sa mise en page arrive avant le lancement — hors périmètre Lot 5.
export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: `${t("cgu")} — Zwadj` };
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
