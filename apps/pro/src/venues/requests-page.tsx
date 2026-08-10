// Demandes — Lot UIP-A.
//
// ── Deux volets, une seule entrée de navigation ─────────────────────────────
// Le cadrage regroupe ici les demandes de réservation de DATE et les rendez-vous
// de VISITE. C'est cohérent côté pro — « qui me demande quelque chose ? » — et
// ça ne coûte rien côté modèle.
//
// ⚠ MAIS ELLES NE FUSIONNENT PAS (D47). Visites et réservations de fête « ne
// partagent aucune structure » : deux tables, deux cycles de vie, deux
// contraintes. Deux VOLETS séparés, jamais une liste unique triée par date —
// une liste mêlée obligerait à inventer un statut commun, et un statut inventé
// finit par mentir.
//
// ── Les demandes AVANT les visites ──────────────────────────────────────────
// L'ordre suit l'urgence, pas la chronologie des lots : une demande non traitée
// expire, un rendez-vous de visite non lu ne coûte qu'une surprise.
//
// ── Ce volet-ci ne montre PAS les dates verrouillées ────────────────────────
// `ACCEPTED`/`CONFIRMED` ont leur propre écran (Réservations). Sans cette
// partition, la même réservation s'annulerait depuis deux endroits — et deux
// chemins pour un geste destructeur, c'est un de trop.
import { useTranslation } from "react-i18next";
import { ProHeader } from "../shell/pro-header";
import { VenueScope } from "../shell/venue-scope";
import { BookingRequestsSection } from "./booking-requests-section";
import { GuardedSection } from "./guarded-section";
import { VisitsSection } from "./visits-section";

export function RequestsPage() {
  const { t } = useTranslation();

  return (
    <>
      <ProHeader />
      <main className="page">
        <div className="page-head">
          <h1>{t("venue.ui.requests.pageTitle")}</h1>
        </div>
        <p className="field-hint">{t("venue.ui.requests.pageIntro")}</p>

        <VenueScope>
          {(venue) => (
            <>
              <GuardedSection title={t("venue.ui.requests.title")}>
                <BookingRequestsSection venueId={venue.id} show="open" />
              </GuardedSection>

              <GuardedSection title={t("venue.ui.visits.title")}>
                <VisitsSection venueId={venue.id} />
              </GuardedSection>
            </>
          )}
        </VenueScope>
      </main>
    </>
  );
}
