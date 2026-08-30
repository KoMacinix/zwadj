// Top panel de l'espace Pro — Lot UIP-A.
//
// ── Cinq entrées, et aucune sixième ─────────────────────────────────────────
// Tableau de bord · Ma salle/Mes salles · Demandes · Calendrier · Réservations.
// Revenus, Prestations et Visites du design sont des EXCLUSIONS assumées du
// cadrage : les prestations vivent dans l'écran salle, les visites dans
// Demandes, et Revenus n'a pas de donnée. Une entrée qui mène à un écran vide
// apprend surtout que le site ne marche pas (leçon de la nav « bientôt » du
// site client).
//
// ── Libellé adaptatif (décision ①) ──────────────────────────────────────────
// « Ma salle » tant que le pro n'en a qu'une — le cas général en Algérie —
// « Mes salles » dès la seconde. C'est le COMPTE qui pilote le mot, jamais deux
// entrées : deux chemins pour la même liste, c'est A11a à l'envers.
// ⚠ Pendant le chargement le compte vaut 0 et le libellé reste au singulier :
// afficher « Mes salles » puis le voir se rétracter serait un scintillement.
//
// ── `NavLink` et pas `Link` ─────────────────────────────────────────────────
// Il pose `aria-current="page"` tout seul. L'état actif n'est donc PAS porté
// par la seule couleur du soulignement — un pro daltonien lit la même
// information, et un lecteur d'écran l'annonce.
//
// ⚠ `end` sur « / » : MESURÉ, pas supposé. Sur react-router 7, un `NavLink
// to="/"` ne se marque PAS actif sur `/demandes`, même sans `end` — relevé sur
// une sonde avant d'écrire cette ligne. `end` est donc REDONDANT ici, et il est
// conservé comme DÉCLARATION explicite plutôt que comme dépendance à un cas
// particulier de bibliothèque non documenté. Conséquence assumée et consignée :
// aucun test ne peut prouver qu'il mord, puisqu'il n'y a rien à mordre — il ne
// figure donc pas dans la campagne de neutralisation.
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useProVenues } from "./pro-venues-context";

interface NavEntry {
  to: string;
  label: string;
  /** `end` n'est vrai que pour « / » : sans lui, l'accueil resterait actif sur
   *  toutes les routes, puisqu'elles commencent toutes par « / ». */
  end?: boolean;
}

export function ProNav() {
  const { t } = useTranslation();
  const { count } = useProVenues();

  const entries: NavEntry[] = [
    { to: "/", label: t("venue.ui.nav.dashboard"), end: true },
    { to: "/salles", label: count > 1 ? t("venue.ui.nav.myVenues") : t("venue.ui.nav.myVenue") },
    { to: "/demandes", label: t("venue.ui.nav.requests") },
    { to: "/calendrier", label: t("venue.ui.nav.calendar") },
    { to: "/reservations", label: t("venue.ui.nav.bookings") }
  ];

  return (
    <nav className="pro-nav" aria-label={t("venue.ui.nav.label")}>
      <ul className="pro-nav-list">
        {entries.map((entry) => (
          <li key={entry.to}>
            <NavLink
              to={entry.to}
              end={entry.end}
              className={({ isActive }) => (isActive ? "pro-nav-link is-active" : "pro-nav-link")}
            >
              {entry.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
