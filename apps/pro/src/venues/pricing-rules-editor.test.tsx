// Tests des VARIANTES DE PRIX d'un créneau (Lot B4c). Les pièges :
//  - une saison PEUT enjamber décembre (nov → fév). Valider `start <= end`
//    interdirait la saison d'hiver — même faute que B1 sur `endMinutes` et que
//    D52 sur l'heure de fin, une troisième fois. L'écran doit l'ACCEPTER et
//    montrer les mois couverts ;
//  - le TYPE n'est pas modifiable (B2) : le formulaire d'édition ne l'offre
//    pas, et ne l'envoie pas dans le PATCH ;
//  - l'ordre affiché est l'ordre de RÉSOLUTION (férié > jour > saison, puis
//    priorité décroissante) : la liste se lit comme le moteur décide ;
//  - les prix sont ABSOLUS : jamais de pourcentage à l'écran.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import type { VenueProClient } from "@zwadj/api-client";
import type { PricingRuleDTO, SlotTemplateDTO, VenueProDTO } from "@zwadj/types";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { EditVenuePage } from "./edit-venue-page";

initI18n();

const rule = (over: Partial<PricingRuleDTO> = {}): PricingRuleDTO => ({
  id: "r1",
  slotTemplateId: "s1",
  ruleType: "SEASON",
  label: "Haute saison",
  priceCents: 30_000_000,
  startMonth: 6,
  endMonth: 9,
  daysOfWeek: [],
  priority: 0,
  isActive: true,
  createdAt: "2026-01-05T10:00:00.000Z",
  ...over
});

const slotWith = (rules: PricingRuleDTO[]): SlotTemplateDTO => ({
  id: "s1",
  nameFr: "Soirée",
  nameAr: "سهرة",
  startMinutes: 1200,
  endMinutes: 1560,
  basePriceCents: 20_000_000,
  isActive: true,
  createdAt: "2026-01-05T10:00:00.000Z",
  pricingRules: rules
});

function venueWith(slotTemplates: SlotTemplateDTO[]): VenueProDTO {
  return {
    id: "v1",
    slug: "salle-el-ryad",
    cityId: "11111111-1111-4111-8111-111111111111",
    nameFr: "Salle El Ryad",
    nameAr: "قاعة الرياض",
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
    bookingMode: "MULTI_SLOT",
  depositRateBps: 3000,
  depositAmountCents: null,
    publicationStatus: "DRAFT",
    status: "ACTIVE",
    amenityIds: [],
    styleIds: [],
    ceremonyType: null,
    photos: [],
    slotTemplates,
    matterportModelId: null,
    createdAt: "2026-01-05T10:00:00.000Z",
    updatedAt: "2026-01-06T10:00:00.000Z"
  };
}

function makeVenues(slots: SlotTemplateDTO[], overrides: Partial<VenueProClient> = {}): VenueProClient {
  return makeVenueClientDouble(venueWith(slots), overrides);
}

