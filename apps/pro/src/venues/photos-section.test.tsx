// Tests du volet PHOTOS de l'écran d'édition Pro (Lot A6a-P). Les pièges de ce
// lot, un par un :
//  - la pré-validation de confort doit refuser SANS aucun appel réseau ;
//  - le plafond se compte AVANT de démarrer la file, pas au 25ᵉ fichier ;
//  - la file est SÉQUENTIELLE et un échec unitaire ne l'arrête pas ;
//  - le réordonnancement est SÉRIALISÉ : pendant qu'un PATCH est en vol, TOUTES
//    les flèches de TOUTES les photos sont `disabled` (test à promesse
//    différée ci-dessous) et l'ordre affiché ne bouge qu'au retour serveur ;
//  - un échec d'ordre se répare par REFETCH, jamais par un rollback local ;
//  - la suppression (204 sans corps) force un refetch : la couverture est
//    re-résolue depuis l'état rechargé, jamais décalée à la main ;
//  - l'alt envoie TOUJOURS ses deux champs, et une chaîne vide part en `null`.
//
// Le client venue s'injecte par `AppProviders` (`VenueProvider` seul lèverait :
// il consomme `useAuth`). `@testing-library/user-event` n'est PAS une
// dépendance du dépôt : `fireEvent`, comme les six suites pro existantes.
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import type { ReferentialsClient, VenueProClient } from "@zwadj/api-client";
import { ApiError } from "@zwadj/api-client";
import type { AmenityDTO, VenuePhotoDTO, VenueProDTO, WilayaDTO } from "@zwadj/types";
import type { AuthClient } from "../lib/auth-client";
import { makeVenueClientDouble } from "../test-support/client-doubles";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { EditVenuePage } from "./edit-venue-page";

initI18n();

const PRO_USER = {
  id: "u1",
  email: "contact@salle.dz",
  role: "PRO" as const,
  locale: "fr" as const,
  emailVerified: true,
  firstName: null,
  lastName: null,
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null }
};

const CITY_ID = "6f1c0d2e-2b3a-4c5d-8e9f-0a1b2c3d4e5f";

const WILAYAS: WilayaDTO[] = [
  {
    id: "w16",
    code: 16,
    nameFr: "Alger",
    nameAr: "الجزائر",
    cities: [{ id: CITY_ID, nameFr: "Bab Ezzouar", nameAr: "باب الزوار", lat: null, lng: null }]
  }
];
const AMENITIES: AmenityDTO[] = [
  { id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" }
];

function photo(n: number, over: Partial<VenuePhotoDTO> = {}): VenuePhotoDTO {
  return {
    id: `p${n}`,
    url: `https://cdn.test/p${n}.webp`,
    thumbUrl: `https://cdn.test/p${n}-thumb.webp`,
    width: 1920,
    height: 1080,
    sortOrder: n - 1,
    altFr: null,
    altAr: null,
    createdAt: "2026-01-05T10:00:00.000Z",
    ...over
  };
}

function venueWith(photos: VenuePhotoDTO[]): VenueProDTO {
  return {
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
    publicationStatus: "DRAFT",
    status: "ACTIVE",
    amenityIds: [],
    styleIds: [],
    ceremonyType: null,
    photos,
    slotTemplates: [],
    matterportModelId: null,
    createdAt: "2026-01-05T10:00:00.000Z",
    updatedAt: "2026-01-06T10:00:00.000Z"
  };
}

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

function makeVenues(photos: VenuePhotoDTO[], overrides: Partial<VenueProClient> = {}): VenueProClient {
  return makeVenueClientDouble(venueWith(photos), overrides);
}

function makeReferentials(): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue(WILAYAS),
    listAmenities: vi.fn().mockResolvedValue(AMENITIES)
  };
}

