// Catalogue de prestations côté PRO — Lot E2c.
//
// Ce qui se prouve ici : que le corps envoyé DÉPEND du type (l'union est
// discriminée, un champ étranger fait échouer la requête), et que
// l'avertissement PER_GUEST est bien à l'écran — c'est lui qui évite l'erreur la
// plus chère de la page.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ServicesClient } from "@zwadj/api-client";
import type { ServiceDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeServicesDouble } from "../test-support/client-doubles";
import { ServicesSection } from "./services-section";

initI18n();

const FIXED: ServiceDTO = {
  id: "s1",
  venueId: "v1",
  nameFr: "Décoration florale",
  nameAr: "زينة",
  descriptionFr: null,
  descriptionAr: null,
  pricingType: "FIXED",
  isActive: true,
  sortOrder: 0,
  fixedPriceCents: 5_000_000,
  perGuestPriceCents: null,
  perUnitPriceCents: null,
  unitNameFr: null,
  unitNameAr: null,
  minUnits: null,
  maxUnits: null,
  tiers: []
};

function setup(rows: ServiceDTO[], overrides: Partial<ServicesClient> = {}) {
  const client = makeServicesDouble({ listForVenue: vi.fn().mockResolvedValue(rows), ...overrides });
  render(
    <MemoryRouter>
      <AppProviders client={makeAuthDouble()} servicesClient={client}>
        <ServicesSection venueId="v1" />
      </AppProviders>
    </MemoryRouter>
  );
  return client;
}

const type = (label: RegExp | string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe("Catalogue pro — l'avertissement qui évite l'erreur la plus chère", () => {
  it("PER_GUEST affiche que le montant sera MULTIPLIÉ par les invités", async () => {
    setup([]);
    await screen.findByText(/Aucune prestation/);
    fireEvent.change(screen.getByLabelText(/Tarification/), { target: { value: "PER_GUEST" } });
    expect(screen.getByText(/MULTIPLIÉ par le nombre d'invités/)).toBeInTheDocument();
  });

  it("l'avertissement n'apparaît PAS sur un forfait", async () => {
    setup([]);
    await screen.findByText(/Aucune prestation/);
    expect(screen.queryByText(/MULTIPLIÉ/)).toBeNull();
  });
});

describe("Catalogue pro — le corps dépend du TYPE", () => {
  it("FIXED n'envoie que `fixedPriceCents`", async () => {
    const client = setup([]);
    await screen.findByText(/Aucune prestation/);
    type(/Nom \(français\)/, "Déco");
    type(/Nom \(arabe\)/, "زينة");
    type(/^Prix/, "50000");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter la prestation" }));
    await waitFor(() =>
      expect(client.create).toHaveBeenCalledWith("v1", {
        pricingType: "FIXED",
        nameFr: "Déco",
        nameAr: "زينة",
        fixedPriceCents: 5_000_000
      })
    );
  });

  it("PER_UNIT exige l'unité dans les DEUX langues avant d'être envoyable", async () => {
    setup([]);
    await screen.findByText(/Aucune prestation/);
    fireEvent.change(screen.getByLabelText(/Tarification/), { target: { value: "PER_UNIT" } });
    type(/Nom \(français\)/, "Tables");
    type(/Nom \(arabe\)/, "طاولات");
    type(/^Prix/, "3000");
    // Sans unité, le bouton reste inerte : la base l'exige, l'écran le dit avant.
    expect(screen.getByRole("button", { name: "Ajouter la prestation" })).toBeDisabled();
    type(/Unité \(français\)/, "table");
    type(/Unité \(arabe\)/, "طاولة");
    expect(screen.getByRole("button", { name: "Ajouter la prestation" })).toBeEnabled();
  });

  it("TIERED envoie un premier palier : un TIERED sans palier est inchoisissable", async () => {
    const client = setup([]);
    await screen.findByText(/Aucune prestation/);
    fireEvent.change(screen.getByLabelText(/Tarification/), { target: { value: "TIERED" } });
    type(/Nom \(français\)/, "Menu");
    type(/Nom \(arabe\)/, "قائمة");
    type(/^Prix/, "80000");
    type(/Première formule \(français\)/, "Standard");
    type(/Première formule \(arabe\)/, "عادي");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter la prestation" }));
    await waitFor(() =>
      expect(client.create).toHaveBeenCalledWith("v1", {
        pricingType: "TIERED",
        nameFr: "Menu",
        nameAr: "قائمة",
        tiers: [{ labelFr: "Standard", labelAr: "عادي", priceCents: 8_000_000 }]
      })
    );
  });
});

describe("Catalogue pro — retirer n'est pas supprimer", () => {
  it("le retrait de la vente est proposé en PREMIER, et il est réversible", async () => {
    const client = setup([FIXED]);
    fireEvent.click(await screen.findByRole("button", { name: "Retirer de la vente" }));
    await waitFor(() => expect(client.update).toHaveBeenCalledWith("s1", { isActive: false }));
  });

  it("une prestation retirée propose de la REMETTRE en vente", async () => {
    setup([{ ...FIXED, isActive: false }]);
    expect(await screen.findByRole("button", { name: "Remettre en vente" })).toBeInTheDocument();
    expect(screen.getByText(/Retirée de la vente/)).toBeInTheDocument();
  });

  it("un refus de suppression s'affiche au lieu de disparaître", async () => {
    setup([FIXED], {
      remove: vi.fn().mockRejectedValue({ code: "SERVICE_IN_USE", message: "service.errors.inUse" })
    });
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
