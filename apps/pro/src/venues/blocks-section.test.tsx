// Tests du volet BLOCAGES de l'écran d'édition Pro (Lot B4d, D51). Les pièges :
//  - la borne de fin est INCLUSIVE à l'écran, exclusive dans l'API : « du 3 au
//    10 » doit partir en `endsAt: 2027-08-11T00:00`, sinon le 10 reste libre ;
//  - la relecture est SYMÉTRIQUE : ce blocage se réaffiche « du 3 au 10 », pas
//    « au 11 », sans quoi le pro corrige un décalage qui n'existe pas ;
//  - AUCUNE conversion de fuseau : les chaînes partent sans « Z » ni offset,
//    quel que soit le fuseau du navigateur qui exécute le test ;
//  - un 409 AVAILABILITY_BLOCK_CONFLICT s'affiche et n'ajoute rien à la liste ;
//  - le volet CHARGE ses données (les blocages ne sont pas dans le DTO) mais
//    ne rappelle jamais `getMine`.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import type { VenueProClient } from "@zwadj/api-client";
import { ApiError } from "@zwadj/api-client";
import type { AvailabilityBlockDTO, VenueProDTO } from "@zwadj/types";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { EditVenuePage } from "./edit-venue-page";

initI18n();

const block = (over: Partial<AvailabilityBlockDTO> = {}): AvailabilityBlockDTO => ({
  id: "b1",
  startsAt: "2027-08-03T00:00",
  endsAt: "2027-08-11T00:00",
  reason: "Travaux",
  createdAt: "2026-07-28T10:00:00.000Z",
  ...over
});

const VENUE: VenueProDTO = {
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
  slotTemplates: [],
  matterportModelId: null,
  createdAt: "2026-01-05T10:00:00.000Z",
  updatedAt: "2026-01-06T10:00:00.000Z"
};

