// Rang 47 (D345) — le parcours « Nouvelle réservation » GARDE son étape et ses saisies quand on change d'onglet.
//
// ⛔ Ce qui est mesuré, en français d'abord (la demande de Ko, 08/11/2026) : « garder en mémoire l'étape et les données du client sur place, et ne pas revenir
// au début dès qu'on passe à un onglet Demandes ou autre ». Chaque test ci-dessous monte le VRAI parcours sous le VRAI `AppProviders`, dans de VRAIES routes
// (`MemoryRouter` + `Routes`) : changer d'onglet DÉMONTE le parcours, comme dans l'application. Un test qui rendrait le parcours une seule fois ne mesurerait rien.
//
// ⛔ R-1/R-2 : le brouillon vit EN MÉMOIRE, dans un fournisseur monté au-dessus des routes. Il survit au changement d'onglet ; il ne survit ni au rechargement
// (un arbre neuf) ni à la fermeture. ⛔ R-3 : le devis AFFICHÉ n'est pas restauré, il est « à recalculer » ; la chaîne (`chainQuoteId`) l'est. ⛔ R-4 : le brouillon
// s'efface à la fin du parcours, à la déconnexion, au changement de compte, et par « Recommencer ». ⛔ R-5 : le brouillon d'une autre salle n'est pas montré.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { formatDZD, messages } from "@zwadj/i18n";
import type { QuoteDTO, VenueProDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { RequireProSession } from "../auth/require-pro";
import { useAuth } from "../auth/auth-context";
import { initI18n } from "../i18n";
import {
  PRO_USER,
  makeAuthDouble,
  makeBookingsProDouble,
  makeProClientsDouble,
  makeQuotesDouble,
  makeServicesDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";
import { WalkinJourney } from "./walkin-journey";

vi.mock("./save-file", () => ({ saveBlob: vi.fn() }));
vi.mock("./remittance-hook", () => ({ onQuoteRemitted: vi.fn() }));

initI18n();

const SLOT_ID = "s1";
const slotTemplates = [{ id: SLOT_ID, nameFr: "Soirée", nameAr: "مسائية", startMinutes: 1200, endMinutes: 120, isActive: true }];
const VENUE = { id: "v1", slug: "salle-el-ryad", nameFr: "Salle El Ryad", nameAr: "قاعة الرياض", capacityMax: 400, slotTemplates } as unknown as VenueProDTO;
const AUTRE_SALLE = { ...VENUE, id: "v2", slug: "salle-2", nameFr: "Salle Deux" } as unknown as VenueProDTO;

/** Horloge gelée, toutes les dates dérivées d'elle (AGENTS.md : « figer l'horloge, jamais choisir une date dans le futur »). */
const MAINTENANT = new Date("2026-08-10T09:00:00Z");
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(MAINTENANT);
});
afterAll(() => {
  vi.useRealTimers();
});
function jour(decalage: number): string {
  const d = new Date(MAINTENANT);
  d.setUTCDate(d.getUTCDate() + decalage);
  return d.toISOString().slice(0, 10);
}
const LIBRE = jour(5);

function availabilityDouble() {
  return vi.fn().mockResolvedValue({
    venueId: "v1",
    slug: "salle-el-ryad",
    bookingMode: "SINGLE_SLOT",
    from: jour(-9),
    to: jour(21),
    slots: slotTemplates,
    days: [{ date: LIBRE, slots: [{ slotTemplateId: SLOT_ID, status: "AVAILABLE", priceCents: 158_100_000 }] }]
  });
}

/** Un devis tel que le SERVEUR le rend (montants relevés d'un rendu plausible, jamais recalculés ici). */
function devis(over: Partial<QuoteDTO> = {}): QuoteDTO {
  return {
    id: "q1",
    venueId: "v1",
    clientId: null,
    status: "DRAFT",
    isOfficial: true,
    isExpired: false,
    version: 1,
    reference: "DEVIS-2026-0003-0014 v1",
    chainId: "c1",
    parentQuoteId: null,
    eventDate: LIBRE,
    slotTemplateId: SLOT_ID,
    guests: 200,
    basePriceCents: 158_100_000,
    servicesTotalCents: 320_500_000,
    totalCents: 478_600_000,
    depositCents: 150_000_000,
    lines: [],
    bookingId: null,
    sentVia: null,
    clientRecordId: "fiche-1",
    clientNameAr: null,
    clientNameLatin: "Amine Belkacem",
    ...over
  } as QuoteDTO;
}

