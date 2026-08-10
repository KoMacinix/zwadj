// Partition Demandes / Réservations — Lot UIP-A.
//
// ⚠ POURQUOI CE FICHIER EXISTE.
// Une même section sert deux entrées du top panel. Si la partition fuit, la même
// réservation apparaît aux deux endroits — donc s'annule depuis deux endroits.
// Deux chemins pour un geste destructeur, c'est un de trop.
//
// La partition est mesurée par ÉCART : chaque cas fournit les DEUX familles de
// statuts en même temps et exige que l'une soit là et l'autre absente. Un test
// qui ne fournirait que la famille attendue serait vert même sans filtre.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProBookingDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeBookingsProDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { BookingRequestsSection, type RequestScope } from "./booking-requests-section";

initI18n();

function row(id: string, status: string, lastName: string): ProBookingDTO {
  return {
    id,
    status,
    eventDate: "2026-09-12",
    slotNameFr: null,
    slotNameAr: null,
    guests: 200,
    totalCents: 100_000_00,
    depositCents: 30_000_00,
    clientMessage: null,
    contactFirstName: "Client",
    contactLastName: lastName,
    contactPhone: "+213550000003",
    contactEmail: null,
    conflictIds: []
  } as unknown as ProBookingDTO;
}

/** Les quatre familles en une seule réponse : en attente, verrouillée, refusée. */
const ALL = [
  row("1", "PENDING", "EnAttente"),
  row("2", "ACCEPTED", "Verrouillee"),
  row("3", "CONFIRMED", "Payee"),
  row("4", "DECLINED", "Refusee")
];

function renderScope(show: RequestScope) {
  const listForVenue = vi.fn().mockResolvedValue(ALL);
  render(
    <AppProviders
      client={makeAuthDouble()}
      venues={makeVenueClientDouble()}
      bookingsPro={makeBookingsProDouble({ listForVenue })}
    >
      <BookingRequestsSection venueId="v1" show={show} />
    </AppProviders>
  );
  return listForVenue;
}

describe("Partition Demandes / Réservations (UIP-A)", () => {
  it("« Demandes » montre tout SAUF les dates verrouillées", async () => {
    renderScope("open");

    expect(await screen.findByText(/EnAttente/)).toBeInTheDocument();
    expect(screen.getByText(/Refusee/)).toBeInTheDocument();
    // L'écart : les deux statuts verrouillants sont ABSENTS de cet écran.
    expect(screen.queryByText(/Verrouillee/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Payee/)).not.toBeInTheDocument();
  });

  it("« Réservations » montre ACCEPTED **et** CONFIRMED — le même ensemble que l'EXCLUDE en base", async () => {
    renderScope("locked");

    expect(await screen.findByText(/Verrouillee/)).toBeInTheDocument();
    expect(screen.getByText(/Payee/)).toBeInTheDocument();
    // ⚠ Si cet écran ne gardait que CONFIRMED, il serait VIDE en permanence :
    // aucune route du dépôt ne mène à ce statut avant le lot Paiement (D80).
    expect(screen.queryByText(/EnAttente/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Refusee/)).not.toBeInTheDocument();
  });

  it("la partition est ÉTANCHE : aucune ligne n'apparaît des deux côtés, aucune ne disparaît", async () => {
    renderScope("open");
    const ouvertes = (await screen.findAllByText(/^Client /)).map((n) => n.textContent);
    expect(ouvertes).toEqual(["Client EnAttente", "Client Refusee"]);
  });

  it("le défaut historique reste « tout » — les tests d'E1b mesurent ce rendu-là", async () => {
    renderScope("all");
    expect(await screen.findAllByText(/^Client /)).toHaveLength(4);
  });

  it("le filtre porte sur l'AFFICHAGE, jamais sur la requête — UIP-A ne bouge aucun contrat d'API", async () => {
    const listForVenue = renderScope("locked");
    await screen.findByText(/Verrouillee/);
    // Un seul argument : l'id de la salle. Aucun paramètre de statut inventé.
    expect(listForVenue).toHaveBeenCalledWith("v1");
  });
});