function renderEdit(venues: VenueProClient) {
  return render(
    <MemoryRouter initialEntries={["/salles/v1"]}>
      <AppProviders client={makeAuth()} venues={venues} referentials={makeReferentials()}>
        <Routes>
          <Route path="/salles/:id" element={<EditVenuePage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
}

/** Attend que la page soit chargée (le volet est monté avec elle). */
async function ready() {
  await screen.findByDisplayValue("Salle El Ryad");
}

const fileInput = () => screen.getByLabelText("Fichiers image à envoyer");
const image = (name: string) => new File(["binaire"], name, { type: "image/jpeg" });
/** Un `<img alt="">` (alt pas encore saisi) est PRÉSENTATIONNEL : il n'a pas
 *  le rôle « img ». On lit donc le DOM de la galerie, scopée par son nom. */
const gallery = () => screen.getByRole("list", { name: "Photos" });
const tiles = () => within(gallery()).getAllByRole("listitem");
const thumbs = () => Array.from(gallery().querySelectorAll("img")).map((img) => img.getAttribute("src"));

describe("Volet photos — upload", () => {
  it("ajout : la photo retournée par le serveur apparaît EN FIN de galerie", async () => {
    const venues = makeVenues([photo(1)], { addPhoto: vi.fn().mockResolvedValue(photo(2)) });
    renderEdit(venues);
    await ready();

    fireEvent.change(fileInput(), { target: { files: [image("b.jpg")] } });

    await waitFor(() => expect(venues.addPhoto).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(thumbs()).toEqual(["https://cdn.test/p1-thumb.webp", "https://cdn.test/p2-thumb.webp"]));
    // La couverture reste la PREMIÈRE par sortOrder : un ajout ne la vole pas.
    expect(screen.getByText("Couverture")).toBeInTheDocument();
  });

  it("file SÉQUENTIELLE : un échec unitaire n'arrête pas la file, les réussies restent", async () => {
    const addPhoto = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(400, "MEDIA_TOO_SMALL", "media.errors.tooSmall"))
      .mockResolvedValueOnce(photo(3));
    const venues = makeVenues([photo(1)], { addPhoto });
    renderEdit(venues);
    await ready();

    fireEvent.change(fileInput(), { target: { files: [image("petite.jpg"), image("bonne.jpg")] } });

    await waitFor(() => expect(addPhoto).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/petite\.jpg/)).toHaveTextContent("L'image est trop petite.");
    await waitFor(() => expect(thumbs()).toEqual(["https://cdn.test/p1-thumb.webp", "https://cdn.test/p3-thumb.webp"]));
  });

  it("pré-validation TYPE : refus immédiat, AUCUN appel réseau", async () => {
    const venues = makeVenues([]);
    renderEdit(venues);
    await ready();

    fireEvent.change(fileInput(), {
      target: { files: [new File(["%PDF"], "contrat.pdf", { type: "application/pdf" })] }
    });

    expect(await screen.findByText(/contrat\.pdf/)).toHaveTextContent(
      "Format d'image non pris en charge (JPEG, PNG ou WebP)."
    );
    expect(venues.addPhoto).not.toHaveBeenCalled();
  });

  it("pré-validation TAILLE : refus immédiat au-delà de 10 Mo, AUCUN appel réseau", async () => {
    const venues = makeVenues([]);
    renderEdit(venues);
    await ready();

    const gros = new File([new Uint8Array(11 * 1024 * 1024)], "enorme.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput(), { target: { files: [gros] } });

    expect(await screen.findByText(/enorme\.jpg/)).toHaveTextContent("Le fichier est trop volumineux.");
    expect(venues.addPhoto).not.toHaveBeenCalled();
  });

  it("excédent : refusé AVANT de démarrer la file, avec le nombre de places restantes", async () => {
    // 28 photos déjà en base, plafond 30 : deux places, trois fichiers.
    const venues = makeVenues(Array.from({ length: 28 }, (_, i) => photo(i + 1)));
    renderEdit(venues);
    await ready();

    fireEvent.change(fileInput(), { target: { files: [image("a.jpg"), image("b.jpg"), image("c.jpg")] } });

    expect(await screen.findByText(/Trop de fichiers sélectionnés/)).toHaveTextContent("Places restantes : 2");
    // Le point du test : PAS UN SEUL appel, pas même pour les deux premiers.
    expect(venues.addPhoto).not.toHaveBeenCalled();
  });

  it("plafond atteint : l'entrée de fichiers est désactivée et le message le dit", async () => {
    const venues = makeVenues(Array.from({ length: 30 }, (_, i) => photo(i + 1)));
    renderEdit(venues);
    await ready();

    expect(fileInput()).toBeDisabled();
    expect(screen.getByText("Plafond de photos atteint pour cette salle.")).toBeInTheDocument();
  });

  it("MEDIA_PHOTO_LIMIT_REACHED renvoyé par le serveur : traduit, pas de code brut", async () => {
    const venues = makeVenues([photo(1)], {
      addPhoto: vi.fn().mockRejectedValue(new ApiError(400, "MEDIA_PHOTO_LIMIT_REACHED", "media.errors.photoLimitReached"))
    });
    renderEdit(venues);
    await ready();

    fireEvent.change(fileInput(), { target: { files: [image("b.jpg")] } });

    expect(await screen.findByText(/b\.jpg/)).toHaveTextContent("Nombre maximal de photos atteint pour cette salle.");
  });
});

describe("Volet photos — réordonnancement SÉRIALISÉ", () => {
  it("pendant le PATCH en vol, TOUTES les flèches sont disabled ; l'ordre ne change qu'au retour serveur", async () => {
    // Promesse DIFFÉRÉE : c'est elle qui rend la fenêtre « en vol »
    // observable. Sans elle, le test ne prouverait que l'absence de plantage.
    let resolveReorder: (photos: VenuePhotoDTO[]) => void = () => {};
    const enVol = new Promise<VenuePhotoDTO[]>((resolve) => {
      resolveReorder = resolve;
    });
    const reorderPhotos = vi.fn().mockReturnValue(enVol);
    const venues = makeVenues([photo(1), photo(2), photo(3)], { reorderPhotos });
    renderEdit(venues);
    await ready();

    const arrows = () => [
      ...screen.getAllByRole("button", { name: "Avancer dans l'ordre" }),
      ...screen.getAllByRole("button", { name: "Reculer dans l'ordre" })
    ];

    // Avant : les flèches utiles sont actives (seules les extrémités ne le
    // sont pas, par position).
    expect(arrows().filter((b) => !(b as HTMLButtonElement).disabled).length).toBeGreaterThan(0);

    // « Avancer » sur la 3ᵉ photo → l'ensemble complet part, dans le nouvel ordre.
    fireEvent.click(screen.getAllByRole("button", { name: "Avancer dans l'ordre" })[2] as HTMLElement);
    expect(reorderPhotos).toHaveBeenCalledWith("v1", { photoIds: ["p1", "p3", "p2"] });

    // EN VOL : toutes les flèches, toutes photos confondues, sont disabled…
    for (const arrow of arrows()) expect(arrow).toBeDisabled();
    // …et l'ordre AFFICHÉ n'a pas bougé d'un pixel (aucun état optimiste).
    expect(thumbs()).toEqual([
      "https://cdn.test/p1-thumb.webp",
      "https://cdn.test/p2-thumb.webp",
      "https://cdn.test/p3-thumb.webp"
    ]);

    // Le serveur fait autorité : l'ordre affiché est CELUI QU'IL RENVOIE.
    await act(async () => {
      resolveReorder([photo(1), photo(3), photo(2)]);
    });

    await waitFor(() =>
      expect(thumbs()).toEqual([
        "https://cdn.test/p1-thumb.webp",
        "https://cdn.test/p3-thumb.webp",
        "https://cdn.test/p2-thumb.webp"
      ])
    );
    // Réactivées : une seule requête d'ordre à la fois, jamais deux en vol.
    expect(screen.getAllByRole("button", { name: "Reculer dans l'ordre" })[0]).not.toBeDisabled();
  });

  it("échec d'ordre : REFETCH + « rafraîchissez puis réessayez », jamais un rollback local", async () => {
    const getMine = vi
      .fn()
      .mockResolvedValueOnce(venueWith([photo(1), photo(2)]))
      // Vérité serveur au refetch : l'ordre local supposé n'a jamais existé.
      .mockResolvedValueOnce(venueWith([photo(2), photo(1)]));
    const venues = makeVenues([], {
      getMine,
      reorderPhotos: vi.fn().mockRejectedValue(new ApiError(400, "PHOTO_ORDER_MISMATCH", "venue.errors.photoOrderMismatch"))
    });
    renderEdit(venues);
    await ready();

    fireEvent.click(screen.getAllByRole("button", { name: "Reculer dans l'ordre" })[0] as HTMLElement);

    expect(
      await screen.findByText("L'ordre n'a pas pu être enregistré — rafraîchissez la page puis réessayez.")
    ).toBeInTheDocument();
    // Deux appels : le chargement de la page, puis le refetch de la section.
    await waitFor(() => expect(getMine).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(thumbs()).toEqual(["https://cdn.test/p2-thumb.webp", "https://cdn.test/p1-thumb.webp"]));
  });
});

describe("Volet photos — alt FR/AR", () => {
  it("les DEUX champs partent toujours, et un champ vidé part en `null` (jamais en chaîne vide)", async () => {
    const updatePhotoAlt = vi.fn().mockResolvedValue(photo(1, { altFr: "Vue de la salle", altAr: null }));
    const venues = makeVenues([photo(1, { altFr: null, altAr: "قاعة" })], { updatePhotoAlt });
    renderEdit(venues);
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "Texte alternatif" }));
    fireEvent.change(screen.getByLabelText("Texte alternatif (français)"), {
      target: { value: "  Vue de la salle  " }
    });
    // L'arabe est VIDÉ : effacement explicite.
    fireEvent.change(screen.getByLabelText("Texte alternatif (arabe)"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le texte alternatif" }));

    await waitFor(() =>
      expect(updatePhotoAlt).toHaveBeenCalledWith("v1", "p1", { altFr: "Vue de la salle", altAr: null })
    );
    expect(await screen.findByText("Texte alternatif enregistré.")).toBeInTheDocument();
    // Remplacement EN PLACE depuis la réponse serveur.
    expect(within(gallery()).getByRole("img")).toHaveAttribute("alt", "Vue de la salle");
  });

  it("400 de validation : la clé arrive en `issues` et atterrit SUR LE CHAMP, pas en message générique", async () => {
    const updatePhotoAlt = vi.fn().mockRejectedValue(
      // Forme réelle de la pipe Zod : pas de `code`, `messageKey` n'est pas une
      // clé i18n — seules les `issues` portent la clé.
      new ApiError(400, "UNKNOWN", "Validation échouée", [
        { path: "altFr", message: "venue.validation.altTooLong" }
      ])
    );
    const venues = makeVenues([photo(1)], { updatePhotoAlt });
    renderEdit(venues);
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "Texte alternatif" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le texte alternatif" }));

    expect(
      await screen.findByText("Le texte alternatif est trop long (300 caractères maximum).")
    ).toBeInTheDocument();
  });
});