/** Comparateur, et non chaîne littérale : `formatDZD` émet des espaces INSÉCABLES que Testing Library normalise d'un seul côté (la valeur attendue vient du formateur). */
function montant(cents: number) {
  const plat = (v: string) => v.replace(/\s+/gu, " ").trim();
  return (contenu: string) => plat(contenu) === plat(formatDZD(cents));
}

async function laisserRetomber(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

/** La barre de test : les liens qui CHANGENT D'ONGLET, et les gestes d'authentification. Hors des routes, donc toujours montée. */
function Barre() {
  const { logout, login } = useAuth();
  return (
    <nav aria-label="Barre de test">
      <Link to="/demandes">Aller aux demandes</Link>
      <Link to="/">Retour au parcours</Link>
      <Link to="/autre-salle">Aller à l'autre salle</Link>
      <button type="button" onClick={() => void logout()}>
        Se déconnecter
      </button>
      <button type="button" onClick={() => void login({ email: "contact@salle.dz", password: "x" } as never)}>
        Se reconnecter
      </button>
    </nav>
  );
}

type Reglages = {
  quotes?: Parameters<typeof makeQuotesDouble>[0];
  clients?: Parameters<typeof makeProClientsDouble>[0];
  bookings?: Parameters<typeof makeBookingsProDouble>[0];
  services?: Parameters<typeof makeServicesDouble>[0];
  auth?: Parameters<typeof makeAuthDouble>[0];
};

/** Monte l'application de test. Rend les doubles pour que le test compte les appels. `monter()` peut être rappelée : c'est un RECHARGEMENT (arbre neuf). */
function monter(over: Reglages = {}) {
  const quotes = makeQuotesDouble({ create: vi.fn().mockResolvedValue(devis()), revise: vi.fn().mockResolvedValue(devis({ version: 2 })), ...over.quotes });
  const clients = makeProClientsDouble(over.clients);
  const bookings = makeBookingsProDouble(over.bookings);
  const auth = makeAuthDouble({ login: vi.fn().mockResolvedValue({ user: PRO_USER }), ...over.auth });
  const rendu = render(
    <MemoryRouter initialEntries={["/"]}>
      <AppProviders
        client={auth}
        venues={makeVenueClientDouble(VENUE, { availability: availabilityDouble() })}
        quotesClient={quotes}
        servicesClient={makeServicesDouble(over.services)}
        bookingsPro={bookings}
        clientsClient={clients}
      >
        <Barre />
        <Routes>
          <Route
            path="/"
            element={
              <RequireProSession>
                <WalkinJourney venue={VENUE} />
              </RequireProSession>
            }
          />
          <Route
            path="/demandes"
            element={
              <RequireProSession>
                <p>Page des demandes</p>
              </RequireProSession>
            }
          />
          <Route
            path="/autre-salle"
            element={
              <RequireProSession>
                <WalkinJourney venue={AUTRE_SALLE} />
              </RequireProSession>
            }
          />
          <Route path="/auth/connexion" element={<p>Page de connexion</p>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );
  return { quotes, clients, bookings, auth, rendu };
}

async function ouvrir(over: Reglages = {}) {
  const outils = monter(over);
  await laisserRetomber();
  await laisserRetomber();
  return outils;
}

async function cliquer(nom: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: nom }));
  });
  await laisserRetomber();
  await laisserRetomber();
}
async function allerEtRevenir() {
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "Aller aux demandes" }));
  });
  await screen.findByText("Page des demandes");
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "Retour au parcours" }));
  });
  await laisserRetomber();
  await laisserRetomber();
}

const question = () => document.getElementById("wk-question")?.textContent;
const recap = () => screen.getByRole("list", { name: "Réponses déjà données" });
const telephone = () => screen.getByLabelText("Téléphone") as HTMLInputElement;
const WK = messages.fr.venue.ui.walkin;
const PREMIERE_QUESTION = WK.qContact;
const QUESTION_CLIENT = WK.qClient;
const QUESTION_DATE = WK.qDate;
const QUESTION_DEVIS = WK.qQuote;

