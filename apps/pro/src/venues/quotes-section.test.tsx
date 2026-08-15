// Devis — écran PRO, Lot E2e.
//
// Ce qui se prouve ici, et qui n'est pas cosmétique :
//   - que l'écran n'affiche AUCUN montant qu'il aurait calculé lui-même : tous
//     viennent du `QuoteDTO` rendu par le serveur ;
//   - que le bouton dit « Créer la demande » et non « Accepter » (D101) ;
//   - que « remplacé » et « refusé » ne se lisent pas pareil ;
//   - qu'un devis converti l'annonce, au lieu de laisser le pro recliquer.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { QuotesClient } from "@zwadj/api-client";
import type { QuoteDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeQuotesDouble, makeServicesDouble, makeVenueClientDouble } from "../test-support/client-doubles";

import { QuotesSection } from "./quotes-section";

initI18n();

const BASE: QuoteDTO = {
  id: "q1",
  venueId: "v1",
  clientId: null,
  status: "SENT",
  isExpired: false,
  version: 1,
  chainId: "q1",
  parentQuoteId: null,
  eventDate: "2027-09-18",
  slotTemplateId: "s1",
  guests: 250,
  basePriceCents: 20_000_000,
  servicesTotalCents: 5_000_000,
  totalCents: 25_000_000,
  depositCents: 7_500_000,
  lines: [],
  validUntil: null,
  sentAt: "2026-08-02T10:00:00.000Z",
  acceptedAt: null,
  createdAt: "2026-08-02T09:00:00.000Z",
  bookingId: null,
  // C1b — le canal de remise. NULL : aucun code ne l'écrit encore.
  sentVia: null
};

function setup(rows: QuoteDTO[], overrides: Partial<QuotesClient> = {}) {
  const client = makeQuotesDouble({ listForVenue: vi.fn().mockResolvedValue(rows), ...overrides });
  render(
    <MemoryRouter>
      <AppProviders
        client={makeAuthDouble()}
        venues={makeVenueClientDouble()}
        servicesClient={makeServicesDouble()}
        quotesClient={client}
      >
        <QuotesSection venueId="v1" />
      </AppProviders>
    </MemoryRouter>
  );
  return client;
}

describe("Devis pro — les montants viennent du SERVEUR", () => {
  it("affiche le total et l'acompte tels que l'API les rend", async () => {
    setup([BASE]);
    // 25 000 000 centimes = 250 000 DA ; acompte 7 500 000 = 75 000 DA.
    expect(await screen.findByText((text) => /250.?000/.test(text))).toBeInTheDocument();
    expect(screen.getByText((text) => /acompte/.test(text) && /75.?000/.test(text))).toBeInTheDocument();
  });

  it("le formulaire de création n'affiche AUCUN total : rien n'est calculé ici", async () => {
    setup([]);
    await screen.findByText(/Aucun devis/);
    expect(screen.getByText(/calculé par le serveur/)).toBeInTheDocument();
  });
});

describe("Devis pro — D101 : accepter n'est pas une action", () => {
  it("le bouton dit « Créer la demande », jamais « Accepter »", async () => {
    setup([BASE]);
    expect(await screen.findByRole("button", { name: /Créer la demande de réservation/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Accepter/ })).toBeNull();
  });

  it("un devis DÉJÀ converti l'annonce au lieu de proposer de recliquer", async () => {
    setup([{ ...BASE, bookingId: "b1" }]);
    expect(await screen.findByText(/attend votre acceptation de la date/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Créer la demande de réservation/ })).toBeNull();
  });

  it("la conversion exige nom, prénom et TÉLÉPHONE — plus l'e-mail (D135)", async () => {
    const client = setup([BASE]);
    fireEvent.click(await screen.findByRole("button", { name: /Créer la demande de réservation/ }));
    expect(screen.getByRole("button", { name: "Créer la demande" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Prénom du client"), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText("Nom du client"), { target: { value: "Bensalem" } });
    fireEvent.change(screen.getByLabelText("Téléphone du client"), { target: { value: "+213550000001" } });

    // ⚠ Trois champs, et le bouton s'ACTIVE : l'e-mail reste vide. Ce test
    // mesurait l'inverse jusqu'à D135, parce que la borne Zod était plus stricte
    // que `bookings.contact_email`, qui est nullable depuis toujours.
    fireEvent.click(screen.getByRole("button", { name: "Créer la demande" }));
    await waitFor(() => expect(client.convert).toHaveBeenCalled());

    // ⚠ Et la CLÉ EST ABSENTE, jamais `""` : `.email()` refuse la chaîne vide.
    const corps = vi.mocked(client.convert).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(corps).not.toHaveProperty("contactEmail");
    expect(corps.contactPhone).toBe("+213550000001");
  });
});

describe("Devis pro — remplacé n'est pas refusé", () => {
  it("l'historique d'une chaîne reste lisible, avec le motif d'inactivité", async () => {
    setup([
      { ...BASE, id: "v1", version: 1, status: "SUPERSEDED" },
      { ...BASE, id: "v2", version: 2, chainId: "q1", parentQuoteId: "v1", status: "SENT" }
    ]);
    fireEvent.click(await screen.findByText(/version\(s\) précédente\(s\)/));
    expect(screen.getByText(/Remplacé par une version plus récente/)).toBeInTheDocument();
  });

  it("un DRAFT propose l'envoi, pas la conversion", async () => {
    setup([{ ...BASE, status: "DRAFT", sentAt: null }]);
    expect(await screen.findByRole("button", { name: "Envoyer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Créer la demande de réservation/ })).toBeNull();
  });

  it("un devis EXPIRÉ ne propose plus la conversion", async () => {
    setup([{ ...BASE, isExpired: true }]);
    expect(await screen.findByText("Expiré")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Créer la demande de réservation/ })).toBeNull();
  });
});

describe("Devis pro — le taux de transformation", () => {
  it("affiche les quatre compteurs de chaînes", async () => {
    setup([], { conversion: vi.fn().mockResolvedValue({ sent: 7, accepted: 3, declined: 2, expired: 1 }) });
    expect(await screen.findByText(/7 envoyés · 3 aboutis · 2 refusés · 1 expirés/)).toBeInTheDocument();
  });
});