function makeVenues(overrides: Partial<VenueProClient> = {}): VenueProClient {
  return makeVenueClientDouble(VENUE, overrides);
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

const section = () => screen.getByRole("region", { name: "Périodes bloquées" });

/** D57 — l'heure se saisit sur DEUX listes 24 h (pas de `<input type="time">`,
 *  qui afficherait AM/PM selon la locale du navigateur). Ce helper pilote les
 *  deux d'un coup, comme un pro le ferait. */
function setTime(scope: ReturnType<typeof within>, field: string, value: string) {
  const group = scope.getByRole("group", { name: field });
  const [hh = "00", mm = "00"] = value.split(":");
  fireEvent.change(within(group).getByLabelText("Heures"), { target: { value: hh } });
  fireEvent.change(within(group).getByLabelText("Minutes"), { target: { value: mm } });
}


async function ready() {
  // ⚠ UIP-C — l'ancre d'attente ne peut plus être le champ « nom de la salle » :
  // il vit à l'étape 1, et l'assistant ne monte qu'une étape à la fois. On
  // attend donc le TITRE de l'étape où cette section vit — le seul repère qui
  // prouve que le bon écran est prêt.
  await screen.findByRole("heading", { name: "Réservation", level: 2 });
  await waitFor(() => expect(section().textContent).not.toContain("Chargement"));
  return within(section());
}

describe("Volet blocages — chargement", () => {
  it("charge sa fenêtre au montage : les blocages ne sont pas dans le DTO", async () => {
    const listAvailabilityBlocks = vi.fn().mockResolvedValue([]);
    renderEdit(makeVenues({ listAvailabilityBlocks }));
    await ready();
    expect(listAvailabilityBlocks).toHaveBeenCalledTimes(1);
    const [venueId, windowArg] = listAvailabilityBlocks.mock.calls[0] ?? [];
    expect(venueId).toBe("v1");
    // Fenêtre de 92 jours rendus, le plafond exact de l'API.
    const days =
      (Date.parse(`${windowArg.to}T00:00:00Z`) - Date.parse(`${windowArg.from}T00:00:00Z`)) / 86_400_000 + 1;
    expect(days).toBe(92);
  });

  it("sans blocage, l'écran le dit au lieu d'afficher une liste vide", async () => {
    renderEdit(makeVenues());
    const blocks = await ready();
    expect(blocks.getByText(/Aucune période bloquée/)).toBeTruthy();
  });
});

describe("Volet blocages — la borne de fin est INCLUSIVE à l'écran", () => {
  it("« du 3 au 10 » part en endsAt 2027-08-11T00:00, sinon le 10 resterait libre", async () => {
    const createAvailabilityBlock = vi.fn().mockResolvedValue(block());
    renderEdit(makeVenues({ createAvailabilityBlock }));
    const blocks = await ready();

    fireEvent.click(blocks.getByRole("button", { name: "Bloquer une période" }));
    fireEvent.change(blocks.getByLabelText("Du"), { target: { value: "2027-08-03" } });
    fireEvent.change(blocks.getByLabelText("Au"), { target: { value: "2027-08-10" } });
    fireEvent.change(blocks.getByLabelText("Motif (facultatif)"), { target: { value: "Travaux" } });
    fireEvent.click(blocks.getByRole("button", { name: "Bloquer" }));

    await waitFor(() => expect(createAvailabilityBlock).toHaveBeenCalled());
    expect(createAvailabilityBlock).toHaveBeenCalledWith("v1", {
      startsAt: "2027-08-03T00:00",
      endsAt: "2027-08-11T00:00",
      reason: "Travaux"
    });
  });

  it("D51 — aucune conversion de fuseau : ni Z, ni offset, ni millisecondes", async () => {
    const createAvailabilityBlock = vi.fn().mockResolvedValue(block());
    renderEdit(makeVenues({ createAvailabilityBlock }));
    const blocks = await ready();

    fireEvent.click(blocks.getByRole("button", { name: "Bloquer une période" }));
    fireEvent.change(blocks.getByLabelText("Du"), { target: { value: "2027-08-03" } });
    fireEvent.change(blocks.getByLabelText("Au"), { target: { value: "2027-08-03" } });
    fireEvent.click(blocks.getByRole("button", { name: "Bloquer" }));

    await waitFor(() => expect(createAvailabilityBlock).toHaveBeenCalled());
    const sent = JSON.stringify(createAvailabilityBlock.mock.calls[0]?.[1]);
    expect(sent).not.toMatch(/Z"|\+\d{2}:\d{2}|\.\d{3}/);
  });

  it("une plage HORAIRE part avec les heures saisies, sans décalage", async () => {
    const createAvailabilityBlock = vi.fn().mockResolvedValue(block());
    renderEdit(makeVenues({ createAvailabilityBlock }));
    const blocks = await ready();

    fireEvent.click(blocks.getByRole("button", { name: "Bloquer une période" }));
    fireEvent.click(blocks.getByLabelText("Journées entières"));
    fireEvent.change(blocks.getByLabelText("Du"), { target: { value: "2027-08-14" } });
    setTime(blocks, "Heure de début", "14:00");
    fireEvent.change(blocks.getByLabelText("Au"), { target: { value: "2027-08-14" } });
    setTime(blocks, "Heure de fin", "18:00");
    fireEvent.click(blocks.getByRole("button", { name: "Bloquer" }));

    await waitFor(() => expect(createAvailabilityBlock).toHaveBeenCalled());
    expect(createAvailabilityBlock.mock.calls[0]?.[1]).toMatchObject({
      startsAt: "2027-08-14T14:00",
      endsAt: "2027-08-14T18:00"
    });
  });
});

describe("Volet blocages — relecture symétrique", () => {
  it("un blocage de journées entières se relit « du 3 au 10 », pas « au 11 »", async () => {
    renderEdit(makeVenues({ listAvailabilityBlocks: vi.fn().mockResolvedValue([block()]) }));
    const blocks = await ready();
    const list = blocks.getByRole("list", { name: "Périodes bloquées" });
    expect(list.textContent).toContain("2027-08-10");
    expect(list.textContent).not.toContain("2027-08-11");
  });

  it("une plage horaire s'affiche avec ses heures, telle qu'elle a été saisie", async () => {
    renderEdit(
      makeVenues({
        listAvailabilityBlocks: vi
          .fn()
          .mockResolvedValue([block({ startsAt: "2027-08-14T14:00", endsAt: "2027-08-14T18:00", reason: null })])
      })
    );
    const blocks = await ready();
    expect(blocks.getByRole("list", { name: "Périodes bloquées" }).textContent).toContain("2027-08-14 14:00");
  });
});

describe("Volet blocages — conflits et levée", () => {
  it("un 409 AVAILABILITY_BLOCK_CONFLICT s'affiche et n'ajoute RIEN à la liste", async () => {
    const createAvailabilityBlock = vi
      .fn()
      .mockRejectedValue(new ApiError(409, "AVAILABILITY_BLOCK_CONFLICT", "venue.errors.blockConflict"));
    renderEdit(makeVenues({ createAvailabilityBlock }));
    const blocks = await ready();

    fireEvent.click(blocks.getByRole("button", { name: "Bloquer une période" }));
    fireEvent.change(blocks.getByLabelText("Du"), { target: { value: "2027-08-03" } });
    fireEvent.change(blocks.getByLabelText("Au"), { target: { value: "2027-08-03" } });
    fireEvent.click(blocks.getByRole("button", { name: "Bloquer" }));

    await waitFor(() => expect(createAvailabilityBlock).toHaveBeenCalled());
    expect(await blocks.findByRole("alert")).toBeTruthy();
    expect(blocks.queryByRole("list", { name: "Périodes bloquées" })).toBeNull();
  });

  it("lever un blocage le retire de la liste après confirmation", async () => {
    const deleteAvailabilityBlock = vi.fn().mockResolvedValue(undefined);
    renderEdit(
      makeVenues({ listAvailabilityBlocks: vi.fn().mockResolvedValue([block()]), deleteAvailabilityBlock })
    );
    const blocks = await ready();

    fireEvent.click(blocks.getByRole("button", { name: "Lever le blocage" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lever le blocage" }));

    await waitFor(() => expect(deleteAvailabilityBlock).toHaveBeenCalledWith("v1", "b1"));
    await waitFor(() => expect(section().textContent).toContain("Aucune période bloquée"));
  });
});

describe("Volet blocages — isolation de la page", () => {
  it("ne rappelle JAMAIS getMine : les saisies du formulaire principal survivent", async () => {
    const venues = makeVenues({
      listAvailabilityBlocks: vi.fn().mockResolvedValue([block()]),
      deleteAvailabilityBlock: vi.fn().mockResolvedValue(undefined)
    });
    renderEdit(venues);
    const blocks = await ready();
    const before = (venues.getMine as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.click(blocks.getByRole("button", { name: "Lever le blocage" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lever le blocage" }));
    await waitFor(() => expect(venues.deleteAvailabilityBlock).toHaveBeenCalled());

    expect((venues.getMine as ReturnType<typeof vi.fn>).mock.calls.length).toBe(before);
  });
});