async function repondreContact(saisie = "+213550000002") {
  fireEvent.change(telephone(), { target: { value: saisie } });
  await cliquer("Continuer");
}
async function repondreNoms(invites = "200") {
  fireEvent.change(screen.getByLabelText("Nom en lettres latines"), { target: { value: "Amine Belkacem" } });
  fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: invites } });
  await cliquer("Continuer");
}
async function repondreDate() {
  const unJour = await screen.findByRole("button", { name: /15/ });
  await waitFor(() => expect(unJour).toBeEnabled());
  await act(async () => {
    fireEvent.click(unJour);
  });
  await laisserRetomber();
}
async function allerAuDevis() {
  await repondreContact();
  await repondreNoms();
  await repondreDate();
  fireEvent.click(await screen.findByRole("button", { name: /Soirée/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Voir le devis" }));
  await laisserRetomber();
}

afterEach(() => {
  cleanup();
});

describe("R-2 / R-3 — aller à un autre onglet puis revenir : la même étape, les mêmes saisies", () => {
  it("à l'étape DATE : on revient à la question de la date, et le récapitulatif des réponses est le même", async () => {
    await ouvrir();
    await repondreContact();
    await repondreNoms();
    const avant = { question: question(), recap: recap().textContent };
    // Mesure non confondue : on est bien APRÈS le contact et le client, sinon le test serait vrai pour une autre raison.
    expect(avant.question).toBe(QUESTION_DATE);
    expect(avant.recap).not.toBe("");

    await allerEtRevenir();

    expect(question()).toBe(avant.question);
    expect(recap().textContent).toBe(avant.recap);
  });

  it("à l'étape CONTACT : le numéro tapé et non validé est toujours dans le champ", async () => {
    await ouvrir();
    fireEvent.change(telephone(), { target: { value: "+213550000002" } });
    const avant = telephone().value;
    expect(avant).not.toBe("");

    await allerEtRevenir();

    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe(avant);
  });

  it("à l'étape CLIENT : le nom et le nombre d'invités tapés et non validés sont toujours dans leurs champs", async () => {
    await ouvrir();
    await repondreContact();
    expect(question()).toBe(QUESTION_CLIENT);
    fireEvent.change(screen.getByLabelText("Nom en lettres latines"), { target: { value: "Amine Belkacem" } });
    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "150" } });

    await allerEtRevenir();

    // Verdicts NATIFS (`toBe`) et l'étape d'abord : si l'étape est perdue, le test échoue sur une ASSERTION, pas sur une requête qui lève.
    expect(question()).toBe(QUESTION_CLIENT);
    expect((screen.getByLabelText("Nom en lettres latines") as HTMLInputElement).value).toBe("Amine Belkacem");
    expect((screen.getByLabelText("Nombre d'invités") as HTMLInputElement).value).toBe("150");
  });

  it("R-3 : un devis déjà calculé n'est PAS restauré tel quel — « à recalculer » ; la chaîne est gardée, donc le clic RÉVISE au lieu de créer", async () => {
    const { quotes } = await ouvrir();
    await allerAuDevis();
    await cliquer("Calculer le devis");
    await screen.findByText(montant(478_600_000));
    expect(vi.mocked(quotes.create).mock.calls.length).toBe(1);
    // Le récapitulatif porte TOUTES les réponses (contact, client, date, créneau, prestations) : « aucune prestation » en est une, qui ne se déduit d'aucune donnée.
    const recapAvant = recap().textContent;
    expect(recapAvant).not.toBe("");

    await allerEtRevenir();

    expect(recap().textContent).toBe(recapAvant);
    // Le total affiché est jeté, l'écran le DIT (message déjà existant), et l'étape est la même.
    expect(question()).toBe(QUESTION_DEVIS);
    expect(screen.queryByText(montant(478_600_000))).toBeNull();
    expect(screen.queryByRole("status")?.textContent).toBe(WK.staleTotal);
    // La chaîne est gardée : le bouton propose de MODIFIER (assertion NATIVE d'abord : une requête qui lèverait ne serait pas une morsure), et le clic révise la chaîne « q1 ».
    expect(screen.queryByRole("button", { name: WK.editQuote }) !== null).toBe(true);
    await cliquer("Modifier le devis");
    expect(vi.mocked(quotes.create).mock.calls.length).toBe(1);
    expect(vi.mocked(quotes.revise).mock.calls.length).toBe(1);
    expect(vi.mocked(quotes.revise).mock.calls[0]?.[0]).toBe("q1");
  });
});