function renderEdit(venues: VenueProClient) {
  return render(
    <MemoryRouter initialEntries={["/salles/v1"]}>
      <AppProviders client={makeAuthDouble()} venues={venues} referentials={makeReferentialsDouble()}>
        <Routes>
          <Route path="/salles/:id" element={<EditVenuePage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
}

const section = () => screen.getByRole("region", { name: "Créneaux et prix" });

/** Scopé à la RÉGION des variantes : la ligne du créneau porte elle aussi des
 *  boutons « Modifier » et une liste, d'où l'ambiguïté sans ce cadrage. */
async function openRules() {
  await screen.findByDisplayValue("Salle El Ryad");
  fireEvent.click(within(section()).getByRole("button", { name: "Variantes de prix" }));
  return within(await screen.findByRole("region", { name: "Variantes de prix" }));
}

describe("Variantes de prix — lecture", () => {
  it("l'ordre affiché est celui de la RÉSOLUTION : férié, puis jour, puis saison", async () => {
    renderEdit(
      makeVenues([
        slotWith([
          rule({ id: "r-season", ruleType: "SEASON", label: "Été" }),
          rule({ id: "r-holiday", ruleType: "HOLIDAY", label: "Férié", startMonth: null, endMonth: null }),
          rule({ id: "r-weekday", ruleType: "WEEKDAY", label: "Week-end", startMonth: null, endMonth: null, daysOfWeek: [5, 6] })
        ])
      ])
    );
    const rules = await openRules();
    const labels = within(rules.getByRole("list", { name: "Variantes de prix" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "");
    expect(labels[0]).toContain("Férié");
    expect(labels[1]).toContain("Week-end");
    expect(labels[2]).toContain("Été");
  });

  it("l'écran annonce qu'UNE SEULE variante s'applique — sinon le pro croit à un cumul", async () => {
    renderEdit(makeVenues([slotWith([rule()])]));
    const rules = await openRules();
    expect(rules.getByText(/Une seule variante s'applique/)).toBeTruthy();
  });

  it("les prix sont ABSOLUS : aucun pourcentage à l'écran", async () => {
    renderEdit(makeVenues([slotWith([rule()])]));
    const rules = await openRules();
    const list = rules.getByRole("list", { name: "Variantes de prix" });
    // D40 — le groupement utilise l'espace INSÉCABLE U+00A0, pas une espace
    // ordinaire : l'assertion doit porter le même caractère que l'écran.
    expect(list.textContent).toContain("300\u00a0000");
    expect(list.textContent).not.toContain("%");
  });

  it("sans variante, l'écran dit que le prix de base s'applique", async () => {
    renderEdit(makeVenues([slotWith([])]));
    const rules = await openRules();
    expect(rules.getByText(/facturé à son prix de base/)).toBeTruthy();
  });
});

describe("Variantes de prix — la saison peut enjamber décembre", () => {
  it("novembre → février est ACCEPTÉ et part tel quel, sans inversion", async () => {
    const createPricingRule = vi.fn().mockResolvedValue(rule({ startMonth: 11, endMonth: 2 }));
    renderEdit(makeVenues([slotWith([])], { createPricingRule }));
    const rules = await openRules();

    fireEvent.click(rules.getByRole("button", { name: "Ajouter une variante" }));
    fireEvent.change(rules.getByLabelText("De"), { target: { value: "11" } });
    fireEvent.change(rules.getByLabelText("À"), { target: { value: "2" } });
    fireEvent.change(rules.getByLabelText("Prix appliqué"), { target: { value: "300000" } });
    fireEvent.click(rules.getByRole("button", { name: "Créer la variante" }));

    await waitFor(() => expect(createPricingRule).toHaveBeenCalled());
    expect(createPricingRule).toHaveBeenCalledWith(
      "v1",
      "s1",
      expect.objectContaining({ ruleType: "SEASON", startMonth: 11, endMonth: 2, priceCents: 30_000_000 })
    );
  });

  it("les mois COUVERTS sont affichés, y compris en enjambant l'année", async () => {
    renderEdit(makeVenues([slotWith([])]));
    const rules = await openRules();
    fireEvent.click(rules.getByRole("button", { name: "Ajouter une variante" }));
    fireEvent.change(rules.getByLabelText("De"), { target: { value: "11" } });
    fireEvent.change(rules.getByLabelText("À"), { target: { value: "2" } });

    const summary = rules.getByRole("status").textContent ?? "";
    expect(summary).toContain("novembre");
    expect(summary).toContain("décembre");
    expect(summary).toContain("janvier");
    expect(summary).toContain("février");
    expect(summary).not.toContain("juin");
  });
});

describe("Variantes de prix — le type n'est pas modifiable (B2)", () => {
  it("le formulaire d'édition n'offre pas le type et l'explique", async () => {
    renderEdit(makeVenues([slotWith([rule()])]));
    const rules = await openRules();
    fireEvent.click(rules.getByRole("button", { name: "Modifier" }));

    expect(rules.queryByLabelText("S'applique à")).toBeNull();
    expect(rules.getByText(/ne se modifie pas/)).toBeTruthy();
  });

  it("le PATCH ne contient JAMAIS ruleType", async () => {
    const updatePricingRule = vi.fn().mockResolvedValue(rule({ priceCents: 31_000_000 }));
    renderEdit(makeVenues([slotWith([rule()])], { updatePricingRule }));
    const rules = await openRules();

    fireEvent.click(rules.getByRole("button", { name: "Modifier" }));
    fireEvent.change(rules.getByLabelText("Prix appliqué"), { target: { value: "310000" } });
    fireEvent.click(rules.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(updatePricingRule).toHaveBeenCalled());
    expect(updatePricingRule.mock.calls[0]?.[3]).not.toHaveProperty("ruleType");
  });
});

describe("Variantes de prix — jours de la semaine", () => {
  it("les jours cochés partent triés, en index 0=dimanche du contrat API", async () => {
    const createPricingRule = vi.fn().mockResolvedValue(rule({ ruleType: "WEEKDAY", daysOfWeek: [5, 6] }));
    renderEdit(makeVenues([slotWith([])], { createPricingRule }));
    const rules = await openRules();

    fireEvent.click(rules.getByRole("button", { name: "Ajouter une variante" }));
    fireEvent.change(rules.getByLabelText("S'applique à"), { target: { value: "WEEKDAY" } });
    // Le week-end algérien est vendredi/samedi, mais rien n'est codé en dur :
    // c'est le pro qui coche.
    fireEvent.click(rules.getByLabelText("samedi"));
    fireEvent.click(rules.getByLabelText("vendredi"));
    fireEvent.change(rules.getByLabelText("Prix appliqué"), { target: { value: "300000" } });
    fireEvent.click(rules.getByRole("button", { name: "Créer la variante" }));

    await waitFor(() => expect(createPricingRule).toHaveBeenCalled());
    expect(createPricingRule).toHaveBeenCalledWith(
      "v1",
      "s1",
      expect.objectContaining({ ruleType: "WEEKDAY", daysOfWeek: [5, 6] })
    );
  });
});
