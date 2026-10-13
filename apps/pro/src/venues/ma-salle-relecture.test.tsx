// « Ma salle » — la liste des salles est relue après TOUTE modification — rang 37 (D331), lot L35-1, cadrage de D328 (M-23), relevé 4 de D327.
//
// ⛔ LE DÉFAUT (reproduit dans un navigateur par D327, S4 à S8) : `ProVenuesProvider` ne relisait la liste qu'à la connexion, à la CRÉATION (D326) et depuis la liste elle-même. Elle
// restait périmée après une ÉDITION (S4, S8), après la PUBLICATION faite par l'administrateur dans une autre session (S5), et après une SUPPRESSION depuis l'assistant (S6).
// ⛔ POURQUOI LE TEST DE D326 ÉTAIT VERT : son faux serveur enregistrait la salle AU MOMENT DE L'APPEL de `create`, avant de répondre, et il ne simulait ni édition ni suppression.
// Ici le faux serveur est HONNÊTE (`makeVenueServerDouble`) : une écriture n'enregistre qu'à sa réponse, `listMine` fige l'état à l'appel, et `actElsewhere` change le serveur
// SANS requête de ce client (l'administrateur qui publie).
//
// ⚠ UN TEST PAR CHEMIN, ET CHAQUE CHEMIN A SA MESURE QUE LES AUTRES NE MASQUENT PAS :
//   · édition — la sonde du fournisseur (« courante », « compte ») est lue SUR la page d'édition, sans jamais visiter la liste (la relecture d'entrée ne peut pas la réparer) ;
//   · suppression — la salle supprimée n'est JAMAIS montrée comme présente pendant la relecture (une relecture d'entrée, silencieuse, la laisserait affichée jusqu'à la réponse) ;
//   · entrée de la liste — le serveur change sans requête, et l'entrée dans la liste suffit ;
//   · création — la relecture part APRÈS la réponse de `create`, pas avant (dans `create-venue-page.test.tsx`).
// ⚠ Les verdicts s'écrivent par `expect` de vitest, dans un `waitFor` : une requête Testing Library qui lève n'est pas une assertion (D304, D316).
import { StrictMode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { formatDZD, messages } from "@zwadj/i18n";
import type { VenueProDTO, WilayaDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { useProVenues } from "../shell/pro-venues-context";
import { laisserPasser, makeAuthDouble, makeReferentialsDouble, makeVenueServerDouble } from "../test-support/client-doubles";
import { CreateVenuePage } from "./create-venue-page";
import { EditVenuePage } from "./edit-venue-page";
import { VenueListPage } from "./venue-list-page";

initI18n();

const UI = messages.fr.venue.ui;
const FORM = UI.form;
const WIZARD = UI.wizard;

const CITY_ID = "11111111-1111-4111-8111-111111111111";
const WILAYAS: WilayaDTO[] = [
  { id: "w16", nameFr: "Alger", nameAr: "الجزائر", code: 16, cities: [{ id: CITY_ID, nameFr: "Alger-Centre", nameAr: "الجزائر الوسطى", lat: 36.7538, lng: 3.0588 }] }
];

const SALLE = (id: string, nameFr: string, over: Partial<VenueProDTO> = {}): VenueProDTO =>
  ({
    id,
    slug: `salle-${id}`,
    cityId: CITY_ID,
    nameFr,
    nameAr: "قاعة",
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
    matterportModelId: null,
    ...over
  }) as unknown as VenueProDTO;

/** Ce que le fournisseur sait, en clair — lu SUR n'importe quelle page, sans passer par la liste. */
function Sonde() {
  const { state, current, count } = useProVenues();
  return (
    <ul>
      <li>état:{state.kind}</li>
      <li>compte:{count}</li>
      <li>courante:{current?.nameFr ?? "aucune"}</li>
    </ul>
  );
}

/** Une navigation INTERNE (React Router), jamais un rechargement. */
function VersLaListe() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate("/salles")}>
      aller à la liste
    </button>
  );
}