describe("R-2 / R-3 — les prestations cochées et leur quantité", () => {
  const TABLES = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const CATALOGUE = [
    {
      id: TABLES,
      nameFr: "Tables rondes",
      nameAr: "طاولات مستديرة",
      pricingType: "PER_UNIT",
      isActive: true,
      tiers: [],
      unitNameFr: "table",
      unitNameAr: "طاولة",
      minUnits: 2,
      maxUnits: 30
    }
  ];

  it("à l'étape PRESTATIONS : la prestation cochée et la quantité saisie sont toujours là", async () => {
    await ouvrir({ services: { listForVenue: vi.fn().mockResolvedValue(CATALOGUE) } });
    await repondreContact();
    await repondreNoms();
    await repondreDate();
    fireEvent.click(await screen.findByRole("button", { name: /Soirée/ }));
    const case1 = await screen.findByRole("checkbox", { name: /Tables rondes/ });
    fireEvent.click(case1);
    const quantite = () => screen.getAllByLabelText(/Tables rondes/).find((e) => (e as HTMLInputElement).type === "number") as HTMLInputElement;
    fireEvent.change(quantite(), { target: { value: "7" } });
    expect(question()).toBe(WK.qServices);
    expect(quantite().value).toBe("7");

    await allerEtRevenir();

    expect(question()).toBe(WK.qServices);
    expect((screen.getByRole("checkbox", { name: /Tables rondes/ }) as HTMLInputElement).checked).toBe(true);
    expect(quantite().value).toBe("7");
  });
});

describe("R-2 — rechargement : tout est vide", () => {
  it("un arbre neuf (rechargement de la page) rouvre le parcours sur la première question, champs vides", async () => {
    await ouvrir();
    // Une application ouverte à froid démarre VIDE : ce que les tests précédents du fichier ont laissé en mémoire n'y survit pas.
    expect(question()).toBe(PREMIERE_QUESTION);
    await repondreContact();
    await repondreNoms();
    expect(question()).toBe("Quelle date ?");

    cleanup();
    await ouvrir();

    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");
    expect(recap().textContent).toBe("");
  });
});

describe("R-4 — le brouillon s'efface", () => {
  it("par « Recommencer » : le parcours est vide, et il le reste après un aller-retour d'onglet", async () => {
    await ouvrir();
    await repondreContact();
    await repondreNoms();
    await cliquer("Recommencer");
    expect(question()).toBe(PREMIERE_QUESTION);

    await allerEtRevenir();

    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");
    expect(recap().textContent).toBe("");
  });

  it("à la déconnexion : le même compte qui se reconnecte retrouve un parcours vide", async () => {
    await ouvrir();
    await repondreContact();
    await repondreNoms();
    expect(question()).toBe("Quelle date ?");

    await cliquer("Se déconnecter");
    await screen.findByText("Page de connexion");
    await cliquer("Se reconnecter");
    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Retour au parcours" }));
    });
    await laisserRetomber();
    await laisserRetomber();

    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");
  });

  it("au changement de compte : un AUTRE compte ne voit pas le brouillon du premier", async () => {
    const login = vi.fn().mockResolvedValue({ user: { ...PRO_USER, id: "u-autre" } });
    await ouvrir({ auth: { login } });
    await repondreContact();
    await repondreNoms();
    expect(question()).toBe("Quelle date ?");

    // Le jeton est échangé SANS déconnexion intermédiaire : l'identité change sous l'application montée.
    await cliquer("Se reconnecter");
    await allerEtRevenir();

    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");
  });

  it("à la fin du parcours (réservation créée) : revenir ne rouvre PAS le devis conclu, mais un parcours vide", async () => {
    await ouvrir({ quotes: { convert: vi.fn().mockResolvedValue(devis({ status: "SENT", bookingId: "b1" })) } });
    await allerAuDevis();
    await cliquer("Calculer le devis");
    await screen.findByText(montant(478_600_000));
    await cliquer("Enregistrer sans bloquer");
    await screen.findByRole("status");

    await allerEtRevenir();

    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");
    expect(recap().textContent).toBe("");
  });

  it("à la fin du parcours (devis remis) : revenir ne rouvre PAS le parcours rempli, mais un parcours vide", async () => {
    const deliver = vi.fn().mockResolvedValue(devis({ sentVia: "PRINT", status: "SENT" }));
    await ouvrir({ quotes: { deliver } });
    await allerAuDevis();
    await cliquer("Calculer le devis");
    await screen.findByText(montant(478_600_000));
    const imprimer = (messages.fr.venue.ui.quotes as Record<string, string>)["sv_PRINT"] as string;
    await cliquer(imprimer);
    const boite = screen.getByRole("dialog", { name: messages.fr.venue.ui.walkin.langDialogTitle });
    await act(async () => {
      fireEvent.click(within(boite).getByRole("button", { name: messages.fr.venue.ui.walkin.langFrench }));
    });
    await laisserRetomber();
    await laisserRetomber();
    await waitFor(() => expect(deliver).toHaveBeenCalledTimes(1));

    await allerEtRevenir();

    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");
    expect(recap().textContent).toBe("");
  });
});