describe("Volet photos — suppression", () => {
  it("confirmée : 204 puis REFETCH, et la couverture est re-résolue depuis l'état rechargé", async () => {
    const getMine = vi
      .fn()
      .mockResolvedValueOnce(venueWith([photo(1), photo(2)]))
      .mockResolvedValueOnce(venueWith([photo(2)]));
    const venues = makeVenues([], { getMine });
    renderEdit(venues);
    await ready();

    // On supprime la COUVERTURE : aucun cas particulier, la suivante hérite.
    const premiere = tiles().find((li) => within(li).queryByText("Couverture"));
    fireEvent.click(within(premiere as HTMLElement).getByRole("button", { name: "Supprimer la photo" }));
    const dialogue = await screen.findByRole("dialog");
    fireEvent.click(within(dialogue).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(venues.deletePhoto).toHaveBeenCalledWith("v1", "p1"));
    // Le 204 ne renvoie rien : l'état vient du refetch, pas d'un retrait local.
    await waitFor(() => expect(getMine).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(thumbs()).toEqual(["https://cdn.test/p2-thumb.webp"]));
    const restante = tiles()[0] as HTMLElement;
    expect(within(restante).getByText("Couverture")).toBeInTheDocument();
  });

  it("annulée : aucun appel de suppression", async () => {
    const venues = makeVenues([photo(1)]);
    renderEdit(venues);
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer la photo" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Annuler" }));

    expect(venues.deletePhoto).not.toHaveBeenCalled();
  });
});

