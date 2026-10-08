// « Ma salle » — la salle qu'on vient de CRÉER entre dans la liste SANS rafraîchir la page. Rang 33 (D326), décision 11 (c) du relecteur et arbitrage de Ko du 05/10/2026 :
// « sur la page "Ma salle", une nouvelle salle créée doit apparaître automatiquement dans la liste, sans que l'utilisateur ait besoin de rafraîchir la page ».
//
// ⛔ LE DÉFAUT A ÉTÉ REPRODUIT AVANT DE CORRIGER (D231) : `create-venue-page.tsx` naviguait vers `/salles/:id?etape=2` sans rien dire à `ProVenuesProvider`, qui ne relit la
// liste qu'à la connexion et au clic « Réessayer ». Une navigation INTERNE vers `/salles` (aucun rechargement) montrait donc la liste d'AVANT — vide pour un pro qui crée sa
// première salle. Le rouge est dans `docs/preuves/D326/rouge/`.
//
// ⚠ LA LISTE ET LE LIBELLÉ « Ma salle / Mes salles » RESTENT LUS À UNE SEULE SOURCE, `ProVenuesProvider` (D78) : le correctif demande au fournisseur de relire (`reload`), il ne
// donne pas à la page de création une liste à elle. Ce que le test mesure : le fournisseur relit APRÈS la création, la liste le montre, et le libellé de la navigation suit.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { VenueProDTO, WilayaDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { CreateVenuePage } from "./create-venue-page";
import { EditVenuePage } from "./edit-venue-page";
import { VenueListPage } from "./venue-list-page";

initI18n();

const CITY_ID = "11111111-1111-4111-8111-111111111111";
const WILAYAS: WilayaDTO[] = [
  { id: "w16", nameFr: "Alger", nameAr: "الجزائر", code: 16, cities: [{ id: CITY_ID, nameFr: "Alger-Centre", nameAr: "الجزائر الوسطى", lat: 36.7538, lng: 3.0588 }] }
];
const NOUVELLE = {
  id: "v9",
  slug: "salle-nouvelle",
  cityId: CITY_ID,
  nameFr: "Salle Nouvelle",
  nameAr: "قاعة جديدة",
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
  bookingMode: "SINGLE_SLOT",
  depositRateBps: 3000,
  depositAmountCents: null,
  status: "ACTIVE",
  publicationStatus: "DRAFT",
  amenityIds: [],
  styleIds: [],
  ceremonyType: null,
  photos: [],
  slotTemplates: [],
  matterportModelId: null
} as unknown as VenueProDTO;

/** Une navigation INTERNE (React Router), jamais un rechargement : c'est elle qu'un pro fait en cliquant « Salles » après avoir créé la sienne. */
function VersLaListe() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate("/salles")}>
      aller à la liste
    </button>
  );
}

function monde() {
  // Le serveur : la liste est VIDE tant qu'aucune salle n'a été créée, puis contient la nouvelle — comme le ferait `GET /pro/venues`.
  const creees: VenueProDTO[] = [];
  const venues = makeVenueClientDouble(NOUVELLE, {
    listMine: vi.fn(async () => [...creees]),
    create: vi.fn(async () => {
      creees.push(NOUVELLE);
      return NOUVELLE;
    })
  });
  render(
    <MemoryRouter initialEntries={["/salles/nouvelle"]}>
      <AppProviders client={makeAuthDouble()} venues={venues} referentials={makeReferentialsDouble(WILAYAS)}>
        <VersLaListe />
        <Routes>
          <Route path="/salles/nouvelle" element={<CreateVenuePage />} />
          <Route path="/salles/:id" element={<EditVenuePage />} />
          <Route path="/salles" element={<VenueListPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
  return venues;
}

async function creer() {
  fireEvent.change(await screen.findByLabelText("Nom (français)"), { target: { value: "Salle Nouvelle" } });
  fireEvent.change(screen.getByLabelText("Nom (arabe)"), { target: { value: "قاعة جديدة" } });
  fireEvent.change(screen.getByLabelText("Commune"), { target: { value: CITY_ID } });
  fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "400" } });
  fireEvent.change(screen.getByLabelText("Prix de base"), { target: { value: "150000" } });
  fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));
  // L'assistant reprend à l'étape 2 : la salle existe.
  await screen.findByText("Étape 2 sur 7");
}

describe("« Ma salle » — la salle créée apparaît dans la liste, sans rafraîchir", () => {
  it("⛔ après la création, une navigation INTERNE vers la liste montre la nouvelle salle", async () => {
    const venues = monde();
    await creer();
    expect(vi.mocked(venues.create)).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "aller à la liste" }));
    });
    await waitFor(() => expect(screen.queryByText("Salle Nouvelle")).not.toBeNull());
  });

  it("le fournisseur RELIT la liste après la création — une seule source (D78), pas une liste propre à la page de création", async () => {
    const venues = monde();
    await waitFor(() => expect(vi.mocked(venues.listMine)).toHaveBeenCalledTimes(1)); // la lecture de la connexion
    await creer();
    await waitFor(() => expect(vi.mocked(venues.listMine)).toHaveBeenCalledTimes(2));
  });

  it("la relecture ne se fait PAS quand la création ÉCHOUE : une salle qui n'existe pas n'a aucune raison de faire relire la liste", async () => {
    const venues = makeVenueClientDouble(NOUVELLE, {
      listMine: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockRejectedValue(new Error("boom"))
    });
    render(
      <MemoryRouter initialEntries={["/salles/nouvelle"]}>
        <AppProviders client={makeAuthDouble()} venues={venues} referentials={makeReferentialsDouble(WILAYAS)}>
          <Routes>
            <Route path="/salles/nouvelle" element={<CreateVenuePage />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>
    );
    fireEvent.change(await screen.findByLabelText("Nom (français)"), { target: { value: "Salle Nouvelle" } });
    fireEvent.change(screen.getByLabelText("Nom (arabe)"), { target: { value: "قاعة جديدة" } });
    fireEvent.change(screen.getByLabelText("Commune"), { target: { value: CITY_ID } });
    fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "400" } });
    fireEvent.change(screen.getByLabelText("Prix de base"), { target: { value: "150000" } });
    await waitFor(() => expect(vi.mocked(venues.listMine)).toHaveBeenCalledTimes(1));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));
    });
    await screen.findByRole("alert");
    expect(vi.mocked(venues.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(venues.listMine)).toHaveBeenCalledTimes(1);
  });
});
