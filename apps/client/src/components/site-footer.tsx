"use client";

// Pied de page — lot Retouches. « Au strict minimum » (demande Ko).
//
// ⚠ CE QU'IL NE CONTIENT PAS, ET POURQUOI. Un pied de page est l'endroit où les
// promesses s'accumulent sans que personne les relise : réseaux sociaux qui
// n'existent pas, « À propos » vers une 404, newsletter sans destinataire,
// numéro de téléphone que personne ne décroche. Il n'y a donc ICI que des liens
// vers des pages qui EXISTENT dans `app/[locale]/` — vérifié, pas supposé :
// `cgu` et `confidentialite`. Le jour où d'autres existeront, elles s'ajouteront.
//
// ⚠ Pas de sélecteur de langue ni de thème : ils sont déjà dans l'en-tête, et
// deux commandes pour un même réglage se désynchronisent visuellement à la
// première divergence de style.
import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");
  // ⚠ Calculée au RENDU, pas figée dans une chaîne : une année en dur devient
  // fausse le 1er janvier, et personne ne s'en aperçoit avant des mois.
  const annee = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-brand">Zwadj</p>
        <nav aria-label={t("navLabel")}>
          <ul>
            <li>
              <Link href="/cgu">{t("terms")}</Link>
            </li>
            <li>
              <Link href="/confidentialite">{t("privacy")}</Link>
            </li>
          </ul>
        </nav>
        <p className="site-footer-legal">{t("copyright", { year: annee })}</p>
      </div>
    </footer>
  );
}
