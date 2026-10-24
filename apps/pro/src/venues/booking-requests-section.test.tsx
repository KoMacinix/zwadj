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

// ══ L36-1 (D337) — une réservation PAR E-MAIL SEUL, vue par le pro ═══════════════════════════════════════════════════
// ML-5 et ML-18 (`docs/preuves/D337/modes-de-defaillance.md`). Le pro rappelle : à défaut de numéro, c'est l'e-mail qu'il lit, de gauche à droite même dans une page arabe.
describe("⛔ Demandes pro — le contact d'une réservation sans numéro (L36-1)", () => {
  const SANS_NUMERO: ProBookingDTO = { ...base, contactPhone: null, contactEmail: "amina@example.dz" };

  it("ML-5 — sans numéro, l'E-MAIL est affiché à la place — jamais le mot « null », jamais un trou", async () => {
    setup([SANS_NUMERO]);
    const mail = await screen.findByText("amina@example.dz");
    expect(mail).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/\bnull\b|undefined/);
  });

  it("ML-18 — le contact s'écrit de gauche à droite (`dir=\"ltr\"`) : un e-mail dans une page arabe ne se retourne pas", async () => {
    setup([SANS_NUMERO]);
    const mail = await screen.findByText("amina@example.dz");
    expect(mail.getAttribute("dir")).toBe("ltr");
  });

  it("avec les deux, le NUMÉRO est affiché (le pro rappelle d'abord) et l'e-mail n'est pas répété", async () => {
    setup([base]);
    expect(await screen.findByText("+213550000001")).toBeInTheDocument();
    expect(screen.queryByText("amina@example.dz")).toBeNull();
  });

  it("aucun des deux (impossible en base, mais l'écran ne s'écroule pas) : la ligne se rend, sans contact", async () => {
    setup([{ ...base, contactPhone: null, contactEmail: null }]);
    expect(await screen.findByText("Amina Bensalem")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/\bnull\b|undefined/);
  });
});