describe("R-5 — la salle choisie change : le brouillon d'une autre salle n'est pas montré, il s'efface", () => {
  it("le brouillon de la salle 1 n'apparaît pas sur la salle 2, et ne revient pas sur la salle 1", async () => {
    await ouvrir();
    await repondreContact();
    await repondreNoms();
    expect(question()).toBe("Quelle date ?");

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Aller à l'autre salle" }));
    });
    await laisserRetomber();
    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Retour au parcours" }));
    });
    await laisserRetomber();
    expect(question()).toBe(PREMIERE_QUESTION);
    expect(telephone().value).toBe("");
  });
});

describe("R-6 — garde de SOURCE : aucun accès au stockage du navigateur dans le fournisseur", () => {
  /** Le texte du fichier SANS ses commentaires : une explication qui nomme `localStorage` n'est pas un accès (leçon D223). */
  const sansCommentaires = (texte: string) => texte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const JETONS = /\b(localStorage|sessionStorage|indexedDB|IDBFactory|document\.cookie|caches\.open|navigator\.storage)\b/;
  const accedeAuStockage = (texte: string) => JETONS.test(sansCommentaires(texte));
  const lire = (nom: string) => readFileSync(resolve(process.cwd(), "src/dashboard", nom), "utf8");

  it("calibration, bras positif : un fichier qui lit localStorage est vu", () => {
    expect(accedeAuStockage('const a = window.localStorage.getItem("k");')).toBe(true);
    expect(accedeAuStockage("sessionStorage.setItem('k', v)")).toBe(true);
    expect(accedeAuStockage("indexedDB.open('x')")).toBe(true);
  });
  it("calibration, bras négatif : un fichier sain, ou qui n'en parle que dans un commentaire, n'est pas accusé", () => {
    expect(accedeAuStockage("const a = 1; // jamais localStorage ici")).toBe(false);
    expect(accedeAuStockage("/* ni sessionStorage ni indexedDB */ const b = 2;")).toBe(false);
  });
  it("le module pur et le fournisseur n'accèdent à aucun stockage du navigateur", () => {
    const fichiers = ["walkin-draft.ts", "walkin-draft-context.tsx"];
    const lus = fichiers.map((nom) => ({ nom, texte: lire(nom) }));
    // Mesure non confondue : les fichiers ont été OUVERTS et ne sont pas vides.
    for (const f of lus) expect(f.texte.length, f.nom).toBeGreaterThan(200);
    expect(lus.filter((f) => accedeAuStockage(f.texte)).map((f) => f.nom)).toEqual([]);
  });
  it("le parcours lui-même n'y accède pas non plus", () => {
    expect(accedeAuStockage(lire("walkin-journey.tsx"))).toBe(false);
  });
});
