// Tests de la LISTE des salles (Lot A5). Points sensibles couverts :
//  - D33 : trois états rendus, PATCH { status } déclenché, AUCUNE confirmation ;
//  - suppression : elle, exige le ConfirmDialog, puis recharge la liste ;
//  - états vide / chargement / erreur + retry.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import type { ReferentialsClient, VenueProClient } from "@zwadj/api-client";
import type { VenueProDTO, WilayaDTO } from "@zwadj/types";
import { ApiError, type AuthClient } from "../lib/auth-client";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { VenueListPage } from "./venue-list-page";

initI18n();

const PRO_USER = {
  id: "u1",
  email: "contact@salle.dz",
  role: "PRO" as const,
  locale: "fr" as const,
  emailVerified: true,
  firstName: null,
  lastName: null,
  // A10 : les 4 champs D42 du contrat AuthUserDTO.
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null }
};

const VENUE: VenueProDTO = {
  slotTemplates: [],
  id: "v1",
  slug: "salle-el-ryad",
  cityId: "city-bab-ezzouar",
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
  bookingMode: "SINGLE_SLOT",
  publicationStatus: "DRAFT",
  status: "ACTIVE",
  amenityIds: [],
  photos: [],
  matterportModelId: null,
  createdAt: "2026-01-05T10:00:00.000Z",
  updatedAt: "2026-01-06T10:00:00.000Z"
};

const WILAYAS: WilayaDTO[] = [
  {
    id: "w16",
    code: 16,
    nameFr: "Alger",
    nameAr: "الجزائر",
    cities: [{ id: "city-bab-ezzouar", nameFr: "Bab Ezzouar", nameAr: "باب الزوار", lat: null, lng: null }]
  }
];

function makeAuth(): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(PRO_USER),
    login: vi.fn(),
    googleAuth: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    authedRequest: vi.fn(),
    getAccessToken: () => "jwt"
  };
}

function makeVenues(overrides: Partial<VenueProClient> = {}): VenueProClient {
  return {
    listMine: vi.fn().mockResolvedValue([VENUE]),
    getMine: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((_id: string, patch: Record<string, unknown>) =>
      Promise.resolve({ ...VENUE, ...patch })
    ),
    softDelete: vi.fn().mockResolvedValue(undefined),
    updateVirtualTour: vi.fn().mockResolvedValue({ matterportModelId: null }),
    // A6a-P — les 4 méthodes photos du contrat VenueProClient.
    addPhoto: vi.fn(),
    reorderPhotos: vi.fn(),
    updatePhotoAlt: vi.fn(),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function makeReferentials(overrides: Partial<ReferentialsClient> = {}): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue(WILAYAS),
    listAmenities: vi.fn().mockResolvedValue([]),
    ...overrides
  };
}

function renderList(venues: VenueProClient, referentials: ReferentialsClient = makeReferentials()) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AppProviders client={makeAuth()} venues={venues} referentials={referentials}>
        <VenueListPage />
      </AppProviders>
    </MemoryRouter>
  );
}

describe("Liste des salles — rendu des cartes", () => {
  it("affiche nom, commune (data), capacité et prix formaté depuis les CENTIMES", async () => {
    renderList(makeVenues());

    expect(await screen.findByRole("heading", { name: "Salle El Ryad" })).toBeInTheDocument();
    expect(screen.getByText("Bab Ezzouar")).toBeInTheDocument();
    expect(screen.getByText("Jusqu'à 400 invités")).toBeInTheDocument();
    // formatDZD prend des centimes : 15 000 000 centimes = 150 000 DA.
    expect(screen.getByText(/150\s*000/)).toBeInTheDocument();
    // Sans photo : le bloc placeholder, et AUCUNE gestion de média.
    expect(screen.getByText("Aucune photo")).toBeInTheDocument();
    // Publication : badge LECTURE SEULE, aucun bouton « publier/soumettre ».
    expect(screen.getByText("En attente de publication par Zwadj")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publier|soumettre/i })).not.toBeInTheDocument();
  });

  it("état VIDE : titre, explication et appel à l'action", async () => {
    renderList(makeVenues({ listMine: vi.fn().mockResolvedValue([]) }));
    expect(await screen.findByRole("heading", { name: "Aucune salle pour le moment" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer une salle" })).toBeInTheDocument();
  });

  it("état ERREUR : message + « Réessayer » qui relance réellement l'appel", async () => {
    const listMine = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, "INTERNAL", undefined))
      .mockResolvedValueOnce([VENUE]);
    renderList(makeVenues({ listMine }));

    expect(await screen.findByText("Impossible de charger vos salles.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByRole("heading", { name: "Salle El Ryad" })).toBeInTheDocument();
    expect(listMine).toHaveBeenCalledTimes(2);
  });
});

describe("Liste — statut D33 (3 entrées, sans confirmation)", () => {
  it("rend les TROIS états et envoie PATCH { status } sans ouvrir de dialogue", async () => {
    const venues = makeVenues();
    renderList(venues);

    const select = await screen.findByLabelText("Visibilité");
    // Trois entrées, donc un select — jamais un toggle (D33/§3.4).
    expect(Array.from(select.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Visible",
      "Masquée",
      "Temporairement indisponible"
    ]);

    fireEvent.change(select, { target: { value: "HIDDEN" } });

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { status: "HIDDEN" }));
    // Réversible, sans re-modération ⇒ AUCUNE confirmation ne doit apparaître.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(select).toHaveValue("HIDDEN"); // mise à jour optimiste
  });

  it("échec du PATCH : REVERT de la valeur + message d'erreur", async () => {
    const venues = makeVenues({ update: vi.fn().mockRejectedValue(new ApiError(500, "INTERNAL", undefined)) });
    renderList(venues);

    const select = await screen.findByLabelText("Visibilité");
    fireEvent.change(select, { target: { value: "TEMPORARILY_UNAVAILABLE" } });

    expect(await screen.findByText("Le changement de visibilité a échoué. Réessayez.")).toBeInTheDocument();
    // La valeur revient à l'état serveur : le pro ne doit pas croire sa salle
    // masquée alors qu'elle est toujours en ligne.
    await waitFor(() => expect(select).toHaveValue("ACTIVE"));
  });
});

describe("Liste — suppression (soft delete)", () => {
  it("« Supprimer » ouvre le ConfirmDialog ; confirmer appelle softDelete puis recharge", async () => {
    const venues = makeVenues();
    renderList(venues);

    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Supprimer cette salle ?");
    expect(venues.softDelete).not.toHaveBeenCalled(); // rien avant confirmation

    // Deux boutons « Supprimer » coexistent (carte + dialogue) : on cible
    // explicitement celui DU DIALOGUE.
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(venues.softDelete).toHaveBeenCalledWith("v1"));
    await waitFor(() => expect(venues.listMine).toHaveBeenCalledTimes(2)); // rechargement
  });

  it("annuler ferme le dialogue SANS rien supprimer", async () => {
    const venues = makeVenues();
    renderList(venues);

    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(venues.softDelete).not.toHaveBeenCalled();
  });
});
