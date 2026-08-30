// Réservations — Lot UIP-A.
//
// ── ⚠ POURQUOI CET ÉCRAN MONTRE `ACCEPTED` ET PAS SEULEMENT `CONFIRMED` ─────
// Le cadrage demandait « uniquement celles déjà payées/confirmées ». Vérifié
// dans le dépôt avant d'écrire une ligne : `bookings.service.ts` porte, en
// toutes lettres, « ce lot s'arrête à ACCEPTED. Aucune route ne mène à
// CONFIRMED ». Aucun endpoint, aucun job, rien ne produit ce statut avant E3.
//
// Un écran filtré sur `CONFIRMED` serait donc VIDE en permanence — et il le
// serait en silence, ce qui est pire qu'une absence : le pro conclurait que
// l'application a perdu ses réservations. Pendant ce temps le statut qui
// VERROUILLE réellement les dates n'aurait aucun écran.
//
// Cet écran montre donc les DATES VERROUILLÉES : `ACCEPTED` + `CONFIRMED`, le
// même ensemble que la contrainte `EXCLUDE` en base et que la constante
// `LOCKING` de la section des demandes. Le jour où E3 encaisse un acompte, la
// ligne passe `CONFIRMED` et l'écran devient littéralement « payées/confirmées »
// SANS être retouché.
//
// ⚠ Et il DIT la dette D80 : tant que le lot Paiement n'existe pas, une date
// acceptée reste prise jusqu'à ce que le pro l'annule lui-même. C'est la phrase
// la plus importante de l'écran.
import { useTranslation } from "react-i18next";
import { ProHeader } from "../shell/pro-header";
import { VenueScope } from "../shell/venue-scope";
import { BookingRequestsSection } from "./booking-requests-section";
import { GuardedSection } from "./guarded-section";

export function BookingsPage() {
  const { t } = useTranslation();

  return (
    <>
      <ProHeader />
      <main className="page">
        <div className="page-head">
          <h1>{t("venue.ui.bookings.title")}</h1>
        </div>
        <p className="field-hint">{t("venue.ui.bookings.intro")}</p>
        {/* Dit AVANT la liste, pas en note de bas de page : c'est la règle qui
            explique pourquoi une date reste prise. */}
        <p className="field-hint">{t("venue.ui.bookings.notConfirmedYet")}</p>

        <VenueScope>
          {(venue) => (
            <GuardedSection title={t("venue.ui.bookings.title")}>
              <BookingRequestsSection venueId={venue.id} show="locked" />
            </GuardedSection>
          )}
        </VenueScope>
      </main>
    </>
  );
}