describe("Volet photos — galerie vide", () => {
  it("aucune photo : message explicite, pas une grille vide", async () => {
    renderEdit(makeVenues([]));
    await ready();
    expect(screen.getByText("Aucune photo pour le moment.")).toBeInTheDocument();
    expect(screen.getByText("Places restantes : 30")).toBeInTheDocument();
  });
});

describe("Volet photos — URL des médias (correctif A6a-P-①)", () => {
  it("une URL RELATIVE de l'adapter disque est préfixée par la base API, pas par l'origine de Vite", async () => {
    renderEdit(makeVenues([photo(1, { thumbUrl: "/api/v1/media/0198aaaa-thumb.webp" })]));
    await ready();
    // Sans ce préfixe, le navigateur allait chercher l'image sur :5173 → cassée.
    expect(thumbs()).toEqual(["http://localhost:3001/api/v1/media/0198aaaa-thumb.webp"]);
  });

  it("une URL ABSOLUE (adapter S3/CDN de prod) est laissée INTACTE, jamais concaténée", async () => {
    renderEdit(makeVenues([photo(1, { thumbUrl: "https://cdn.zwadj.dz/x-thumb.webp" })]));
    await ready();
    expect(thumbs()).toEqual(["https://cdn.zwadj.dz/x-thumb.webp"]);
  });
});
