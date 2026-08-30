// Section « Demandes de réservation » côté PRO — Lot E1b.
//
// Ce qui se prouve ici, et qui n'est pas cosmétique : le CONFLIT est annoncé
// AVANT le clic, et une date verrouillée dit qu'elle le restera. Ce sont les
// deux phrases sans lesquelles le pro apprend trop tard ce qu'il a fait.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { BookingsProClient } from "@zwadj/api-client";
import type { ProBookingDTO } from "@zwadj/types";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { makeAuthDouble, makeVenueClientDouble, makeBookingsProDouble } from "../test-support/client-doubles";
import { BookingRequestsSection } from "./booking-requests-section";

const base: ProBookingDTO = {
  id: "b1",
  venueId: "v1",
  venueSlug: "salle-el-ryad",
  venueNameFr: "Salle El Ryad",
  venueNameAr: "قاعة الرياض",
  status: "PENDING",
  paymentMethod: "CASH",
  eventDate: "2027-08-15",
  startsAt: "2027-08-15T19:00:00.000Z",
  endsAt: "2027-08-16T01:00:00.000Z",
  slotNameFr: "Soirée",
  slotNameAr: "سهرة",
  guests: 250,
  basePriceCents: 20_000_000,
  servicesTotalCents: 0,
  totalCents: 20_000_000,
  depositCents: 6_000_000,
  services: [],
  clientMessage: null,
  declineReason: null,
  cancellationReason: null,
  expiresAt: null,
  paymentDueAt: null,
  createdAt: "2026-08-02T10:00:00.000Z",
  contactFirstName: "Amina",
  contactLastName: "Bensalem",
  contactPhone: "+213550000001",
  contactEmail: "amina@example.dz",
  conflictIds: []
};

// Sans cet appel, `t()` rend la CLÉ : i18next n'est initialisé que par
// `main.tsx`, que les tests ne montent pas.
initI18n();

function setup(rows: ProBookingDTO[], overrides: Partial<BookingsProClient> = {}) {
  const client = makeBookingsProDouble({
    listForVenue: vi.fn().mockResolvedValue(rows),
    accept: vi.fn().mockResolvedValue(rows[0]),
    ...overrides
  });
  render(
    <MemoryRouter>
      <AppProviders client={makeAuthDouble()} venues={makeVenueClientDouble()} bookingsPro={client}>
        <BookingRequestsSection venueId="v1" />
      </AppProviders>
    </MemoryRouter>
  );
  return client;
}

describe("Demandes pro — ce que l'écran doit rendre évident", () => {
  it("le CONFLIT est annoncé AVANT le clic, pas découvert après", async () => {
    setup([{ ...base, conflictIds: ["b2", "b3"] }]);
    expect(await screen.findByText(/2 autre\(s\) demande\(s\)/)).toBeInTheDocument();
  });

  it("aucun badge de conflit quand il n'y en a pas — le silence est une information", async () => {
    setup([base]);
    await screen.findByText(/Amina/);
    expect(screen.queryByText(/autre\(s\) demande\(s\)/)).toBeNull();
  });

  it("une demande ACCEPTÉE dit que la date restera prise jusqu'à annulation (D80)", async () => {
    setup([{ ...base, status: "ACCEPTED" }]);
    expect(await screen.findByText(/bloquée pour cette réservation/)).toBeInTheDocument();
    // Et aucun bouton « Accepter » : la transition n'existe plus.
    expect(screen.queryByRole("button", { name: "Accepter" })).toBeNull();
  });

  it("le CONTACT est affiché — c'est la raison d'être de la liste", async () => {
    setup([base]);
    expect(await screen.findByText("+213550000001")).toBeInTheDocument();
  });

  it("accepter RECHARGE la liste : accepter l'une peut rendre les autres impossibles", async () => {
    const client = setup([base]);
    fireEvent.click(await screen.findByRole("button", { name: "Accepter" }));
    await waitFor(() => expect(client.accept).toHaveBeenCalledWith("b1"));
    // Deux appels : le chargement initial, puis le rechargement après l'action.
    await waitFor(() => expect(client.listForVenue).toHaveBeenCalledTimes(2));
  });

  it("un 409 recharge AUSSI : l'échec signifie précisément que l'affichage est périmé", async () => {
    const client = setup([base], {
      accept: vi.fn().mockRejectedValue({ code: "BOOKING_SLOT_TAKEN", message: "booking.errors.slotTaken" })
    });
    fireEvent.click(await screen.findByRole("button", { name: "Accepter" }));
    await waitFor(() => expect(client.listForVenue).toHaveBeenCalledTimes(2));
  });

  it("liste vide : dit explicitement, jamais une section muette", async () => {
    setup([]);
    expect(await screen.findByText(/Aucune demande/)).toBeInTheDocument();
  });
});
