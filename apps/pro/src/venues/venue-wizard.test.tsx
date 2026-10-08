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
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    // ⛔ Rang 33 (D326) : le stepper est le rail PARTAGÉ du parcours sur place, où l'étape courante n'est PAS un bouton — `aria-current="step"` est posé sur son `<li>`
    // (le test visait un bouton, parce que l'ancien assistant en faisait un, désactivé). Test déclaré à la table avant d'être retouché.
    const courante = Array.from(barre.querySelectorAll("li")).filter((li) => li.getAttribute("aria-current") === "step");
    expect(courante).toHaveLength(1);
    expect(courante[0]).toHaveTextContent("Présentation");
    expect(within(courante[0] as HTMLElement).queryByRole("button")).toBeNull();
  });
});

// ══ RANG 33 (D326) — LE STEPPER DE L'ASSISTANT EST CELUI DU PARCOURS SUR PLACE ═════════════════════════════════════════════════════════════════════════════════════
// Arbitrage de Ko du 05/10/2026 : « 1. 01L'essentiel : corrige-le maintenant [...] Le fil d'Ariane de l'assistant doit devenir un stepper visuellement cohérent avec celui du
// parcours client "sur place" du tableau de bord (réutiliser le même composant si possible) ». Le défaut a été CONSTATÉ dans un navigateur avant d'être corrigé
// (`docs/preuves/D326/navigateur/captures/avant/`) : `list-style-type: decimal` sur l'`<ol>`, « 01L'essentiel » collé. jsdom n'applique pas la feuille — ce qui se mesure ici est
// le BALISAGE (c'est le composant partagé) et la règle de feuille qui ôte la numérotation du navigateur (garde de SOURCE) ; l'affichage, lui, est dans la capture.
describe("Rang 33 — le stepper de l'assistant est le rail PARTAGÉ", () => {
  const STYLES = readFileSync(resolve(__dirname, "../../../../packages/ui/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const SOURCE = readFileSync(resolve(__dirname, "venue-wizard.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const barre = () => screen.getByRole("navigation", { name: "Étapes de configuration de la salle" });

  it("le rail porte son NOM ACCESSIBLE : « Étapes de configuration de la salle » (un lecteur d'écran annonce la liste avant ses entrées)", async () => {
    renderEdit(3);
    await screen.findByText("Étape 3 sur 7");
    const rail = screen.queryByRole("navigation", { name: "Étapes de configuration de la salle" });
    expect(rail, "le rail est une navigation nommée").not.toBeNull();
    expect(rail?.querySelectorAll("li")).toHaveLength(7);
  });

  it("⛔ S-b — c'est `JourneyRail` de `@zwadj/ui`, pas une seconde copie : la classe partagée est posée, et le fichier n'écrit plus de `<ol>` ni de « 01 »", async () => {
    renderEdit(3);
    await screen.findByText("Étape 3 sur 7");
    expect(barre().classList.contains("zj-rail")).toBe(true);
    expect(barre().classList.contains("wizard-rail")).toBe(true); // la mise en page propre au Pro
    expect(SOURCE).toMatch(/\bJourneyRail\b/);
    expect(/<ol\b/.test(SOURCE)).toBe(false);
    expect(/padStart/.test(SOURCE)).toBe(false);
  });

  it("⛔ S-a — plus de « 01 » doublé et collé au libellé : chaque entrée est une pastille (rang ou coche) et le TITRE seul, jamais « 0N »", async () => {
    renderEdit(3);
    await screen.findByText("Étape 3 sur 7");
    const entrees = Array.from(barre().querySelectorAll("li"));
    expect(entrees).toHaveLength(7);
    const titres = ["L'essentiel", "Emplacement", "Présentation", "Réservation", "Prestations", "Photos et visite virtuelle", "Publication"];
    entrees.forEach((li, i) => {
      expect(li.querySelector(".zj-rail-label")?.textContent, `entrée ${i + 1}`).toBe(titres[i]);
      expect(li.querySelector(".zj-rail-n")).not.toBeNull();
    });
    expect(barre().textContent).not.toMatch(/\b0\d/);
  });

  it("⛔ S-a (feuille) — la numérotation du NAVIGATEUR est ôtée par `.zj-rail ol { list-style: none }` : la règle existe dans la feuille partagée", () => {
    // C'est CETTE règle que le constat dans le navigateur (« list-style-type: decimal ») prouvait absente pour l'ancienne `<ol>`.
    const regle = /\.zj-rail ol\s*\{([^}]*)\}/.exec(STYLES);
    expect(regle).not.toBeNull();
    expect(regle?.[1]).toMatch(/list-style\s*:\s*none/);
  });

  it("les états sont ceux du rail partagé : avant la courante « franchie » (coche), la courante, après elle « à faire » — et toutes restent cliquables à l'édition", async () => {
    renderEdit(3);
    await screen.findByText("Étape 3 sur 7");
    const classes = Array.from(barre().querySelectorAll("li")).map((li) => li.className);
    expect(classes).toEqual(["is-done", "is-done", "is-current", "is-todo", "is-todo", "is-todo", "is-todo"]);
    // Ouvertes ET après la courante : cliquables (la salle existe, toutes les étapes sont franchissables) — mais jamais COCHÉES.
    const boutons = Array.from(barre().querySelectorAll("button"));
    expect(boutons).toHaveLength(6);
    expect(boutons.every((b) => !b.disabled)).toBe(true);
  });

  it("⚠ S-d — une étape non franchie n'est PAS un bouton : à la création il n'y a qu'une étape, la courante, et aucune commande dans le rail", async () => {
    renderCreate();
    await screen.findByLabelText("Nom (français)");
    expect(Array.from(barre().querySelectorAll("li")).map((li) => li.className)).toEqual(["is-current"]);
    expect(barre().querySelectorAll("button")).toHaveLength(0);
  });

  it("cliquer une étape du rail l'ouvre — l'étape vit dans l'URL (« ?etape=5 »), et le nom accessible du bouton est le TITRE de l'étape", async () => {
    renderEdit(1);
    await screen.findByText("Étape 1 sur 7");
    const cible = within(barre()).queryByRole("button", { name: "Prestations" });
    expect(cible, "le bouton de l'étape porte le TITRE de l'étape pour nom accessible").not.toBeNull();
    fireEvent.click(cible as HTMLElement);
    await waitFor(() => expect(screen.getByTestId("url").textContent).toContain("?etape=5"));
    expect(await screen.findByText("Étape 5 sur 7")).toBeInTheDocument();
  });

  it("le rail reste le PREMIER élément du DOM : on sait où l'on en est avant de lire le contenu (sa place à gauche est affaire de `grid-area`)", async () => {
    renderEdit(2);
    await screen.findByText("Étape 2 sur 7");
    const titre = screen.getByRole("heading", { level: 2, name: "Emplacement" });
    expect(barre().compareDocumentPosition(titre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("la feuille du Pro pose la grille rail | flux et son repli, sur les mêmes mesures que le parcours sur place (colonne de 168 px, seuil de 900 px)", () => {
    const theme = readFileSync(resolve(__dirname, "../theme.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(/\.wizard\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*168px\)\s+minmax\(0,\s*1fr\)/.test(theme)).toBe(true);
    expect(/\.wizard-rail\s*\{[^}]*grid-area:\s*rail/.test(theme)).toBe(true);
    expect(/@media \(max-width: 900px\)\s*\{\s*\.wizard\s*\{/.test(theme)).toBe(true);
  });
});
