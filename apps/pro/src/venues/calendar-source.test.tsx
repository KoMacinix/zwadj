// Source du calendrier pro — correction du 404 sur salle non publiée.
//
// ⚠ POURQUOI CE FICHIER EXISTE. Le calendrier consommait l'endpoint PUBLIC, qui
// exige `publicationStatus = PUBLISHED`. Le motif d'origine était juste — ne pas
// dupliquer le moteur — mais personne n'avait vérifié la conséquence sur une
// salle réelle : un pro dont la salle est en brouillon recevait un 404 sur SON
// PROPRE calendrier, et depuis la refonte l'écran « Nouvelle réservation »
// mourait avec.
//
// Ces tests figent la ROUTE empruntée, pas l'apparence : c'est le seul endroit où
// la régression pourrait revenir sans qu'aucun autre test ne bouge.
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { VenueCalendar } from "./venue-calendar";

initI18n();

function renderCal(availability = vi.fn().mockResolvedValue(vide())) {
  const venues = makeVenueClientDouble(null, { availability });
  render(
    <AppProviders client={makeAuthDouble()} venues={venues}>
      <VenueCalendar venueId="v1" />
    </AppProviders>
  );
  return { venues, availability };
}

function vide() {
  return {
    venueId: "v1",
    slug: "salle",
    bookingMode: "SINGLE_SLOT",
    from: "2026-08-01",
    to: "2026-08-31",
    slots: [],
    days: []
  };
}

describe("Calendrier pro — la route empruntée", () => {
  it("⚠ interroge la route PRO par ID, jamais la route publique par slug", async () => {
    const { availability, venues } = renderCal();

    await waitFor(() => expect(availability).toHaveBeenCalled());
    // L'écart mesuré : l'id de la salle, pas son slug. Le slug n'est plus lu du
    // tout — c'était un aller-retour de plus pour une clé publique dont le pro
    // n'a pas besoin.
    expect(availability.mock.calls[0]?.[0]).toBe("v1");
    expect(vi.mocked(venues.getMine)).not.toHaveBeenCalled();
  });

  it("la fenêtre demandée tient dans le maximum du schéma, bornes incluses", async () => {
    const { availability } = renderCal();
    await waitFor(() => expect(availability).toHaveBeenCalled());

    const fenetre = availability.mock.calls[0]?.[1] as { from: string; to: string };
    const jours = (Date.parse(`${fenetre.to}T00:00:00Z`) - Date.parse(`${fenetre.from}T00:00:00Z`)) / 86_400_000 + 1;
    // ⚠ Le « +1 » est la règle du serveur, pas une préférence : c'est la même
    // formule que `availabilityWindowQuerySchema`. Un mois entier tient largement.
    expect(jours).toBeLessThanOrEqual(92);
  });

  it("un échec de la route se dit, il ne se devine pas", async () => {
    renderCal(vi.fn().mockRejectedValue(new Error("404")));
    expect(await screen.findByText(/Le calendrier n'a pas pu être chargé/)).toBeInTheDocument();
  });
});
