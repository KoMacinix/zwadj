// « Sur quelle salle porte cet écran ? » — Lot UIP-A.
//
// Le top panel propose quatre entrées GLOBALES (tableau de bord, demandes,
// calendrier, réservations) alors que toutes les données de l'API sont portées
// par une salle : `/pro/venues/:id/bookings`, `/pro/venues/:id/visit-bookings`,
// `/venues/:slug/availability`. Il faut donc résoudre la salle, et le faire au
// MÊME endroit pour les quatre écrans — sinon chacun invente sa règle et le
// jour où un pro a deux salles, deux écrans en montrent deux différentes.
//
// Quatre états, quatre réponses :
//   - chargement  → on le dit, on ne rend rien de faux ;
//   - erreur      → on le dit AVEC un bouton de reprise (la liste vient d'un
//                   réseau, pas d'une certitude) ;
//   - aucune salle → ce n'est PAS une erreur. C'est un pro qui vient de
//                   s'inscrire, et le seul geste utile est d'en créer une ;
//   - une ou plus → l'écran est rendu ; à partir de DEUX, un sélecteur apparaît.
//
// ⚠ Le sélecteur n'apparaît qu'à partir de deux salles. En afficher un pour un
// choix unique, c'est demander une décision qui n'existe pas.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { VenueProDTO } from "@zwadj/types";
import { useProVenues } from "./pro-venues-context";

export function VenueScope({ children }: { children: (venue: VenueProDTO) => React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { state, current, count, select, reload } = useProVenues();
  const isAr = i18n.language === "ar";

  if (state.kind === "loading") {
    return (
      <p className="field-hint" aria-busy="true">
        {t("venue.ui.scope.loading")}
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="state-panel">
        <p role="alert">{t("venue.ui.scope.error")}</p>
        <button type="button" className="btn" onClick={reload}>
          {t("venue.ui.scope.retry")}
        </button>
      </div>
    );
  }

  if (current === null) {
    return (
      <div className="state-panel">
        <p>{t("venue.ui.scope.none")}</p>
        <Link className="btn btn-accent" to="/salles/nouvelle">
          {t("venue.ui.scope.create")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {count > 1 ? (
        <div className="pro-scope">
          <label className="field-label" htmlFor="pro-scope-venue">
            {t("venue.ui.scope.label")}
          </label>
          <select
            id="pro-scope-venue"
            value={current.id}
            onChange={(event) => select(event.target.value)}
          >
            {state.venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {isAr ? venue.nameAr : venue.nameFr}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {children(current)}
    </>
  );
}
