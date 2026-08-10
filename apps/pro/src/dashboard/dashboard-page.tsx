// Tableau de bord — la page « Nouvelle réservation » du pro.
//
// ── Ce que la refonte a retiré, et il faut le dire ──────────────────────────
// ⚠ `QuotesSection` n'est PLUS montée ici. Elle portait la liste des chaînes de
// devis, leur historique de versions, et trois actions qui deviennent donc
// INATTEIGNABLES pour l'instant : envoyer un brouillon existant, marquer un devis
// refusé, et convertir un devis parti il y a plusieurs jours. Ko a demandé de
// retirer cette partie pour la retravailler après la refonte — c'est un retrait
// ASSUMÉ, pas un oubli, et il est listé dans la note de livraison. Le composant
// reste dans le dépôt, il n'est simplement plus rendu.
//
// Seul son résumé de transformation survit, dans la section dépliable du panneau
// gauche : c'est l'indicateur, pas l'outil.
//
// ── Le titre appartient au parcours ─────────────────────────────────────────
// Le `<h1>` (« Nouvelle réservation ») vit dans `WalkinJourney`, avec son
// sur-titre et sa description : les trois se lisent comme un seul bloc, et les
// séparer ferait dériver l'un sans l'autre. La page, elle, se charge de la
// coquille et de la résolution de la salle.
import { useTranslation } from "react-i18next";
import { ProHeader } from "../shell/pro-header";
import { useProVenues } from "../shell/pro-venues-context";
import { VenueScope } from "../shell/venue-scope";
import { GuardedSection } from "../venues/guarded-section";
import { DashboardAside } from "./dashboard-aside";
import { WalkinJourney } from "./walkin-journey";

export function DashboardPage() {
  const { t } = useTranslation();
  const { current } = useProVenues();

  return (
    <>
      <ProHeader />
      <div className="pro-layout">
        {/* Décision ⑨ — le panneau gauche n'existe QUE sur cet écran, et il n'a
            rien à dire tant qu'aucune salle n'est résolue. */}
        {current ? (
          <aside className="pro-aside" aria-label={t("venue.ui.aside.label")}>
            <DashboardAside venue={current} />
          </aside>
        ) : null}

        <main className="pro-layout-main wk-main">
          {/* ⚠ Un titre MÊME SANS SALLE. Le `<h1>` et les deux boutons d'issue
              vivent dans le parcours, parce qu'ils forment une seule ligne dans
              la maquette et que les boutons ont besoin de son état. Mais un pro
              qui vient de s'inscrire n'a pas de salle : sans ce repli, l'écran
              n'aurait alors AUCUN titre — ni pour le lecteur d'écran, ni pour le
              visiteur. Le titre appartient à la page ; la salle ne conditionne
              que le contenu. */}
          {current === null ? (
            <header className="wk-head">
              <div>
                <p className="wk-eyebrow">
                  <span className="wk-eyebrow-rule" aria-hidden="true" />
                  {t("venue.ui.walkin.eyebrow")}
                </p>
                <h1 className="wk-title">{t("venue.ui.walkin.title")}</h1>
                <p className="wk-lede">{t("venue.ui.walkin.lede")}</p>
              </div>
            </header>
          ) : null}

          <VenueScope>
            {(venue) => (
              <GuardedSection title={t("venue.ui.walkin.title")}>
                <WalkinJourney venue={venue} />
              </GuardedSection>
            )}
          </VenueScope>
        </main>
      </div>
    </>
  );
}
