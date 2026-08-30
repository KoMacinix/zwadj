// Assistant de salle — Lot UIP-C.
//
// ⚠ CE QUE CES TESTS MESURENT, ET CE QU'ILS REFUSENT DE MESURER.
// Un assistant est facile à tester de travers : monter l'écran, voir sept titres,
// se déclarer satisfait. Ce serait vert avec un assistant dont « Suivant » ne
// fait rien. Les cas ci-dessous portent donc sur les quatre décisions du lot :
//   - la salle NAÎT à la fin de l'étape 1, avec les cinq champs du contrat ;
//   - l'étape vit dans l'URL, pas dans un état local ;
//   - « Suivant » est inactif quand l'étape est invalide, ET la raison s'affiche ;
//   - un champ REMPLI mais invalide montre son message sans attendre un clic.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { VenueProDTO, WilayaDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import {
  makeAuthDouble,
  makeReferentialsDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";
import { CreateVenuePage } from "./create-venue-page";
import { EditVenuePage } from "./edit-venue-page";

initI18n();

const CITY_ID = "11111111-1111-4111-8111-111111111111";
// ⚠ `code` est un NOMBRE dans `WilayaDTO` — relevé du type, pas supposé d'après
// « 16 » qui s'écrit avec des chiffres. Le typecheck l'a attrapé ; un `as` l'aurait
// masqué et la mock aurait triché sur la forme, ce que la doctrine des données de
// démonstration interdit précisément.
const WILAYAS: WilayaDTO[] = [
  {
    id: "w16",
    nameFr: "Alger",
    nameAr: "الجزائر",
    code: 16,
    cities: [{ id: CITY_ID, nameFr: "Alger-Centre", nameAr: "الجزائر الوسطى", lat: 36.7538, lng: 3.0588 }]
  }
];

const VENUE = {
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
  status: "ACTIVE",
  publicationStatus: "PUBLISHED",
  amenityIds: [],
  styleIds: [],
  ceremonyType: null,
  photos: [],
  slotTemplates: [],
  matterportModelId: null
} as unknown as VenueProDTO;

/** Sonde d'URL : c'est le seul moyen de prouver que l'étape voyage bien dans la
 *  barre d'adresse et pas dans un `useState` invisible. */
function UrlProbe() {
  const location = useLocation();
  return <p data-testid="url">{`${location.pathname}${location.search}`}</p>;
}