function monde(salles: VenueProDTO[], depart: string, options: { strict?: boolean; serveur?: Parameters<typeof makeVenueServerDouble>[1] } = {}) {
  const serveur = makeVenueServerDouble(salles, options.serveur);
  const arbre = (
    <MemoryRouter initialEntries={[depart]}>
      <AppProviders client={makeAuthDouble()} venues={serveur.client} referentials={makeReferentialsDouble(WILAYAS)}>
        <Sonde />
        <VersLaListe />
        <Routes>
          <Route path="/ailleurs" element={<p>ailleurs</p>} />
          <Route path="/salles/nouvelle" element={<CreateVenuePage />} />
          <Route path="/salles/:id" element={<EditVenuePage />} />
          <Route path="/salles" element={<VenueListPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
  render(options.strict ? <StrictMode>{arbre}</StrictMode> : arbre);
  return serveur;
}

const lectures = (serveur: ReturnType<typeof makeVenueServerDouble>) => vi.mocked(serveur.client.listMine).mock.calls.length;
const carteDe = (nom: string) => screen.queryByRole("heading", { level: 2, name: nom });
/** Un TEXTE est-il à l'écran ? Verdict NATIF (`toBe`) : `getByText(…).toBeInTheDocument()` échoue par une erreur de REQUÊTE puis un matcher jest-dom, jamais par une `AssertionError` (D304, D316). */
const present = (texte: string) => screen.queryByText(texte) !== null;
const enregistrer = () => fireEvent.click(screen.getByRole("button", { name: WIZARD.next }));

describe("« Ma salle » — ÉDITION : un enregistrement réussi fait relire la liste", () => {
  it("⛔ la salle courante et le compte sont ceux du SERVEUR après l'enregistrement, sans visiter la liste (S4 de D327)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une"), SALLE("v2", "Salle Deux")], "/salles/v1?etape=1");
    await screen.findByRole("heading", { name: WIZARD.step1 });
    await screen.findByText("courante:Salle Une");
    fireEvent.change(screen.getByLabelText(FORM.nameFr), { target: { value: "Salle Renommée" } });
    enregistrer();
    await waitFor(() => expect(vi.mocked(serveur.client.update)).toHaveBeenCalledTimes(1));
    // Verdict en assertion NATIVE : la salle courante du fournisseur devient celle que le serveur a enregistrée.
    await waitFor(() => expect(screen.queryByText("courante:Salle Renommée")).not.toBeNull());
    expect(serveur.stored().map((v) => v.nameFr)).toContain("Salle Renommée");
    expect(lectures(serveur)).toBe(2);
  });

  it("⛔ RÈGLE DES MONTANTS : la liste montre le prix TEL QUE LE SERVEUR L'A ENREGISTRÉ (formaté par le formateur partagé), pas l'ancien, après un retour sans rechargement (S8 de D327)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/salles/v1?etape=1");
    await screen.findByRole("heading", { name: WIZARD.step1 });
    const avant = formatDZD(serveur.stored()[0]!.basePriceCents, "fr");
    fireEvent.change(screen.getByLabelText(FORM.nameFr), { target: { value: "Salle Corrigée" } });
    fireEvent.change(screen.getByLabelText(FORM.basePrice), { target: { value: "200000" } });
    enregistrer();
    await waitFor(() => expect(vi.mocked(serveur.client.update)).toHaveBeenCalledTimes(1));
    await screen.findByRole("status"); // « Modifications enregistrées » : la réponse est arrivée, l'écran le dit — c'est APRÈS qu'on revient à la liste
    fireEvent.click(screen.getAllByRole("link", { name: FORM.back })[0]!);
    // La valeur attendue vient du SERVEUR et du formateur partagé — jamais d'un littéral tapé (D209, 6).
    const apres = formatDZD(serveur.stored()[0]!.basePriceCents, "fr");
    expect(apres).not.toBe(avant);
    await waitFor(() => expect(carteDe("Salle Corrigée")).not.toBeNull());
    expect(carteDe("Salle Une")).toBeNull();
    // `formatDZD` insère des espaces insécables (U+00A0, U+202F) que Testing Library normalise d'UN SEUL côté (D209, 6) : on normalise les deux, l'attendu reste celui du formateur.
    const plat = (s: string) => s.replace(/\s+/g, " ").trim();
    expect(screen.queryAllByText((contenu) => plat(contenu) === plat(apres))).toHaveLength(1);
    expect(screen.queryAllByText((contenu) => plat(contenu) === plat(avant))).toHaveLength(0);
  });

  it("⛔ F-4 : la relecture part APRÈS la réponse du serveur, pas avant — tant que la réponse est retenue, la liste n'est pas relue (le serveur n'a rien enregistré)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/salles/v1?etape=1");
    await screen.findByRole("heading", { name: WIZARD.step1 });
    await screen.findByText("courante:Salle Une");
    const retenue = serveur.hold("update");
    fireEvent.change(screen.getByLabelText(FORM.nameFr), { target: { value: "Salle Renommée" } });
    enregistrer();
    await waitFor(() => expect(vi.mocked(serveur.client.update)).toHaveBeenCalledTimes(1));
    await laisserPasser();
    expect(lectures(serveur)).toBe(1);
    expect(serveur.stored().map((v) => v.nameFr)).toEqual(["Salle Une"]);
    retenue.release();
    await waitFor(() => expect(screen.queryByText("courante:Salle Renommée")).not.toBeNull());
    expect(lectures(serveur)).toBe(2);
  });

  it("F-17 : le libellé « Mes salles » ne retombe PAS à « Ma salle » pendant la relecture qui suit l'enregistrement (le compte connu est conservé)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une"), SALLE("v2", "Salle Deux")], "/salles/v1?etape=1");
    await screen.findByRole("heading", { name: WIZARD.step1 });
    await screen.findByText("compte:2");
    expect(screen.queryAllByRole("link", { name: /^Mes salles$/ }).length).toBeGreaterThan(0);
    const retenue = serveur.hold("listMine");
    fireEvent.change(screen.getByLabelText(FORM.nameFr), { target: { value: "Salle Renommée" } });
    enregistrer();
    await waitFor(() => expect(vi.mocked(serveur.client.update)).toHaveBeenCalledTimes(1));
    // La relecture est PARTIE et retenue : le fournisseur est en chargement, le compte reste celui qu'il connaissait.
    await waitFor(() => expect(lectures(serveur)).toBe(2));
    await waitFor(() => expect(screen.queryByText("état:loading")).not.toBeNull());
    expect(present("compte:2")).toBe(true);
    expect(screen.queryAllByRole("link", { name: /^Ma salle$/ })).toHaveLength(0);
    retenue.release();
    await waitFor(() => expect(screen.queryByText("état:ready")).not.toBeNull());
  });

  it("F-10 : si la relecture qui suit l'enregistrement ÉCHOUE, l'état est « error » — l'écran ne dit pas « à jour » ce qu'il ne sait pas", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/salles/v1?etape=1");
    await screen.findByRole("heading", { name: WIZARD.step1 });
    await screen.findByText("courante:Salle Une");
    vi.mocked(serveur.client.listMine).mockRejectedValueOnce(new Error("réseau"));
    fireEvent.change(screen.getByLabelText(FORM.nameFr), { target: { value: "Salle Renommée" } });
    enregistrer();
    await waitFor(() => expect(screen.queryByText("état:error")).not.toBeNull());
  });

  it("F-11 : un enregistrement sans rien à enregistrer ne relit PAS la liste (une salle qui n'a pas changé n'a aucune raison de la faire relire)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/salles/v1?etape=1");
    await screen.findByRole("heading", { name: WIZARD.step1 });
    await screen.findByText("courante:Salle Une");
    enregistrer();
    await screen.findByRole("heading", { name: WIZARD.step2 });
    expect(vi.mocked(serveur.client.update)).not.toHaveBeenCalled();
    expect(lectures(serveur)).toBe(1);
  });

  it("F-11 : un enregistrement REFUSÉ par le serveur ne relit PAS la liste, et l'écran le dit", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/salles/v1?etape=1", { serveur: { overrides: { update: vi.fn().mockRejectedValue(new Error("boom")) } } });
    await screen.findByRole("heading", { name: WIZARD.step1 });
    await screen.findByText("courante:Salle Une");
    fireEvent.change(screen.getByLabelText(FORM.nameFr), { target: { value: "Salle Renommée" } });
    enregistrer();
    await screen.findByRole("alert");
    expect(vi.mocked(serveur.client.update)).toHaveBeenCalledTimes(1);
    expect(lectures(serveur)).toBe(1);
    expect(present("courante:Salle Une")).toBe(true);
  });
});

