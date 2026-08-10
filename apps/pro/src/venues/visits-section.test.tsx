// Section « Rendez-vous de visite » du pro (Lot C3b).
//
// Ce qui se joue ici et nulle part ailleurs : le CONTACT est affiché (c'est la
// raison d'être de la liste), l'annulé reste VISIBLE, et l'annulation RECHARGE
// au lieu de deviner le nouvel état.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ProVisitBookingDTO } from "@zwadj/types";
import type { VenueProClient } from "@zwadj/api-client";
import { AVAILABILITY_MAX_WINDOW_DAYS } from "@zwadj/types";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { makeAuthDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { VisitsSection } from "./visits-section";

const AVENIR: ProVisitBookingDTO = {
  id: "b-1",
  date: "2027-08-15",
  startMinutes: 560,
  scheduledAt: "2027-08-15T08:20:00.000Z",
  status: "CONFIRMED",
  clientFirstName: "Amina",
  clientLastName: "Bensalem",
  clientEmail: "amina@example.dz",
  contactPhone: "+213555112233",
  cancelledAt: null,
  createdAt: "2027-01-01T00:00:00.000Z"
};

const ANNULE: ProVisitBookingDTO = {
  ...AVENIR,
  id: "b-2",
  startMinutes: 590,
  status: "CANCELLED",
  clientFirstName: null,
  clientLastName: null,
  contactPhone: null,
  cancelledAt: "2027-02-01T00:00:00.000Z"
};

function renderSection(venues: VenueProClient) {
  return render(
    <MemoryRouter>
      <AppProviders client={makeAuthDouble()} venues={venues}>
        <VisitsSection venueId="v1" />
      </AppProviders>
    </MemoryRouter>
  );
}

// Sans cet appel, `t()` rend la CLÉ : i18next n'est initialisé que par
// `main.tsx`, que les tests ne montent pas.
initI18n();

describe("VisitsSection — C3b", () => {
  it("⚠ la fenêtre demandée tient dans le maximum du schéma — bornes INCLUSES (D55)", async () => {
    // ⚠ LE BUG QUE CE TEST FIGE. La section demandait `to = aujourd'hui + 92
    // jours`, alors que `availabilityWindowQuerySchema` compte
    // `(to - from) / 86400000 + 1 > 92` : la fenêtre valait donc 93 jours et
    // l'API répondait `venue.validation.windowTooWide`. À l'écran, « Une erreur
    // est survenue » à chaque chargement des rendez-vous de visite.
    //
    // Le test recalcule la largeur avec la FORMULE DU SERVEUR, pas avec la
    // constante du front : si quelqu'un remet « +92 », il rougit.
    const listVisitBookings = vi.fn().mockResolvedValue([]);
    renderSection(makeVenueClientDouble(null, { listVisitBookings }));

    await waitFor(() => expect(listVisitBookings).toHaveBeenCalled());
    const fenetre = listVisitBookings.mock.calls[0]?.[1] as { from: string; to: string };
    const largeur =
      (Date.parse(`${fenetre.to}T00:00:00Z`) - Date.parse(`${fenetre.from}T00:00:00Z`)) / 86_400_000 + 1;
    expect(largeur).toBeLessThanOrEqual(AVAILABILITY_MAX_WINDOW_DAYS);
    // Et elle reste UTILE : on ne l'a pas rétrécie pour passer, on l'a corrigée.
    expect(largeur).toBe(AVAILABILITY_MAX_WINDOW_DAYS);
  });

  it("affiche le CONTACT du client : c'est ce pour quoi le pro ouvre cette liste", async () => {
    renderSection(makeVenueClientDouble(null, { listVisitBookings: vi.fn().mockResolvedValue([AVENIR]) }));

    expect(await screen.findByText("Amina Bensalem")).toBeInTheDocument();
    expect(screen.getByText("+213555112233")).toBeInTheDocument();
  });

  it("sans téléphone (D61 le rend facultatif) : l'e-mail prend le relais, jamais « null »", async () => {
    renderSection(makeVenueClientDouble(null, { listVisitBookings: vi.fn().mockResolvedValue([ANNULE]) }));

    expect(await screen.findAllByText("amina@example.dz")).toHaveLength(2);
    expect(screen.queryByText(/null|undefined/)).toBeNull();
  });

  it("un rendez-vous ANNULÉ reste affiché et n'offre pas de bouton — disparaître ressemblerait à un bug", async () => {
    renderSection(makeVenueClientDouble(null, { listVisitBookings: vi.fn().mockResolvedValue([ANNULE]) }));

    expect(await screen.findByText("Annulé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull();
  });

  it("annuler appelle l'API puis RECHARGE : deviner l'état finit toujours par diverger de l'API", async () => {
    const listVisitBookings = vi
      .fn()
      .mockResolvedValueOnce([AVENIR])
      .mockResolvedValueOnce([{ ...AVENIR, status: "CANCELLED", cancelledAt: "2027-02-02T00:00:00.000Z" }]);
    const cancelVisitBooking = vi.fn().mockResolvedValue(undefined);
    renderSection(makeVenueClientDouble(null, { listVisitBookings, cancelVisitBooking }));

    fireEvent.click(await screen.findByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(cancelVisitBooking).toHaveBeenCalledWith("v1", "b-1"));
    expect(await screen.findByText("Annulé")).toBeInTheDocument();
    expect(listVisitBookings).toHaveBeenCalledTimes(2);
  });

  it("liste vide : un message, pas une section muette", async () => {
    renderSection(makeVenueClientDouble(null, { listVisitBookings: vi.fn().mockResolvedValue([]) }));
    expect(await screen.findByText("Aucun rendez-vous dans les trois prochains mois.")).toBeInTheDocument();
  });
});