function renderCreate(venues = makeVenueClientDouble()) {
  render(
    <MemoryRouter initialEntries={["/salles/nouvelle"]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={venues}
        referentials={makeReferentialsDouble(WILAYAS)}
      >
        <UrlProbe />
        <Routes>
          <Route path="/salles/nouvelle" element={<CreateVenuePage />} />
          <Route path="/salles/:id" element={<EditVenuePage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
  return venues;
}

function renderEdit(etape = 1) {
  render(
    <MemoryRouter initialEntries={[`/salles/v1?etape=${etape}`]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={makeVenueClientDouble(VENUE)}
        referentials={makeReferentialsDouble(WILAYAS)}
      >
        <UrlProbe />
        <Routes>
          <Route path="/salles/:id" element={<EditVenuePage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
}

async function fillEssentiel(price = "150000") {
  fireEvent.change(await screen.findByLabelText("Nom (français)"), { target: { value: "Salle El Ryad" } });
  fireEvent.change(screen.getByLabelText("Nom (arabe)"), { target: { value: "قاعة الرياض" } });
  fireEvent.change(screen.getByLabelText("Commune"), { target: { value: CITY_ID } });
  fireEvent.change(screen.getByLabelText("Capacité maximale"), { target: { value: "400" } });
  fireEvent.change(screen.getByLabelText("Prix de base"), { target: { value: price } });
}

describe("Assistant — l'étape 1 est CRÉATRICE (décision (a))", () => {
  it("les cinq champs du contrat de création, et rien d'autre, sont demandés à l'étape 1", async () => {
    renderCreate();
    await screen.findByLabelText("Nom (français)");

    // ⚠ Ces cinq-là parce que `venueCreateSchema` les EXIGE. C'est le seul motif
    // du découpage : sans eux réunis, `POST /venues` ne peut pas aboutir, et la
    // salle ne peut donc pas naître à la fin de l'étape 1.
    for (const champ of ["Nom (arabe)", "Commune", "Capacité maximale", "Prix de base"]) {
      expect(screen.getByLabelText(champ)).toBeInTheDocument();
    }
    // Ce qui a été REPOUSSÉ, faute d'id : équipements, photos, créneaux.
    expect(screen.queryByRole("checkbox", { name: "Wifi" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Lien Matterport")).not.toBeInTheDocument();
  });

  it("⚠ au succès, la salle EXISTE et l'assistant reprend à l'ÉTAPE 2 dans l'URL", async () => {
    const venues = makeVenueClientDouble(VENUE, {
      create: vi.fn().mockResolvedValue({ ...VENUE, id: "v9" })
    });
    renderCreate(venues);
    await fillEssentiel();

    fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));

    // L'écart mesuré : l'URL porte `?etape=2`. Sans elle, le pro retomberait sur
    // l'étape 1 d'une salle qu'il vient de créer.
    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("/salles/v9?etape=2"));
    expect(vi.mocked(venues.create)).toHaveBeenCalledTimes(1);
  });

  it("un seul appel : jamais POST puis PATCH dans le même geste", async () => {
    const venues = makeVenueClientDouble(VENUE, {
      create: vi.fn().mockResolvedValue({ ...VENUE, id: "v9" }),
      update: vi.fn()
    });
    renderCreate(venues);
    await fillEssentiel();
    fireEvent.click(screen.getByRole("button", { name: "Créer la salle et continuer" }));

    await waitFor(() => expect(vi.mocked(venues.create)).toHaveBeenCalled());
    // Un enchaînement POST+PATCH fabriquerait un échec partiel : salle créée,
    // reste perdu, sans contrepartie.
    expect(vi.mocked(venues.update)).not.toHaveBeenCalled();
  });
});

describe("Assistant — « Suivant » et la raison de son inactivité", () => {
  it("étape invalide : bouton inactif ET ce qui manque est écrit", async () => {
    renderCreate();
    await screen.findByLabelText("Nom (français)");

    expect(screen.getByRole("button", { name: "Créer la salle et continuer" })).toBeDisabled();
    // ⚠ Le patron A8 appliqué à la progression : un bouton grisé sans phrase
    // oblige à deviner quel champ fâche.
    expect(screen.getByText(/ces cinq informations sont nécessaires/)).toBeInTheDocument();
  });

  it("⚠ un champ REMPLI mais invalide montre son message SANS attendre un clic", async () => {
    // Défaut trouvé en exécutant ce lot : « Suivant » désactivé supprimait du
    // même coup l'affichage des messages, qui n'apparaissaient qu'au submit. Un
    // prix « 150000.5 » laissait le bouton grisé sans dire pourquoi.
    renderCreate();
    await fillEssentiel("150000.5");

    expect(await screen.findByText("Le prix de base doit être un nombre entier de centimes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer la salle et continuer" })).toBeDisabled();
  });

  it("un requis encore VIERGE n'est pas accusé : pas de message, juste le bouton grisé", async () => {
    renderCreate();
    await screen.findByLabelText("Nom (français)");

    // L'écart avec le cas précédent : afficher « le nom est requis » sur un
    // formulaire qu'on vient d'ouvrir reproche à l'utilisateur de n'avoir pas
    // encore tapé.
    expect(screen.queryByText("Le nom en français est requis.")).not.toBeInTheDocument();
  });
});

describe("Assistant — à l'édition, tout est ouvert", () => {
  it("l'étape vient de l'URL, pas d'un état local", async () => {
    renderEdit(5);
    // ⚠ « Prestations » apparaît DEUX fois au niveau 2 : le titre de l'étape, et
    // celui de la section de catalogue qu'elle monte. On mesure donc le compteur
    // d'étape, seul repère non ambigu — et le seul qui prouve que l'URL a été lue.
    expect(await screen.findByText("Étape 5 sur 7")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Prestations", level: 2 }).length).toBeGreaterThan(0);
  });

  it("une salle existante ouvre les SEPT étapes : corriger une photo ne demande pas six « Suivant »", async () => {
    renderEdit(1);
    await screen.findByDisplayValue("Salle El Ryad");

    const barre = screen.getByRole("navigation", { name: "Étapes de configuration de la salle" });
    const ouvertes = Array.from(barre.querySelectorAll("button")).filter((b) => !b.disabled);
    // Six actives : la septième est l'étape courante, désactivée parce qu'on y est.
    expect(ouvertes).toHaveLength(6);
  });

  it("⚠ vider un champ requis REFERME les étapes suivantes", async () => {
    renderEdit(1);
    fireEvent.change(await screen.findByDisplayValue("Salle El Ryad"), { target: { value: "" } });

    const barre = screen.getByRole("navigation", { name: "Étapes de configuration de la salle" });
    const ouvertes = Array.from(barre.querySelectorAll("button")).filter((b) => !b.disabled);
    // Aucune : avancer sur une salle dont on vient d'effacer le nom produirait
    // des PATCH voués au 400.
    expect(ouvertes).toHaveLength(0);
  });

  it("l'étape courante porte aria-current=step — l'état n'est pas qu'une couleur", async () => {
    renderEdit(3);
    const barre = await screen.findByRole("navigation", { name: "Étapes de configuration de la salle" });
    const courante = Array.from(barre.querySelectorAll("button")).filter(
      (b) => b.getAttribute("aria-current") === "step"
    );
    expect(courante).toHaveLength(1);
    expect(courante[0]).toHaveTextContent("Présentation");
  });
});
