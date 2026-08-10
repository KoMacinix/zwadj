// Tests du volet CRÉNEAUX de l'écran d'édition Pro (Lot B4b). Les pièges :
//  - D52 : « 20:00 → 02:00 » doit partir en `endMinutes: 1560`, PAS 120. Un
//    `<input type="time">` plafonne à 23:59 et ne peut pas dire « 02h du
//    lendemain » — c'est l'erreur de B1 qui remonterait dans l'UI ;
//  - l'écran DIT ce qu'il a déduit, il ne le suppose pas ;
//  - le RETRAIT est un PATCH `isActive:false`, jamais un DELETE ;
//  - un 409 `SLOT_TEMPLATE_IN_USE` s'affiche, il n'efface pas la ligne ;
//  - la section ne rappelle jamais `getMine` : elle ne doit pas écraser les
//    saisies en cours du formulaire principal.
//
// Le client venue s'injecte par `AppProviders`. `fireEvent`, comme les autres
// suites pro (`@testing-library/user-event` n'est pas une dépendance du dépôt).
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import type { VenueProClient } from "@zwadj/api-client";
import { ApiError } from "@zwadj/api-client";
import type { SlotTemplateDTO, VenueProDTO } from "@zwadj/types";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { EditVenuePage } from "./edit-venue-page";

initI18n();

const SOIREE: SlotTemplateDTO = {
  id: "s1",
  nameFr: "Soirée",
  nameAr: "سهرة",
  startMinutes: 1200,
  endMinutes: 1560,
  basePriceCents: 20_000_000,
  isActive: true,
  createdAt: "2026-01-05T10:00:00.000Z",
  pricingRules: []
};

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
    <MemoryRouter initialEntries={["/salles/v1?etape=4"]}>
      <AppProviders client={makeAuthDouble()} venues={venues} referentials={makeReferentialsDouble()}>
        <Routes>
          <Route path="/salles/:id" element={<EditVenuePage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
}

// ⚠ UIP-C — voir blocks-section : l'ancre est le titre de l'étape, pas un champ
// de l'étape 1, que l'assistant ne monte plus en même temps.
const ready = () => screen.findByRole("heading", { name: "Réservation", level: 2 });
const section = () => screen.getByRole("region", { name: "Créneaux et prix" });


/** D57 — l'heure se saisit sur DEUX listes 24 h (pas de `<input type="time">`,
 *  qui afficherait AM/PM selon la locale du navigateur). Ce helper pilote les
 *  deux d'un coup, comme un pro le ferait. */
function setTime(scope: ReturnType<typeof within>, field: string, value: string) {
  const group = scope.getByRole("group", { name: field });
  const [hh = "00", mm = "00"] = value.split(":");
  fireEvent.change(within(group).getByLabelText("Heures"), { target: { value: hh } });
  fireEvent.change(within(group).getByLabelText("Minutes"), { target: { value: mm } });
}

async function openCreateForm() {
  fireEvent.click(within(section()).getByRole("button", { name: "Ajouter un créneau" }));
  return within(section());
}

describe("Volet créneaux — affichage", () => {
  it("une soirée 20h→02h s'affiche en heures MURALES et annonce le lendemain", async () => {
    renderEdit(makeVenues([SOIREE]));
    await ready();
    const text = section().textContent ?? "";
    expect(text).toContain("20:00–02:00");
    expect(text).toContain("(lendemain)");
  });

  it("un créneau retiré est marqué, pas masqué", async () => {
    renderEdit(makeVenues([{ ...SOIREE, isActive: false }]));
    await ready();
    expect(section().textContent).toContain("Retiré");
  });

  it("sans créneau, l'écran le dit au lieu d'afficher une liste vide", async () => {
    renderEdit(makeVenues([]));
    await ready();
    expect(section().textContent).toContain("Aucun créneau pour l'instant.");
  });
});

