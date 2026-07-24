// Tests des FORMULAIRES de salle (Lot A5). Les pièges de la tranche, un par un :
//  - prix : rejet décimal STRICT, sans troncature, et AUCUN appel API ;
//  - rejeu de `validate()` : erreurs Zod → clés i18n sur les bons champs ;
//  - mapping des codes métier (CITY_NOT_FOUND, AMENITY_NOT_FOUND) ;
//  - CAPACITY_RANGE_INVALID en édition PARTIELLE (invisible en local) ;
//  - VENUE_NOT_FOUND → état « introuvable » indistinct ;
//  - référentiels (ajout B) : chargement, échec + retry, submit bloqué ;
//  - sélecteur de ville : seules les wilayas peuplées produisent un optgroup.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import type { ReferentialsClient, VenueProClient } from "@zwadj/api-client";
import type { AmenityDTO, VenueProDTO, WilayaDTO } from "@zwadj/types";
import { ApiError, NetworkError, type AuthClient } from "../lib/auth-client";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { CreateVenuePage } from "./create-venue-page";
import { EditVenuePage } from "./edit-venue-page";
import {
  buildCreateInput,
  buildUpdateDiff,
  caretAfterDigits,
  emptyVenueForm,
  formatPriceForDisplay,
  parseIntegerPrice,
  stripGroupSeparators,
  venueToForm
} from "./venue-form";

initI18n();

const PRO_USER = {
  id: "u1",
  email: "contact@salle.dz",
  role: "PRO" as const,
  locale: "fr" as const,
  emailVerified: true,
  firstName: null,
  lastName: null,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567" }
};

const CITY_ID = "6f1c0d2e-2b3a-4c5d-8e9f-0a1b2c3d4e5f";
const AMENITY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

const WILAYAS: WilayaDTO[] = [
  {
    id: "w16",
    code: 16,
    nameFr: "Alger",
    nameAr: "الجزائر",
    cities: [{ id: CITY_ID, nameFr: "Bab Ezzouar", nameAr: "باب الزوار", lat: null, lng: null }]
  },
  // Wilaya SANS ville : ne doit produire AUCUN optgroup (sinon 57 groupes vides).
  { id: "w31", code: 31, nameFr: "Oran", nameAr: "وهران", cities: [] }
];

const AMENITIES: AmenityDTO[] = [
  { id: AMENITY_ID, key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" },
  // `icon: null` (cas réel `kosha`) : le repli d'icône doit tenir.
  { id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e", key: "kosha", nameFr: "Kosha", nameAr: "كوشة العروسين", icon: null }
];

const VENUE: VenueProDTO = {
  id: "v1",
  slug: "salle-el-ryad",
  cityId: CITY_ID,
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
  capacityMin: 100,
  capacityMax: 400,
  basePriceCents: 15_000_000,
  bookingMode: "SINGLE_SLOT",
  publicationStatus: "DRAFT",
  status: "ACTIVE",
  amenityIds: [],
  photos: [],
  photos360: [],
  links360: [],
  viewer360: null,
  createdAt: "2026-01-05T10:00:00.000Z",
  updatedAt: "2026-01-06T10:00:00.000Z"
};

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
    listMine: vi.fn().mockResolvedValue([]),
    getMine: vi.fn().mockResolvedValue(VENUE),
    create: vi.fn().mockResolvedValue({ ...VENUE, id: "v-new" }),
    update: vi.fn().mockResolvedValue(VENUE),
    softDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function makeReferentials(overrides: Partial<ReferentialsClient> = {}): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue(WILAYAS),
    listAmenities: vi.fn().mockResolvedValue(AMENITIES),
    ...overrides
  };
}