describe("« Ma salle » — SUPPRESSION depuis l'assistant : la liste est relue", () => {
  async function ouvrirLaSuppression() {
    await screen.findByRole("heading", { name: WIZARD.step1 });
    await screen.findByText("courante:Salle Une");
    fireEvent.click(screen.getByRole("button", { name: UI.list.delete }));
    return within(await screen.findByRole("dialog")).getByRole("button", { name: UI.delete.confirm });
  }

  it("⛔ le compte et la salle courante sont ceux du SERVEUR après la suppression (S6 de D327)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une"), SALLE("v2", "Salle Deux")], "/salles/v1");
    fireEvent.click(await ouvrirLaSuppression());
    await waitFor(() => expect(vi.mocked(serveur.client.softDelete)).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("compte:1")).not.toBeNull());
    expect(present("courante:Salle Deux")).toBe(true);
    expect(serveur.stored().map((v) => v.id)).toEqual(["v2"]);
  });

  it("⛔ la salle SUPPRIMÉE n'est jamais montrée comme présente dans la liste pendant la relecture (« Chargement », pas la carte périmée)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une"), SALLE("v2", "Salle Deux")], "/salles/v1");
    const confirmer = await ouvrirLaSuppression();
    const retenue = serveur.hold("listMine");
    fireEvent.click(confirmer);
    // La liste est montée (on a quitté l'assistant) et elle est EN CHARGEMENT : elle ne montre pas la carte périmée de la salle qu'on vient de supprimer.
    await waitFor(() => expect(screen.queryByText(UI.list.loading)).not.toBeNull());
    expect(carteDe("Salle Une")).toBeNull();
    expect(carteDe("Salle Deux")).toBeNull();
    retenue.release();
    await waitFor(() => expect(carteDe("Salle Deux")).not.toBeNull());
    expect(carteDe("Salle Une")).toBeNull();
  });

  it("⛔ F-4 : la relecture part APRÈS la réponse du serveur, pas avant — tant que la suppression est retenue, la liste n'est pas relue et la salle est encore là", async () => {
    const serveur = monde([SALLE("v1", "Salle Une"), SALLE("v2", "Salle Deux")], "/salles/v1");
    const confirmer = await ouvrirLaSuppression();
    const retenue = serveur.hold("softDelete");
    fireEvent.click(confirmer);
    await waitFor(() => expect(vi.mocked(serveur.client.softDelete)).toHaveBeenCalledTimes(1));
    await laisserPasser();
    expect(lectures(serveur)).toBe(1);
    expect(serveur.stored().map((v) => v.id)).toEqual(["v1", "v2"]);
    retenue.release();
    await waitFor(() => expect(screen.queryByText("compte:1")).not.toBeNull());
    expect(lectures(serveur)).toBe(2);
  });

  it("à la dernière salle supprimée, la liste dit « aucune salle » sans rechargement (S6 de D327, le cas où le pro n'en a qu'une)", async () => {
    monde([SALLE("v1", "Salle Une")], "/salles/v1");
    fireEvent.click(await ouvrirLaSuppression());
    // Verdict en assertion NATIVE : `findByText` lève une erreur de REQUÊTE quand le texte n'arrive jamais, pas une assertion (D304, D316).
    await waitFor(() => expect(screen.queryByText(UI.list.empty.title)).not.toBeNull());
    expect(present("courante:aucune")).toBe(true);
    expect(present("compte:0")).toBe(true);
  });

  it("F-11 : une suppression REFUSÉE ne relit PAS la liste, ne quitte pas l'écran et le dit", async () => {
    const serveur = monde([SALLE("v1", "Salle Une"), SALLE("v2", "Salle Deux")], "/salles/v1", { serveur: { overrides: { softDelete: vi.fn().mockRejectedValue(new Error("boom")) } } });
    fireEvent.click(await ouvrirLaSuppression());
    await screen.findByText(UI.delete.error);
    expect(lectures(serveur)).toBe(1);
    expect(screen.queryByRole("heading", { name: FORM.editTitle })).not.toBeNull();
  });
});

