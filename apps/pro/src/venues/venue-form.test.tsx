// Tests des FORMULAIRES de salle (Lot A5). Les pièges de la tranche, un par un :
//  - prix : rejet décimal STRICT, sans troncature, et AUCUN appel API ;
//  - rejeu de `validate()` : erreurs Zod → clés i18n sur les bons champs ;
//  - mapping des codes métier (CITY_NOT_FOUND, AMENITY_NOT_FOUND) : un 400 que
//    le `validate()` local ne PEUT pas anticiper doit atterrir sur son champ ;
//  - VENUE_NOT_FOUND → état « introuvable » indistinct ;
//  - référentiels (ajout B) : chargement, échec + retry, submit bloqué ;
//  - sélecteur de ville : seules les wilayas peuplées produisent un optgroup.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import type { ReferentialsClient, VenueProClient } from "@zwadj/api-client";
import type { AmenityDTO, VenueProDTO, WilayaDTO } from "@zwadj/types";
import { ApiError, NetworkError, type AuthClient } from "../lib/auth-client";
import { makeVenueClientDouble } from "../test-support/client-doubles";
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
  // A10 : les 4 champs D42 du contrat AuthUserDTO.
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null }
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

// ⚠ UUID RÉELS : `venueUpdateSchema` valide `styleIds` en UUID. Une fixture en
// « st-1 » échouait la validation AVANT tout appel réseau, et le test se serait
// lu comme « le formulaire n'envoie rien » alors qu'il refusait la fixture.
const STYLE_ROYAL = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const STYLE_JARDIN = "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f";
const STYLES = [
  { id: STYLE_ROYAL, key: "royal", nameFr: "Royal", nameAr: "ملكي", sortOrder: 1 },
  { id: STYLE_JARDIN, key: "jardin", nameFr: "Jardin", nameAr: "حديقة", sortOrder: 2 }
];

const VENUE: VenueProDTO = {
  slotTemplates: [],
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
  capacityMax: 400,
  basePriceCents: 15_000_000,
  bookingMode: "SINGLE_SLOT",
  depositRateBps: 3000,
  depositAmountCents: null,
  publicationStatus: "DRAFT",
  status: "ACTIVE",
  amenityIds: [],
  styleIds: [],
  ceremonyType: null,
  photos: [],
  matterportModelId: null,
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
  return makeVenueClientDouble(VENUE, {
    create: vi.fn().mockResolvedValue({ ...VENUE, id: "v-new" }),
    update: vi.fn().mockResolvedValue(VENUE),
    ...overrides
  });
}

function makeReferentials(overrides: Partial<ReferentialsClient> = {}): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue(WILAYAS),
    listAmenities: vi.fn().mockResolvedValue(AMENITIES),
    listVenueStyles: vi.fn().mockResolvedValue(STYLES),
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

/** ⚠ UIP-C — l'édition est un assistant : il faut dire À QUELLE ÉTAPE on entre.
 *  Défaut 1 (« L'essentiel »), où vivent les champs généraux ; équipements et
 *  styles sont passés à l'étape 3. */
