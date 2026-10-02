// Rang 30 (D322) — le lien « Calendrier de la salle » de l'assistant vise une route DÉCLARÉE, et le calendrier qu'il
// ouvre est celui de la salle éditée.
//
// ⚠ LE DÉFAUT QU'IL FERME (modes K-a à K-c du point d'entrée du rang 30). Le lien visait `/salles/<id>/calendrier`, route
// supprimée par UIP-A (D130) ; `<Route path="*">` redirigeait vers `/`, sans 404. Le calendrier qui existe est
// `/calendrier`, sur la salle COURANTE du sélecteur de portée — la première, sauf choix : dès deux salles, un lien
// « Calendrier de la salle » qui montrerait celui d'une autre serait un mensonge de libellé.
//
// ⚠ « ROUTE DÉCLARÉE » SE MESURE COMME POUR `LOGIN_PATH` (`routes.test.tsx`, D321) : la table de routes RÉELLE (`AppRoutes`)
// rend le calendrier À CETTE ADRESSE, sans la quitter. Lire le texte du lien ne suffit pas (K-c), et une adresse inconnue
// est quittée — bras négatif, l'ancienne cible.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { VenueProDTO } from "@zwadj/types";
import { AppProviders, AppRoutes } from "../App";
import { initI18n } from "../i18n";
import {
  makeAuthDouble,
  makeBookingsProDouble,
  makeQuotesDouble,
  makeReferentialsDouble,
  makeServicesDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";

initI18n();

const SALLE = (id: string, nomFr: string) =>
  ({
    id,
    slug: `salle-${id}`,
    cityId: "11111111-1111-4111-8111-111111111111",
    nameFr: nomFr,
    nameAr: "قاعة",
    taglineFr: null,
    taglineAr: null,
    descriptionFr: null,
    descriptionAr: null,
    districtFr: null,
    districtAr: null,
    address: null,
    lat: null,
    lng: null,
    capacityMax: 400,
    basePriceCents: 15_000_000,
    bookingMode: "SINGLE_SLOT",
    depositRateBps: 3000,
    depositAmountCents: null,
    status: "ACTIVE",
    publicationStatus: "DRAFT",
    amenityIds: [],
    styleIds: [],
    ceremonyType: null,
    photos: [],
    slotTemplates: [],
    matterportModelId: null
  }) as unknown as VenueProDTO;

/** DEUX salles : la seconde est celle qu'on édite. Avec une seule, « la salle courante » et « la salle éditée » se
 *  confondraient, et K-b ne se mesurerait pas (D209 n° 4 : une fixture à un élément). */
const PREMIERE = SALLE("v1", "Salle Une");
const EDITEE = SALLE("v2", "Salle Deux");

const TITRE = messages.fr.venue.ui.calendar.title;

/** L'adresse où le routeur s'est ARRÊTÉ, lue dans le routeur lui-même (patron de `routes.test.tsx`). */
function Adresse() {
  return <p>{`adresse=${useLocation().pathname}`}</p>;
}

function rendreA(chemin: string) {
  const venues = makeVenueClientDouble(PREMIERE, {
    listMine: vi.fn().mockResolvedValue([PREMIERE, EDITEE]),
    getMine: vi.fn().mockImplementation(async (id: string) => (id === EDITEE.id ? EDITEE : PREMIERE))
  });
  render(
    <MemoryRouter initialEntries={[chemin]}>
      {/* Tous les doubles : le bras négatif atterrit sur le tableau de bord, dont les sections lisent les demandes, les
          prestations et les devis — sans eux, elles plantent et le rouge se lirait sur autre chose qu'une assertion. */}
      <AppProviders
        client={makeAuthDouble()}
        venues={venues}
        referentials={makeReferentialsDouble()}
        bookingsPro={makeBookingsProDouble()}
        servicesClient={makeServicesDouble()}
        quotesClient={makeQuotesDouble()}
      >
        <AppRoutes />
        <Adresse />
      </AppProviders>
    </MemoryRouter>
  );
  return venues;
}

const adresse = () => screen.getByText(/^adresse=/).textContent;

describe("Le lien « Calendrier de la salle » de l'assistant (rang 30, D322, K-a à K-c)", () => {
  it("K-a, K-c : sa cible est une route DÉCLARÉE — la table de routes y rend le calendrier, et l'adresse reste", async () => {
    rendreA(`/salles/${EDITEE.id}?etape=1`);
    const lien = await screen.findByRole("link", { name: TITRE });
    const cible = lien.getAttribute("href");
    fireEvent.click(lien);
    // `waitFor` + assertion NATIVE : sous neutralisation, l'échec se lit en `AssertionError` (D304, D316).
    await waitFor(() => expect(screen.queryByRole("heading", { level: 1 })?.textContent).toBe(TITRE));
    expect(adresse()).toBe(`adresse=${cible}`);
    expect(cible).toBe("/calendrier");
  });

  it("K-b : le calendrier ouvert est celui de la salle ÉDITÉE, pas de la première de la liste", async () => {
    const venues = rendreA(`/salles/${EDITEE.id}?etape=1`);
    fireEvent.click(await screen.findByRole("link", { name: TITRE }));
    await waitFor(() => expect((screen.queryByLabelText(messages.fr.venue.ui.scope.label) as HTMLSelectElement | null)?.value).toBe(EDITEE.id));
    // Et la disponibilité demandée est la sienne : le calendrier a bien reçu la salle éditée.
    await waitFor(() => expect(vi.mocked(venues.availability).mock.calls.some((args) => args[0] === EDITEE.id)).toBe(true));
    expect(vi.mocked(venues.availability).mock.calls.every((args) => args[0] === EDITEE.id)).toBe(true);
  });

  it("calibration, bras négatif : l'ANCIENNE cible `/salles/<id>/calendrier` n'est pas une route — elle est quittée", async () => {
    rendreA(`/salles/${EDITEE.id}/calendrier`);
    await waitFor(() => expect(adresse()).not.toBe(`adresse=/salles/${EDITEE.id}/calendrier`));
    expect(adresse()).toBe("adresse=/");
  });
});