describe("Volet créneaux — D52, la fin est DÉDUITE", () => {
  it("20:00 → 02:00 part en endMinutes 1560, PAS 120 — le créneau que B1 avait interdit", async () => {
    const createSlotTemplate = vi.fn().mockResolvedValue(SOIREE);
    renderEdit(makeVenues([], { createSlotTemplate }));
    await ready();
    const form = await openCreateForm();

    fireEvent.change(form.getByLabelText("Nom du créneau (français)"), { target: { value: "Soirée" } });
    fireEvent.change(form.getByLabelText("Nom du créneau (arabe)"), { target: { value: "سهرة" } });
    setTime(form, "Heure de début", "20:00");
    setTime(form, "Heure de fin", "02:00");
    fireEvent.change(form.getByLabelText("Prix du créneau"), { target: { value: "200000" } });
    fireEvent.click(form.getByRole("button", { name: "Créer le créneau" }));

    await waitFor(() => expect(createSlotTemplate).toHaveBeenCalled());
    expect(createSlotTemplate).toHaveBeenCalledWith("v1", {
      nameFr: "Soirée",
      nameAr: "سهرة",
      startMinutes: 1200,
      endMinutes: 1560,
      basePriceCents: 20_000_000
    });
  });

  it("un créneau de journée n'est PAS décalé : 10:00 → 15:00 reste 900", async () => {
    const createSlotTemplate = vi.fn().mockResolvedValue({ ...SOIREE, startMinutes: 600, endMinutes: 900 });
    renderEdit(makeVenues([], { createSlotTemplate }));
    await ready();
    const form = await openCreateForm();

    fireEvent.change(form.getByLabelText("Nom du créneau (français)"), { target: { value: "Matinée" } });
    fireEvent.change(form.getByLabelText("Nom du créneau (arabe)"), { target: { value: "صباحية" } });
    setTime(form, "Heure de début", "10:00");
    setTime(form, "Heure de fin", "15:00");
    fireEvent.change(form.getByLabelText("Prix du créneau"), { target: { value: "120000" } });
    fireEvent.click(form.getByRole("button", { name: "Créer le créneau" }));

    await waitFor(() => expect(createSlotTemplate).toHaveBeenCalled());
    expect(createSlotTemplate).toHaveBeenCalledWith("v1", expect.objectContaining({ endMinutes: 900 }));
  });

  it("l'écran DIT ce qu'il a déduit, avant même l'envoi", async () => {
    renderEdit(makeVenues([]));
    await ready();
    const form = await openCreateForm();

    setTime(form, "Heure de début", "20:00");
    setTime(form, "Heure de fin", "02:00");
    expect(section().textContent).toContain("se termine le lendemain");

    setTime(form, "Heure de fin", "23:00");
    expect(section().textContent).toContain("se termine le jour même");
  });
});

describe("Volet créneaux — retrait et suppression", () => {
  it("« Retirer » est un PATCH isActive:false, jamais un DELETE", async () => {
    const updateSlotTemplate = vi.fn().mockResolvedValue({ ...SOIREE, isActive: false });
    const deleteSlotTemplate = vi.fn();
    renderEdit(makeVenues([SOIREE], { updateSlotTemplate, deleteSlotTemplate }));
    await ready();

    fireEvent.click(within(section()).getByRole("button", { name: "Retirer" }));
    await waitFor(() => expect(updateSlotTemplate).toHaveBeenCalledWith("v1", "s1", { isActive: false }));
    expect(deleteSlotTemplate).not.toHaveBeenCalled();
  });

  it("un 409 SLOT_TEMPLATE_IN_USE s'affiche et la ligne RESTE", async () => {
    const deleteSlotTemplate = vi
      .fn()
      .mockRejectedValue(new ApiError(409, "SLOT_TEMPLATE_IN_USE", "venue.errors.slotInUse"));
    renderEdit(makeVenues([SOIREE], { deleteSlotTemplate }));
    await ready();

    fireEvent.click(within(section()).getByRole("button", { name: "Supprimer" }));
    // Deux boutons « Supprimer » coexistent : celui de la ligne et celui du
    // dialogue. On confirme dans le DIALOGUE, sans ambiguïté.
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(deleteSlotTemplate).toHaveBeenCalled());
    expect(section().textContent).toContain("Soirée");
  });
});

describe("Volet créneaux — isolation de la page", () => {
  it("la section ne rappelle JAMAIS getMine : les saisies du formulaire principal survivent", async () => {
    const updateSlotTemplate = vi.fn().mockResolvedValue({ ...SOIREE, isActive: false });
    const venues = makeVenues([SOIREE], { updateSlotTemplate });
    renderEdit(venues);
    await ready();
    const callsAfterLoad = (venues.getMine as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.click(within(section()).getByRole("button", { name: "Retirer" }));
    await waitFor(() => expect(updateSlotTemplate).toHaveBeenCalled());

    expect((venues.getMine as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterLoad);
  });
});
