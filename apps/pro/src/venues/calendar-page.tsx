// Calendrier — Lot UIP-A.
//
// L'entrée « Calendrier » du top panel. Le calendrier lui-même est inchangé
// (Lot B6, D56/D57) : il a seulement cessé d'être une page pour devenir un
// composant, et il reçoit désormais sa salle du sélecteur de portée au lieu de
// la lire dans l'URL.
//
// ⚠ La route `/salles/:id/calendrier` DISPARAÎT avec ce lot. Elle était le seul
// endroit d'où l'on atteignait ce calendrier, et elle n'apparaissait dans aucun
// top panel : le pro devait ouvrir sa salle pour y arriver.
import { useTranslation } from "react-i18next";
import { ProHeader } from "../shell/pro-header";
import { VenueScope } from "../shell/venue-scope";
import { GuardedSection } from "./guarded-section";
import { VenueCalendar } from "./venue-calendar";

export function CalendarPage() {
  const { t } = useTranslation();

  return (
    <>
      <ProHeader />
      <main className="page">
        <div className="page-head">
          <h1>{t("venue.ui.calendar.title")}</h1>
        </div>

        <VenueScope>
          {(venue) => (
            <GuardedSection title={t("venue.ui.calendar.title")}>
              <VenueCalendar venueId={venue.id} />
            </GuardedSection>
          )}
        </VenueScope>
      </main>
    </>
  );
}