function renderEdit(
  venues: VenueProClient,
  referentials: ReferentialsClient = makeReferentials(),
  etape = 1
) {
  return render(
    <MemoryRouter initialEntries={[`/salles/v1?etape=${etape}`]}>
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
  fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "400" } });
  fireEvent.change(screen.getByLabelText("Prix de base"), { target: { value: price } });
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

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));

    expect(await screen.findByText("Le prix de base doit être un nombre entier de centimes.")).toBeInTheDocument();
    expect(venues.create).not.toHaveBeenCalled();
  });

  it("formulaire : « 150000,5 » (virgule) refusé de la même façon", async () => {
    const venues = makeVenues();
    renderCreate(venues);
    await fillRequired("150000,5");

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));

    expect(await screen.findByText("Le prix de base doit être un nombre entier de centimes.")).toBeInTheDocument();
    expect(venues.create).not.toHaveBeenCalled();
  });

  it("formulaire : « 150000 » part bien en 15 000 000 centimes, puis redirige vers l'édition", async () => {
    const venues = makeVenues();
    renderCreate(venues);
    await fillRequired("150000");

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));

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
  it("⚠ champs vides : « Suivant » est INACTIF avec sa raison écrite, aucun appel API (UIP-C)", async () => {
    // ⚠ CHANGEMENT ASSUMÉ, exigé par le cadrage : « Suivant n'est actif que si
    // l'étape courante est valide ». Sur un formulaire vierge, il n'y a donc plus
    // de clic à faire — et donc plus de messages « requis » par champ, qui
    // accuseraient l'utilisateur de n'avoir pas encore tapé. Ce qu'il voit : le
    // bouton grisé ET la liste de ce qui manque.
    // Les messages par champ, eux, réapparaissent dès qu'un champ est REMPLI mais
    // invalide — c'est le cas mesuré par les tests de prix décimal juste au-dessus.
    const venues = makeVenues();
    renderCreate(venues);
    await screen.findByLabelText(/Nom \(français\)/);

    expect(screen.getByRole("button", { name: "Créer la salle et continuer" })).toBeDisabled();
    expect(
      screen.getByText(/ces cinq informations sont nécessaires pour que la salle existe/)
    ).toBeInTheDocument();
    expect(venues.create).not.toHaveBeenCalled();
  });
  it("CITY_NOT_FOUND → message porté par le champ Commune", async () => {
    const venues = makeVenues({
      create: vi.fn().mockRejectedValue(new ApiError(400, "CITY_NOT_FOUND", "venue.errors.cityNotFound"))
    });
    renderCreate(venues);
    await fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));

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
    expect(screen.getByRole("button", { name: "Créer la salle et continuer" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    // ⚠ Le retry ne suffit PLUS à réactiver le bouton, et c'est voulu : depuis
    // UIP-C la validité de l'étape est évaluée en continu, pas au clic. Les
    // communes revenues, il reste les cinq champs à remplir. On mesure donc les
    // deux choses séparément — le rechargement a bien eu lieu, ET le bouton
    // s'active une fois l'étape réellement valide.
    await waitFor(() => expect(listWilayas).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Créer la salle et continuer" })).toBeDisabled();

    await fillRequired();
    await waitFor(() => expect(screen.getByRole("button", { name: "Créer la salle et continuer" })).toBeEnabled());
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

  it("⚠ aucune modification : on AVANCE sans PATCH — l'avertissement a disparu (UIP-C)", async () => {
    // ⚠ CHANGEMENT DE COMPORTEMENT ASSUMÉ. Sur une page unique, « Aucune
    // modification à enregistrer » répondait à un clic sur « Enregistrer ». Dans
    // un assistant, traverser une étape sans rien y toucher est le cas NORMAL :
    // avertir à chaque « Suivant » apprendrait à ne plus lire les messages.
    // Ce qui NE change pas : aucun PATCH, un corps vide serait un 400.
    const venues = makeVenues();
    renderEdit(venues);
    await screen.findByDisplayValue("Salle El Ryad");

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await screen.findByRole("heading", { name: "Emplacement", level: 2 });
    expect(venues.update).not.toHaveBeenCalled();
    expect(screen.queryByText("Aucune modification à enregistrer.")).not.toBeInTheDocument();
  });

  it("diff RÉEL : seul le champ modifié est envoyé (et le slug reste en lecture seule)", async () => {
    const venues = makeVenues();
    renderEdit(venues);

    expect(await screen.findByDisplayValue("salle-el-ryad")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { capacityMax: 500 }));
  });

  it("équipements : remplacement d'ENSEMBLE complet, jamais un delta", async () => {
    const venues = makeVenues();
    // Étape 3 — équipements et styles ont quitté l'écran unique.
    renderEdit(venues, makeReferentials(), 3);

    const wifi = await screen.findByRole("checkbox", { name: "Wifi" });
    fireEvent.click(wifi);
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { amenityIds: [AMENITY_ID] }));
  });

  it("A13c — styles : remplacement d'ENSEMBLE, comme les équipements (D65)", async () => {
    const venues = makeVenues();
    // Étape 3 — équipements et styles ont quitté l'écran unique.
    renderEdit(venues, makeReferentials(), 3);

    fireEvent.click(await screen.findByRole("checkbox", { name: "Jardin" }));
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { styleIds: [STYLE_JARDIN] }));
  });

  it("A13c — le type de mariage part tel quel quand le pro le déclare (D66)", async () => {
    const venues = makeVenues();
    // Étape 3 — équipements et styles ont quitté l'écran unique.
    renderEdit(venues, makeReferentials(), 3);

    fireEvent.change(await screen.findByLabelText("Type de mariage"), { target: { value: "OUTDOOR" } });
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { ceremonyType: "OUTDOOR" }));
  });

  it("A13c — EFFACER le type envoie `null`, jamais rien : omettre voudrait dire « ne change pas »", async () => {
    const venues = makeVenueClientDouble(
      { ...VENUE, ceremonyType: "MIXED" },
      { update: vi.fn().mockResolvedValue(VENUE) }
    );
    // UIP-C — cette section vit à l'étape 3 de l'assistant.
    renderEdit(venues, makeReferentials(), 3);

    const select = await screen.findByLabelText("Type de mariage");
    expect(select).toHaveValue("MIXED");
    fireEvent.change(select, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { ceremonyType: null }));
  });

  it("A13c — « Non précisé » existe : D66 rend la colonne nullable pour que le non-dit reste distinct d'« Intérieur »", async () => {
    // UIP-C — cette section vit à l'étape 3 de l'assistant.
    renderEdit(makeVenues(), makeReferentials(), 3);
    const select = await screen.findByLabelText("Type de mariage");

    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "Non précisé" })).toBeInTheDocument();
  });

  it("AMENITY_NOT_FOUND → message porté par la section Équipements", async () => {
    const venues = makeVenues({
      update: vi.fn().mockRejectedValue(new ApiError(400, "AMENITY_NOT_FOUND", "venue.errors.amenityNotFound"))
    });
    // UIP-C — cette section vit à l'étape 3 de l'assistant.
    renderEdit(venues, makeReferentials(), 3);

    fireEvent.click(await screen.findByRole("checkbox", { name: "Wifi" }));
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    expect(await screen.findByText("Un des équipements sélectionnés est introuvable.")).toBeInTheDocument();
  });

  it("statut D33 dans le formulaire : même contrôle à 3 entrées, enregistré par le diff", async () => {
    const venues = makeVenues();
    // UIP-C — cette section vit à l'étape 7 de l'assistant.
    renderEdit(venues, makeReferentials(), 7);

    const select = await screen.findByLabelText("Visibilité");
    fireEvent.change(select, { target: { value: "TEMPORARILY_UNAVAILABLE" } });
    // Dernière étape : le bouton s'appelle « Enregistrer », pas « Suivant » —
    // il n'y a plus rien après.
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { status: "TEMPORARILY_UNAVAILABLE" }));
  });

  // A6a-P — INVERSE du test précédent (« AUCUNE photo rendue »), périmé par la
  // livraison du volet photos et remplacé ici. Le comportement du volet est
  // couvert par `photos-section.test.tsx` ; ce test-ci ne vérifie que la
  // COUTURE : le `photos` du DTO n'est plus ignoré par l'écran d'édition.
  it("le champ `photos` du DTO est rendu : la vignette de couverture apparaît", async () => {
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
    // UIP-C — le volet photos vit à l'étape 6 de l'assistant.
    const { container } = renderEdit(venues, makeReferentials(), 6);
    // ⚠ L'ancre ne peut plus être le champ « nom » : il est à l'étape 1.
    await screen.findByRole("heading", { name: "Photos et visite virtuelle", level: 2 });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://cdn.test/p1-thumb.webp");
    // Anti-CLS : le ratio du LARGE est posé en attributs sur la vignette.
    expect(img).toHaveAttribute("width", "1920");
    expect(img).toHaveAttribute("height", "1080");
    expect(screen.getByText("Couverture")).toBeInTheDocument();
  });

  // ── D45 — section visite virtuelle ─────────────────────────────────────────

  it("saisie d'une URL de partage : le corps porte la SAISIE BRUTE, l'écran affiche l'ID canonique", async () => {
    const venues = makeVenues({
      updateVirtualTour: vi.fn().mockResolvedValue({ matterportModelId: "SxQL3iGyoDo" })
    });
    // UIP-C — cette section vit à l'étape 6 de l'assistant.
    renderEdit(venues, makeReferentials(), 6);

    const champ = await screen.findByLabelText("Lien Matterport");
    fireEvent.change(champ, { target: { value: "https://my.matterport.com/show/?m=SxQL3iGyoDo" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer la visite" }));

    await waitFor(() =>
      expect(venues.updateVirtualTour).toHaveBeenCalledWith("v1", {
        matterportInput: "https://my.matterport.com/show/?m=SxQL3iGyoDo"
      })
    );
    // Le champ se recale sur la valeur CANONIQUE renvoyée par le serveur.
    await screen.findByDisplayValue("SxQL3iGyoDo");
    await screen.findByText("Visite virtuelle enregistrée.");
  });

  it("format invalide au blur : message inline, AUCUN appel API tant qu'on n'enregistre pas", async () => {
    const venues = makeVenues();
    // UIP-C — cette section vit à l'étape 6 de l'assistant.
    renderEdit(venues, makeReferentials(), 6);

    const champ = await screen.findByLabelText("Lien Matterport");
    fireEvent.change(champ, { target: { value: "https://exemple.dz/show/?m=SxQL3iGyoDo" } });
    fireEvent.blur(champ);

    await screen.findByText(/Lien Matterport non reconnu/);
    expect(venues.updateVirtualTour).not.toHaveBeenCalled();
  });

  it("salle SANS visite : ni bouton de retrait, ni lien externe (rien à retirer)", async () => {
    // UIP-C — cette section vit à l'étape 6 de l'assistant.
    renderEdit(makeVenues(), makeReferentials(), 6);
    await screen.findByLabelText("Lien Matterport");
    expect(screen.queryByRole("button", { name: "Retirer la visite" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ouvrir la visite dans un nouvel onglet" })).not.toBeInTheDocument();
  });

  it("« Retirer la visite » envoie une chaîne vide ; le lien externe est RECONSTRUIT depuis l'ID", async () => {
    const avecVisite = makeVenues({
      getMine: vi.fn().mockResolvedValue({ ...VENUE, matterportModelId: "SxQL3iGyoDo" }),
      updateVirtualTour: vi.fn().mockResolvedValue({ matterportModelId: null })
    });
    // UIP-C — cette section vit à l'étape 6 de l'assistant.
    renderEdit(avecVisite, makeReferentials(), 6);

    const lien = await screen.findByRole("link", { name: "Ouvrir la visite dans un nouvel onglet" });
    // L'URL est RECONSTRUITE par nous depuis l'ID, jamais la saisie du pro.
    expect(lien).toHaveAttribute("href", "https://my.matterport.com/show/?m=SxQL3iGyoDo");
    expect(lien).toHaveAttribute("rel", expect.stringContaining("noopener"));

    fireEvent.click(screen.getByRole("button", { name: "Retirer la visite" }));
    await waitFor(() => expect(avecVisite.updateVirtualTour).toHaveBeenCalledWith("v1", { matterportInput: "" }));
    await screen.findByText("Visite virtuelle retirée.");
  });

  it("409 MATTERPORT_ALREADY_LINKED : message métier traduit, pas l'erreur générique", async () => {
    const venues = makeVenues({
      updateVirtualTour: vi
        .fn()
        .mockRejectedValue(new ApiError(409, "MATTERPORT_ALREADY_LINKED", "venue.errors.matterportAlreadyLinked"))
    });
    // UIP-C — cette section vit à l'étape 6 de l'assistant.
    renderEdit(venues, makeReferentials(), 6);

    fireEvent.change(await screen.findByLabelText("Lien Matterport"), { target: { value: "SxQL3iGyoDo" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer la visite" }));

    await screen.findByText("Cette visite virtuelle est déjà rattachée à une autre salle.");
  });
});

describe("Constructeurs de payload (unitaire, hors rendu)", () => {
  it("création : les textes optionnels vides sont OMIS, jamais envoyés en chaîne vide", () => {
    const values = { ...emptyVenueForm(), cityId: CITY_ID, nameFr: "Salle", nameAr: "قاعة", capacityMax: "20", basePrice: "1000" };
    const built = buildCreateInput(values);

    expect(built.errors).toBeNull();
    expect(built.data).not.toHaveProperty("taglineFr");
    expect(built.data).not.toHaveProperty("address");
  });

  it("création : lat sans lng → erreur de PAIRE, pas d'envoi mutilé", () => {
    const values = { ...emptyVenueForm(), cityId: CITY_ID, nameFr: "Salle", nameAr: "قاعة", capacityMax: "20", basePrice: "1000", lat: "36.7" };
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
    expect(screen.getByLabelText("Prix de base")).toHaveValue("150\u00A0000");
    // unité affichée à côté du champ, purement décorative
    expect(screen.getByText("DA")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));

    await waitFor(() => expect(venues.create).toHaveBeenCalled());
    const payload = vi.mocked(venues.create).mock.calls[0]?.[0] as { basePriceCents?: number } | undefined;
    expect(payload?.basePriceCents).toBe(15_000_000);
  });

  it("D43 — l'unité a quitté le LIBELLÉ : une description masquée la porte, et aucun id décrit n'est orphelin", async () => {
    // Retirer « (DA) » du libellé supprimerait la seule mention de l'unité
    // perçue par un lecteur d'écran ; supprimer l'aide visible laisserait un
    // `aria-describedby` pointant dans le vide. Les deux sont testés ici.
    renderCreate(makeVenues());
    await fillRequired("150000");

    const input = screen.getByLabelText("Prix de base");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id !== "");

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => document.getElementById(id) !== null)).toBe(true);
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain(
      "Montant en dinars algériens, nombre entier"
    );
  });
});

// ── Lot UI-P1 — sortie de page ─────────────────────────────────────────────
// Le lien discret du haut se lisait comme une phrase, pas comme une commande,
// et l'écran ne proposait AUCUNE sortie visible une fois le formulaire rempli.
describe("Sortie de page (Lot UI-P1)", () => {
  it("édition : le retour du haut porte une flèche, et un vrai bouton de retour clôt la page", async () => {
    const { container } = renderEdit(makeVenues());
    await screen.findByDisplayValue("Salle El Ryad");

    const discret = container.querySelector("a.backlink");
    expect(discret).not.toBeNull();
    // La flèche : dessinée vers l'inline-start, retournée en RTL par la CSS
    // via cet attribut — sans lui, « revenir » pointerait à gauche en arabe.
    expect(discret?.querySelector("svg[data-mirror-rtl]")).not.toBeNull();

    // Le bouton de sortie est un `.btn` (niveau secondaire visible), pas un
    // `.backlink`, et il vit APRÈS le formulaire : l'écran d'édition ne
    // s'arrête pas au submit (photos et visite virtuelle suivent).
    const sortie = screen.getAllByRole("link", { name: /Retour à mes salles/ }).find((a) => a.classList.contains("btn"));
    expect(sortie).toBeDefined();
    expect(sortie).toHaveAttribute("href", "/salles");
    // ⚠ Plus de `<form>` sur cet écran (UIP-C) : les étapes 4 à 7 montent des
    // sections qui ont leurs propres submits. L'invariant reste le même, exprimé
    // sur l'assistant : la sortie de page vit EN DEHORS de lui.
    const assistant = container.querySelector(".wizard");
    expect(assistant).not.toBeNull();
    expect(assistant?.contains(sortie as Node)).toBe(false);
  });

  it("création : le bouton de retour est à côté de l'action principale", async () => {
    renderCreate(makeVenues());
    await screen.findByLabelText(/Nom \(français\)/);

    const sortie = screen.getAllByRole("link", { name: /Retour à mes salles/ }).find((a) => a.classList.contains("btn"));
    expect(sortie).toBeDefined();
    expect(sortie).toHaveAttribute("href", "/salles");
    expect(sortie?.querySelector("svg[data-mirror-rtl]")).not.toBeNull();
  });
});