describe("« Ma salle » — ENTRÉE de la liste : la publication faite ailleurs apparaît sans rechargement", () => {
  it("⛔ le serveur change SANS requête de ce client (l'administrateur publie), et l'entrée dans la liste montre « Publiée » (S5 de D327)", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/ailleurs");
    await screen.findByText("courante:Salle Une");
    serveur.actElsewhere((salles) => salles.map((s) => ({ ...s, publicationStatus: "PUBLISHED" }) as VenueProDTO));
    fireEvent.click(screen.getByRole("button", { name: "aller à la liste" }));
    await screen.findByRole("heading", { level: 2, name: "Salle Une" });
    await waitFor(() => expect(screen.queryAllByText(UI.publication.published).length).toBeGreaterThan(0));
    expect(screen.queryByText(UI.publication.draft)).toBeNull();
    expect(lectures(serveur)).toBe(2);
  });

  it("F-7 : pendant la relecture d'entrée la liste CONNUE reste affichée (aucun « Chargement » ne la masque) et le compte ne bouge pas", async () => {
    const serveur = monde([SALLE("v1", "Salle Une"), SALLE("v2", "Salle Deux")], "/ailleurs");
    await screen.findByText("compte:2");
    const retenue = serveur.hold("listMine");
    fireEvent.click(screen.getByRole("button", { name: "aller à la liste" }));
    await waitFor(() => expect(lectures(serveur)).toBe(2));
    expect(present("état:ready")).toBe(true);
    expect(carteDe("Salle Une")).not.toBeNull();
    expect(screen.queryByText(UI.list.loading)).toBeNull();
    expect(present("compte:2")).toBe(true);
    retenue.release();
    await waitFor(() => expect(lectures(serveur)).toBe(2));
  });

  it("F-5 : sous `StrictMode` (montage doublé), UNE entrée dans la liste produit UNE seule relecture", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/ailleurs", { strict: true });
    await screen.findByText("courante:Salle Une");
    expect(lectures(serveur)).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "aller à la liste" }));
    await screen.findByRole("heading", { level: 2, name: "Salle Une" });
    await waitFor(() => expect(lectures(serveur)).toBe(2));
    // On laisse passer un tour : une seconde relecture tardive aurait eu le temps de partir.
    await laisserPasser();
    expect(lectures(serveur)).toBe(2);
  });

  it("F-5/F-6 : à FROID sur la liste (la coquille charge, la page monte en même temps), la relecture d'entrée n'ajoute AUCUNE requête — une seule lecture, comme avant", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/salles", { strict: true });
    await screen.findByRole("heading", { level: 2, name: "Salle Une" });
    await laisserPasser();
    expect(lectures(serveur)).toBe(1);
  });

  it("F-6 : si la lecture de démarrage ÉCHOUE (état « error »), entrer dans la liste ne la rejoue PAS — le bouton « Réessayer » reste la voie", async () => {
    const serveur = monde([SALLE("v1", "Salle Une")], "/ailleurs", { serveur: { overrides: { listMine: vi.fn().mockRejectedValue(new Error("réseau")) } } });
    await screen.findByText("état:error");
    fireEvent.click(screen.getByRole("button", { name: "aller à la liste" }));
    await screen.findByRole("button", { name: UI.list.retry });
    await laisserPasser();
    expect(lectures(serveur)).toBe(1);
  });
});

describe("« Ma salle » — UNE SEULE SOURCE (D78, F-14)", () => {
  const PAGES = ["src/venues/venue-list-page.tsx", "src/venues/edit-venue-page.tsx", "src/venues/create-venue-page.tsx"];
  /** Les déclarations seules : le commentaire qui explique pourquoi la page ne lit pas la liste cite le nom de l'appel (D223). */
  const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/\s.*$/gm, "");
  const source = (f: string) => sansCommentaires(readFileSync(resolve(process.cwd(), f), "utf8"));

  it("aucune des trois pages ne lit elle-même la liste (`listMine`) : tout passe par le fournisseur", () => {
    for (const f of PAGES) {
      expect(source(f), f).not.toMatch(/\blistMine\b/);
    }
  });

  it("et chacune parle au fournisseur (`useProVenues`) : la garde ne passe pas parce qu'une page a cessé d'en dépendre", () => {
    for (const f of PAGES) {
      expect(source(f), f).toMatch(/\buseProVenues\b/);
    }
  });
});