function renderCreate(venues: VenueProClient, referentials: ReferentialsClient = makeReferentials()) {
  return render(
    <MemoryRouter initialEntries={["/salles/nouvelle"]}>
      <AppProviders client={makeAuth()} venues={venues} referentials={referentials}>
        <Routes>
          <Route path="/salles/nouvelle" element={<CreateVenuePage />} />
          <Route path="/salles/:id" element={<p>Écran d'édition</p>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
}

function renderEdit(venues: VenueProClient, referentials: ReferentialsClient = makeReferentials()) {
  return render(
    <MemoryRouter initialEntries={["/salles/v1"]}>
      <AppProviders client={makeAuth()} venues={venues} referentials={referentials}>
        <Routes>
          <Route path="/salles/:id" element={<EditVenuePage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
}

/** Remplit le minimum valide du formulaire de création. */
async function fillRequired(price = "150000") {
  fireEvent.change(await screen.findByLabelText("Nom (français)"), { target: { value: "Salle El Ryad" } });
  fireEvent.change(screen.getByLabelText("Nom (arabe)"), { target: { value: "قاعة الرياض" } });
  fireEvent.change(screen.getByLabelText("Commune"), { target: { value: CITY_ID } });
  fireEvent.change(screen.getByLabelText("Capacité minimale"), { target: { value: "100" } });
  fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "400" } });
  fireEvent.change(screen.getByLabelText("Prix de base (DA)"), { target: { value: price } });
}

describe("Prix — rejet décimal strict (invariant argent)", () => {
  it("« 150000 » → basePriceCents = 15 000 000 (×100, jamais un float)", () => {
    expect(parseIntegerPrice("150000")).toEqual({ ok: true, cents: 15_000_000 });
  });

  it.each(["150000.5", "150000,5", "", "  ", "abc", "1e5", "-100"])(
    "« %s » est REFUSÉ (aucune troncature silencieuse)",
    (raw) => {
      expect(parseIntegerPrice(raw)).toEqual({ ok: false });
    }
  );

  it("formulaire : « 150000.5 » bloque l'envoi — AUCUN appel API, aucun calcul de centimes", async () => {
    const venues = makeVenues();
    renderCreate(venues);
    await fillRequired("150000.5");

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle" }));

    expect(await screen.findByText("Le prix de base doit être un nombre entier de centimes.")).toBeInTheDocument();
    expect(venues.create).not.toHaveBeenCalled();
  });

  it("formulaire : « 150000,5 » (virgule) refusé de la même façon", async () => {
    const venues = makeVenues();
    renderCreate(venues);
    await fillRequired("150000,5");

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle" }));

    expect(await screen.findByText("Le prix de base doit être un nombre entier de centimes.")).toBeInTheDocument();
    expect(venues.create).not.toHaveBeenCalled();
  });

  it("formulaire : « 150000 » part bien en 15 000 000 centimes, puis redirige vers l'édition", async () => {
    const venues = makeVenues();
    renderCreate(venues);
    await fillRequired("150000");

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle" }));

    await waitFor(() =>
      expect(venues.create).toHaveBeenCalledWith(expect.objectContaining({ basePriceCents: 15_000_000, cityId: CITY_ID }))
    );
    // §3.3 : pas d'équipements dans le POST, et pas de PATCH enchaîné.
    expect(venues.create).toHaveBeenCalledWith(expect.not.objectContaining({ amenityIds: expect.anything() }));
    expect(venues.update).not.toHaveBeenCalled();
    expect(await screen.findByText("Écran d'édition")).toBeInTheDocument();
  });
});

describe("Création — rejeu de validate() et mapping des erreurs API", () => {
  it("champs vides : erreurs Zod localisées sur les champs, aucun appel API", async () => {
    const venues = makeVenues();
    renderCreate(venues);
    await screen.findByLabelText("Nom (français)");

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle" }));

    expect(await screen.findByText("Le nom en français est requis.")).toBeInTheDocument();
    expect(screen.getByText("La commune est requise.")).toBeInTheDocument();
    expect(venues.create).not.toHaveBeenCalled();
  });

  it("CITY_NOT_FOUND → message porté par le champ Commune", async () => {
    const venues = makeVenues({
      create: vi.fn().mockRejectedValue(new ApiError(400, "CITY_NOT_FOUND", "venue.errors.cityNotFound"))
    });
    renderCreate(venues);
    await fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle" }));

    expect(await screen.findByText("La commune sélectionnée est introuvable.")).toBeInTheDocument();
    expect(screen.getByLabelText("Commune")).toHaveAttribute("aria-invalid", "true");
  });

  it("D32 : astérisque aria-hidden hors du <label>, `required` natif sur l'input, formulaire noValidate", async () => {
    renderCreate(makeVenues());
    const name = await screen.findByLabelText("Nom (français)");

    expect(name).toBeRequired();
    expect(name.closest("form")).toHaveAttribute("noValidate");
    // Le nom accessible reste propre (« Nom (français) », sans astérisque).
    expect(name).toHaveAccessibleName("Nom (français)");
  });
});

describe("Référentiels (ajout B) — chargement, échec, submit bloqué", () => {
  it("pendant le chargement : select ville DÉSACTIVÉ avec l'option d'attente", async () => {
    let resolveWilayas: (value: WilayaDTO[]) => void = () => undefined;
    const referentials = makeReferentials({
      listWilayas: vi.fn().mockReturnValue(new Promise<WilayaDTO[]>((resolve) => (resolveWilayas = resolve)))
    });
    renderCreate(makeVenues(), referentials);

    const select = await screen.findByLabelText("Commune");
    expect(select).toBeDisabled();
    expect(screen.getByText("Chargement des communes…")).toBeInTheDocument();

    resolveWilayas(WILAYAS);
    await waitFor(() => expect(select).toBeEnabled());
  });

  it("échec : bandeau + retry qui recharge réellement, et submit BLOQUÉ entre-temps", async () => {
    const listWilayas = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce(WILAYAS);
    const referentials = makeReferentials({ listWilayas });
    const venues = makeVenues();
    renderCreate(venues, referentials);

    expect(
      await screen.findByText("Impossible de charger les communes et les équipements. Réessayez.")
    ).toBeInTheDocument();
    // Sans commune, pas de cityId : le bouton d'envoi reste inerte.
    expect(screen.getByRole("button", { name: "Créer la salle" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Créer la salle" })).toBeEnabled());
    expect(listWilayas).toHaveBeenCalledTimes(2);
    expect(venues.create).not.toHaveBeenCalled();
  });
});

describe("Sélecteur de ville — <optgroup> par wilaya PEUPLÉE", () => {
  it("seule « Alger » produit un groupe ; « Oran » (0 ville) est absente", async () => {
    renderCreate(makeVenues());
    const select = await screen.findByLabelText("Commune");
    await waitFor(() => expect(select).toBeEnabled());

    const groups = Array.from(select.querySelectorAll("optgroup")).map((g) => g.getAttribute("label"));
    expect(groups).toEqual(["Alger"]);
    expect(screen.getByRole("option", { name: "Bab Ezzouar" })).toBeInTheDocument();
  });
});

describe("Édition — PATCH par diff, 404 indistinct, équipements", () => {
  it("404 VENUE_NOT_FOUND → état « introuvable », sans distinction ni détail", async () => {
    const venues = makeVenues({
      getMine: vi.fn().mockRejectedValue(new ApiError(404, "VENUE_NOT_FOUND", "venue.errors.notFound"))
    });
    renderEdit(venues);

    expect(await screen.findByRole("heading", { name: "Salle introuvable" })).toBeInTheDocument();
    expect(screen.getByText("Cette salle n'existe pas ou n'est plus disponible.")).toBeInTheDocument();
  });

  it("aucune modification : message dédié, AUCUN appel PATCH (le corps vide serait un 400)", async () => {
    const venues = makeVenues();
    renderEdit(venues);
    await screen.findByDisplayValue("Salle El Ryad");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Aucune modification à enregistrer.")).toBeInTheDocument();
    expect(venues.update).not.toHaveBeenCalled();
  });

  it("diff RÉEL : seul le champ modifié est envoyé (et le slug reste en lecture seule)", async () => {
    const venues = makeVenues();
    renderEdit(venues);

    expect(await screen.findByDisplayValue("salle-el-ryad")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { capacityMax: 500 }));
  });

  it("CAPACITY_RANGE_INVALID sur une édition PARTIELLE : le 400 est mappé sur le champ capacité", async () => {
    // Le pro ne modifie QUE la capacité max : le validate() local ne peut pas
    // voir l'incohérence (capacityMin est en base) — seul l'API la révèle.
    const venues = makeVenues({
      update: vi.fn().mockRejectedValue(new ApiError(400, "CAPACITY_RANGE_INVALID", "venue.errors.capacityRange"))
    });
    renderEdit(venues);
    await screen.findByDisplayValue("Salle El Ryad");

    fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("La capacité minimale ne peut pas dépasser la capacité maximale.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Capacité maximale")).toHaveAttribute("aria-invalid", "true");
  });

  it("équipements : remplacement d'ENSEMBLE complet, jamais un delta", async () => {
    const venues = makeVenues();
    renderEdit(venues);

    const wifi = await screen.findByRole("checkbox", { name: "Wifi" });
    fireEvent.click(wifi);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { amenityIds: [AMENITY_ID] }));
  });

  it("AMENITY_NOT_FOUND → message porté par la section Équipements", async () => {
    const venues = makeVenues({
      update: vi.fn().mockRejectedValue(new ApiError(400, "AMENITY_NOT_FOUND", "venue.errors.amenityNotFound"))
    });
    renderEdit(venues);

    fireEvent.click(await screen.findByRole("checkbox", { name: "Wifi" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Un des équipements sélectionnés est introuvable.")).toBeInTheDocument();
  });

  it("statut D33 dans le formulaire : même contrôle à 3 entrées, enregistré par le diff", async () => {
    const venues = makeVenues();
    renderEdit(venues);

    const select = await screen.findByLabelText("Visibilité");
    fireEvent.change(select, { target: { value: "TEMPORARILY_UNAVAILABLE" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { status: "TEMPORARILY_UNAVAILABLE" }));
  });

  it("AUCUN média rendu : la couture A6a reste vide (ni photo, ni scène 360°)", async () => {
    const venues = makeVenues({
      getMine: vi.fn().mockResolvedValue({
        ...VENUE,
        photos: [
          {
            id: "p1",
            url: "https://cdn.test/p1.webp",
            thumbUrl: "https://cdn.test/p1-thumb.webp",
            width: 1920,
            height: 1080,
            sortOrder: 0,
            altFr: null,
            altAr: null,
            createdAt: "2026-01-05T10:00:00.000Z"
          }
        ]
      })
    });
    const { container } = renderEdit(venues);
    await screen.findByDisplayValue("Salle El Ryad");

    // A5 ignore photos/photos360/links360/viewer360 sur CET écran.
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText(/360/)).not.toBeInTheDocument();
  });
});

describe("Constructeurs de payload (unitaire, hors rendu)", () => {
  it("création : les textes optionnels vides sont OMIS, jamais envoyés en chaîne vide", () => {
    const values = { ...emptyVenueForm(), cityId: CITY_ID, nameFr: "Salle", nameAr: "قاعة", capacityMin: "10", capacityMax: "20", basePrice: "1000" };
    const built = buildCreateInput(values);

    expect(built.errors).toBeNull();
    expect(built.data).not.toHaveProperty("taglineFr");
    expect(built.data).not.toHaveProperty("address");
  });

  it("création : lat sans lng → erreur de PAIRE, pas d'envoi mutilé", () => {
    const values = { ...emptyVenueForm(), cityId: CITY_ID, nameFr: "Salle", nameAr: "قاعة", capacityMin: "10", capacityMax: "20", basePrice: "1000", lat: "36.7" };
    const built = buildCreateInput(values);

    expect(built.errors).toEqual(expect.objectContaining({ lng: "venue.validation.coordsPair" }));
  });

  it("édition : vider un texte nullable envoie `null` (effacement EXPLICITE)", () => {
    const venue = { ...VENUE, taglineFr: "Une accroche" };
    const diff = buildUpdateDiff({ ...venueToForm(venue), taglineFr: "  " }, venue);

    expect(diff).toEqual({ kind: "changes", data: { taglineFr: null } });
  });

  it("édition : aucun changement → « empty », donc aucun PATCH", () => {
    expect(buildUpdateDiff(venueToForm(VENUE), VENUE)).toEqual({ kind: "empty" });
  });
});

describe("Prix — affichage groupé + unité (lisibilité de la saisie)", () => {
  it("groupe par milliers à chaque palier : 1000 · 100000 · 1000000", () => {
    expect(formatPriceForDisplay("1000")).toBe("1\u00A0000");
    expect(formatPriceForDisplay("100000")).toBe("100\u00A0000");
    expect(formatPriceForDisplay("1000000")).toBe("1\u00A0000\u00A0000");
    expect(formatPriceForDisplay("150000")).toBe("150\u00A0000");
  });

  it("ne groupe PAS une saisie non entièrement numérique — le formateur ne masque jamais une erreur", () => {
    // Si « 150000.5 » ressortait groupé, le point disparaîtrait de l'écran et
    // le pro ne comprendrait pas le refus. L'invariant argent reste visible.
    expect(formatPriceForDisplay("150000.5")).toBe("150000.5");
    expect(formatPriceForDisplay("150000,5")).toBe("150000,5");
  });

  it("stripGroupSeparators rend les chiffres bruts et laisse passer le décimal (pour qu'il soit REFUSÉ)", () => {
    expect(stripGroupSeparators("1\u00A0000\u00A0000")).toBe("1000000");
    expect(stripGroupSeparators("150 000.5")).toBe("150000.5");
  });

  it("caretAfterDigits repositionne le curseur après le n-ième chiffre, séparateurs ignorés", () => {
    expect(caretAfterDigits("1\u00A0000", 1)).toBe(1);
    expect(caretAfterDigits("1\u00A0000", 2)).toBe(3);
    expect(caretAfterDigits("1\u00A0000", 4)).toBe(5);
    expect(caretAfterDigits("1\u00A0000", 0)).toBe(0);
  });

  it("le champ AFFICHE la valeur groupée + l'unité, mais ENVOIE bien 15000000 centimes", async () => {
    const venues = makeVenues();
    renderCreate(venues);
    await fillRequired("150000");

    // ce que le pro VOIT (espace insécable), sans toucher à la valeur stockée
    expect(screen.getByLabelText("Prix de base (DA)")).toHaveValue("150\u00A0000");
    // unité affichée à côté du champ pendant la saisie
    expect(screen.getByText("DA")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle" }));

    await waitFor(() => expect(venues.create).toHaveBeenCalled());
    const payload = vi.mocked(venues.create).mock.calls[0]?.[0] as { basePriceCents?: number } | undefined;
    expect(payload?.basePriceCents).toBe(15_000_000);
  });
});
