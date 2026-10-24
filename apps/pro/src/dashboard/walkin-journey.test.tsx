// Nouvelle réservation — client sur place. REFONTE EN FLUX PAR ÉTAPES.
//
// ⚠ CES TESTS SONT RE-DÉRIVÉS DU COMPORTEMENT, PAS ADAPTÉS AU BALISAGE.
// Les 24 tests précédents interrogeaient trois cartes SIMULTANÉES ; le flux n'en
// montre qu'une, donc la plupart de leurs `getBy` ne trouvaient plus rien. Les
// faire repasser au vert en changeant les sélecteurs jusqu'à ce qu'ils passent
// est exactement la manière dont une suite cesse de mesurer sans que rien ne
// rougisse. Chaque test ci-dessous répond à une question posée en FRANÇAIS
// d'abord — « après avoir répondu au client, la question de la date est-elle la
// seule active ? » — et le sélecteur vient après.
//
// Ce composant orchestre cinq appels dans un ordre qui a des conséquences
// financières et un verrou de base de données au bout. Les tests portent donc
// sur la CHAÎNE — quels appels, dans quel ordre, avec quels arguments — et sur
// les quatre endroits où l'écran pourrait mentir : un total périmé, une date
// qu'on dirait bloquée sans l'avoir bloquée, un devis de plus à chaque clic, et
// un montant affiché avant que le serveur ait chiffré.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import i18next from "i18next";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@zwadj/api-client";
import { formatDZD, messages } from "@zwadj/i18n";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  QUOTE_SENT_VIA,
  QUOTE_SENT_VIA_ORDER,
  isValidContactEmail,
  quoteDocumentFilename,
  type ClientRecordDTO,
  type QuoteDTO,
  type QuoteSentVia,
  type VenueProDTO
} from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import {
  makeAuthDouble,
  makeBookingsProDouble,
  makeProClientsDouble,
  makeQuotesDouble,
  makeServicesDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";
import { onQuoteRemitted } from "./remittance-hook";
import { saveBlob } from "./save-file";
import { WalkinJourney } from "./walkin-journey";

// Rang 33 (D326) : les DEUX frontières que le test REMPLACE — le téléchargement navigateur (jsdom n'a ni `createObjectURL` ni téléchargement ; la spec e2e du lot le mesure,
// dans un vrai navigateur) et le point de branchement de l'envoi réel (il ne fait rien : le test mesure QUI l'appelle, et quand).
vi.mock("./save-file", () => ({ saveBlob: vi.fn() }));
vi.mock("./remittance-hook", () => ({ onQuoteRemitted: vi.fn() }));

initI18n();

const SLOT_ID = "s1";
const VENUE = {
  id: "v1",
  slug: "salle-el-ryad",
  nameFr: "Salle El Ryad",
  nameAr: "قاعة الرياض",
  capacityMax: 400,
  slotTemplates: [
    { id: SLOT_ID, nameFr: "Soirée", nameAr: "مسائية", startMinutes: 1200, endMinutes: 120, isActive: true }
  ]
} as unknown as VenueProDTO;

/** ⛔ HORLOGE GELÉE, ET TOUTES LES DATES DÉRIVÉES D'ELLE.
 *
 *  Ce fichier a rendu 24 échecs sur 41 le 01/09/2026, sur un arbre où aucune ligne
 *  n'avait bougé : ses dates de fixture étaient écrites en dur en août 2026, et
 *  elles ont cessé d'être futures à minuit. Le calendrier les a refusées, les
 *  boutons de jour sont restés désactivés.
 *
 *  ⛔ LA PROPRIÉTÉ VISÉE N'EST PAS « ça repasse au vert », C'EST L'INSENSIBILITÉ À
 *  TOUTE DATE. Elle tient à une seule condition : `MAINTENANT` est l'UNIQUE date
 *  écrite du fichier, et tout le reste en DÉRIVE. Réintroduire une date en dur
 *  ailleurs recréerait une seconde valeur à maintenir — elle divergerait au premier
 *  changement de fixture, et le défaut reviendrait un matin, sans qu'une ligne ait
 *  bougé.
 *  ⚠ Corollaire : déplacer `MAINTENANT` de dix ans ne doit RIEN changer au résultat.
 *  C'est mesuré par la cible inversée de `neutralisation/neutralize-horloge.py`.
 *
 *  ⚠ Le gel est posé PAR FICHIER et non dans `test-setup.ts` : mesuré le 02/09/2026,
 *  un gel global ajoute DEUX échecs à date INCHANGÉE et fait tomber la collecte
 *  entière aux dates lointaines. La raison est aussi écrite dans `test-setup.ts`. */
const MAINTENANT = new Date("2026-08-10T09:00:00Z");

beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(MAINTENANT);
});
afterAll(() => {
  vi.useRealTimers();
});

/** Un jour de la fenêtre, en décalage depuis `MAINTENANT`. Rendu en ISO court, le
 *  format que l'API de disponibilité renvoie. */
function jour(decalage: number): string {
  const d = new Date(MAINTENANT);
  d.setUTCDate(d.getUTCDate() + decalage);
  return d.toISOString().slice(0, 10);
}

/** Un jour LIBRE et un jour VENDU, pour que le test puisse mesurer l'écart entre
 *  « cliquable » et « refusé par le moteur ». Les prix sont ceux que rendrait le
 *  moteur (B2/B3) — jamais recalculés ici. */
const LIBRE = jour(5);
const AUTRE = jour(6);
const VENDU = jour(12);

/** ⚠ La disponibilité passe désormais par le CLIENT AUTHENTIFIÉ
 *  (`GET /pro/venues/:id/availability`), plus par un `fetch` brut sur la route
 *  publique. Ces tests stubaient donc `global.fetch`, ce qui ne mesurait plus
 *  rien : ils validaient un chemin que le composant n'emprunte plus. */
function availabilityDouble() {
  return vi.fn().mockResolvedValue({
    venueId: "v1",
    slug: "salle-el-ryad",
    bookingMode: "SINGLE_SLOT",
    from: jour(-9),
    to: jour(21),
    slots: VENUE.slotTemplates,
    days: [
      { date: LIBRE, slots: [{ slotTemplateId: SLOT_ID, status: "AVAILABLE", priceCents: 158_100_000 }] },
      // ⚠ Un SECOND jour libre, ajouté pour le test du changement de date. Sans
      // lui, le seul autre jour cliquable était VENDU : le test aurait mesuré la
      // cascade ET le refus du moteur d'un coup, et un échec n'aurait pas dit
      // lequel des deux avait cassé.
      { date: AUTRE, slots: [{ slotTemplateId: SLOT_ID, status: "AVAILABLE", priceCents: 158_100_000 }] },
      { date: VENDU, slots: [{ slotTemplateId: SLOT_ID, status: "BOOKED", priceCents: 158_100_000 }] }
    ]
  });
}

/** ⚠ Montants RELEVÉS d'un rendu serveur plausible, jamais recalculés dans le
 *  test. Le point du lot est justement que l'écran n'en calcule aucun. */
function draft(over: Partial<QuoteDTO> = {}): QuoteDTO {
  return {
    id: "q1",
    venueId: "v1",
    clientId: null,
    status: "DRAFT",
    isExpired: false,
    version: 1,
    // Rang 39 (D333, K-6) — la référence que le SERVEUR rend : salle 3, devis 14, version 1. Les fixtures de ce fichier n'en calculent jamais une, elles la REÇOIVENT.
    reference: "DEVIS-2026-0003-0014 v1",
    chainId: "c1",
    parentQuoteId: null,
    eventDate: LIBRE,
    slotTemplateId: SLOT_ID,
    guests: 200,
    basePriceCents: 158_100_000,
    servicesTotalCents: 320_500_000,
    totalCents: 478_600_000,
    // ⚠ PAS 30 % du total : D81 autorise un acompte en MONTANT FIXE par salle.
    // Une fixture à exactement 30 % serait indistinguable de la règle
    // `Math.round(total * 0.3)` de la maquette, et ne prouverait rien.
    // ⚠ Piège rencontré DEUX FOIS : les chiffres de la maquette (4 786 000 /
    // 1 435 800) sont eux-mêmes pile 30 %. Recopier une référence, c'est parfois
    // recopier la règle qu'on prétend réfuter. 1 500 000 DA est un montant fixe
    // plausible, et il ne tombe sur aucun pourcentage rond.
    depositCents: 150_000_000,
    lines: [],
    bookingId: null,
    // Q2 — un devis neuf n'a pas de canal de remise. C'est ce champ, et non
    // `sentAt`, qui décide de l'entrée dans l'entonnoir (D162).
    sentVia: null,
    // Rang 41 (D336, K-6) — la fiche et la COPIE du nom que le SERVEUR rend : la fiche créée à l'étape Client (« fiche-1 », le double du client des fiches),
    // le nom latin tapé par `repondreClient`. La conversion se PRÉREMPLIT depuis elles (K-12) — d'où les « Amine » et « Belkacem » qu'elle envoie.
    clientRecordId: "fiche-1",
    clientNameAr: null,
    clientNameLatin: "Amine Belkacem",
    ...over
  } as QuoteDTO;
}

/** ⚠ Comparateur, et non chaîne littérale : `formatDZD` émet des espaces
 *  INSÉCABLES que Testing Library normalise d'un seul côté. */
function montant(cents: number) {
  const plat = (v: string) => v.replace(/\s+/gu, " ").trim();
  return (contenu: string) => plat(contenu) === plat(formatDZD(cents));
}

/** ⛔ LAISSE RETOMBER, **DANS `act`**, LE TRAVAIL ASYNCHRONE DÉJÀ LANCÉ.
 *
 *  ⚠ CE N'EST PAS UNE ATTENTE, ET LES CONFONDRE COÛTE CHER. Une attente
 *  (`waitFor`, `findBy…`) demande « est-ce arrivé ? » et rend la main dès que
 *  oui — mais la mise à jour qui a répondu, elle, s'est produite pendant que le
 *  test tournait, HORS `act`, et React a déjà écrit son avertissement. Attendre
 *  APRÈS coup ne l'efface pas : c'est pourquoi `repondreDate` attendait déjà que
 *  la case soit active et laissait quand même passer 3 avertissements.
 *
 *  ⛔ CE QU'ON MESURE ICI EST DONC UN DÉFAUT DE TEST, PAS DE COMPOSANT. Aucun
 *  composant de production n'est touché par ce lot : `VenueCalendar` a raison de
 *  poser `setData`, `setError` et `setLoading` après son `await` — c'est le test
 *  qui doit ouvrir une fenêtre `act` pour les recevoir.
 *
 *  ⚠ UN SEUL TOUR DE MICROTÂCHES SUFFIT, ET C'EST MESURÉ : les doubles rendent
 *  des promesses déjà résolues (`mockResolvedValue`). Si un double passait un
 *  jour à un vrai délai, ce vidage cesserait de suffire — et le compte
 *  remonterait, ce que la garde des plafonds ferait tomber. Elle est le filet de
 *  cette aide-ci. */
async function laisserRetomber(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

async function setup(
  over: {
    quotes?: Parameters<typeof makeQuotesDouble>[0];
    bookings?: Parameters<typeof makeBookingsProDouble>[0];
    services?: Parameters<typeof makeServicesDouble>[0];
    clients?: Parameters<typeof makeProClientsDouble>[0];
  } = {}
) {
  const quotes = makeQuotesDouble({ create: vi.fn().mockResolvedValue(draft()), ...over.quotes });
  const bookings = makeBookingsProDouble(over.bookings);
  // Rang 41 (D336) : le client des FICHES. Par défaut, aucune fiche n'est trouvée (K-1) et la création (K-2) rend la fiche des valeurs reçues, « fiche-1 ».
  const clients = makeProClientsDouble(over.clients);
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={makeVenueClientDouble(VENUE, { availability: availabilityDouble() })}
        quotesClient={quotes}
        servicesClient={makeServicesDouble(over.services)}
        bookingsPro={bookings}
        clientsClient={clients}
      >
        <WalkinJourney venue={VENUE} />
      </AppProviders>
    </MemoryRouter>
  );
  // ⚠ Le bootstrap d'`AppProviders` est encore en vol quand `render` rend la
  // main : c'est lui qui produisait 2 avertissements `AuthProvider` et 1
  // `WalkinJourney` dans CHACUN des 41 tests, soit 122 des 293.
  await laisserRetomber();
  return { quotes, bookings, clients };
}

/** ⛔ Rang 41 (D336) — répond à l'étape CONTACT, la PREMIÈRE (le numéro OU l'e-mail), et valide : la recherche de la fiche (K-1) part et retombe ici. */
async function repondreContact(saisie = "+213550000002") {
  fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: saisie } });
  fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
  await laisserRetomber();
  await laisserRetomber();
}

/** Répond à l'étape CLIENT — les NOMS et le nombre d'invités — et valide. ⚠ Le nombre d'invités est ICI, pas à
 *  l'étape des prestations : une prestation par personne se chiffre
 *  `unitPrice × guests`, donc la question précède forcément le catalogue.
 *  ⛔ Rang 41 : un nom dans UNE écriture suffit ; la fiche se CRÉE à ce « Continuer » (K-2), puis l'étape date apparaît. */
async function repondreNoms(invites = "200") {
  fireEvent.change(screen.getByLabelText("Nom en lettres latines"), { target: { value: "Amine Belkacem" } });
  fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: invites } });
  fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
  // ⚠ La création de la fiche retombe, PUIS l'étape date apparaît et MONTE
  // `VenueCalendar`, qui part aussitôt chercher sa disponibilité. Ses trois
  // `setState` (`setData`, `setError`, `setLoading`) retombent ici.
  await laisserRetomber();
  await laisserRetomber();
}

/** Les étapes CONTACT puis CLIENT. */
async function repondreClient(invites = "200") {
  await repondreContact();
  await repondreNoms(invites);
}

/** ⚠ On attend que la case soit ACTIVE, pas seulement présente. La grille du
 *  mois se dessine avant que la disponibilité n'arrive, et ses cases sont alors
 *  désactivées : cliquer trop tôt ne fait rien, et le test échouerait plus loin
 *  sur un symptôme sans rapport. */
async function repondreDate(jourVisible = /15/) {
  const jour = await screen.findByRole("button", { name: jourVisible });
  await waitFor(() => expect(jour).toBeEnabled());
  fireEvent.click(jour);
  // ⚠ Choisir la date fait REJOUER l'effet du calendrier — d'où 6 et non 3
  // dans les parcours qui vont au-delà de l'étape date. Le second passage se
  // reçoit comme le premier.
  await laisserRetomber();
}

async function repondreCreneau() {
  fireEvent.click(await screen.findByRole("button", { name: /Soirée/ }));
}

/** Le catalogue chargé, on valide sans rien cocher : « aucune prestation » est
 *  une réponse valable, et le flux doit l'accepter comme telle. */
async function repondrePrestations() {
  fireEvent.click(await screen.findByRole("button", { name: "Voir le devis" }));
}

async function allerAuDevis() {
  await repondreClient();
  await repondreDate();
  await repondreCreneau();
  await repondrePrestations();
}

/** ⚠ `getByRole("heading", { level: 2 })` était AMBIGU : le calendrier rend ses
 *  propres titres. On lit l'élément qui NOMME la carte d'étape — celui que
 *  `aria-labelledby` désigne, donc le nom accessible de la question. */
/** ⚠ DEUX commandes portent désormais le même nom accessible pour la même
 *  action : la pastille du rail et le bouton du récapitulatif (demande Ko).
 *  C'est juste pour un lecteur d'écran — c'est LA même action — mais un test
 *  doit dire laquelle il actionne. On passe donc par le conteneur.
 *  ⚠ Ne pas « corriger » cette ambiguïté en renommant l'un des deux : deux noms
 *  différents pour un même effet, c'est ce qu'il faut éviter. */
const recap = () => screen.getByRole("list", { name: "Réponses déjà données" });
const rail = () => screen.getByRole("navigation", { name: /Avancement/ });
const modifierDepuisRecap = (etape: RegExp) =>
  fireEvent.click(within(recap()).getByRole("button", { name: etape }));

const question = () => document.getElementById("wk-question")?.textContent;

describe("Flux par étapes — une seule question à l'écran", () => {
  it("s'ouvre sur la question du CONTACT (rang 41 : la première étape), et sur elle seule", async () => {
    await setup();
    expect(question()).toBe("Comment joindre le client ?");
    // ⚠ La mesure qui compte n'est pas « la question 1 est là » mais « les
    // autres n'y sont PAS » : c'est tout le sujet du lot.
    expect(screen.queryByRole("button", { name: /Soirée/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Voir le devis" })).toBeNull();
  });

  it("⚠ l'étape répondue QUITTE l'écran — c'est là que se mesure l'exclusivité", async () => {
    // Le harnais de neutralisation a montré que le test précédent ne mordait
    // pas : forcer l'étape Client à s'afficher en permanence le laissait vert,
    // parce qu'il ne regardait que les étapes SUIVANTES. Ce qui distingue un
    // flux exclusif d'un formulaire complet, c'est ce qui n'est PLUS là.
    await setup();
    await repondreContact();
    expect(screen.queryByLabelText("Téléphone")).toBeNull();
    await repondreNoms();
    expect(screen.queryByLabelText("Nom en lettres latines")).toBeNull();
    expect(screen.queryByLabelText("Nombre d'invités")).toBeNull();
  });

  it("chaque réponse fait apparaître la suivante, dans l'ordre arbitré", async () => {
    await setup();
    await repondreContact();
    expect(question()).toBe("Qui est le client ?");
    await repondreNoms();
    expect(question()).toBe("Quelle date ?");
    await repondreDate();
    expect(question()).toBe("Quel créneau ?");
    await repondreCreneau();
    expect(question()).toBe("Quelles prestations ?");
    await repondrePrestations();
    expect(question()).toBe("Devis");
  });

  it("⚠ ne laisse pas passer un client incomplet — le bouton reste inerte", async () => {
    await setup();
    // Rien de tapé, puis un numéro INCOMPLET : l'étape Contact retient.
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "5500" } });
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
    expect(question()).toBe("Comment joindre le client ?");
  });

  it("⚠ le nombre d'invités MANQUANT bloque aussi — il chiffre les prestations", async () => {
    await setup();
    await repondreContact();
    fireEvent.change(screen.getByLabelText("Nom en lettres latines"), { target: { value: "Amine Belkacem" } });
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
  });

  it("chaque champ client porte un LABEL visible — des cases nues ne se distinguent pas", async () => {
    await setup();
    // ⚠ Libellés EXACTS, pas des expressions régulières : /Nom/ attrapait aussi
    // « Nombre d'invités », et le test échouait sur son propre sélecteur.
    for (const nom of ["Téléphone", "E-mail"]) {
      expect(screen.getByLabelText(nom)).toBeInstanceOf(HTMLInputElement);
    }
    await repondreContact();
    for (const nom of ["Nom en arabe", "Nom en lettres latines", "Nombre d'invités"]) {
      expect(screen.getByLabelText(nom)).toBeInstanceOf(HTMLInputElement);
    }
  });

  it("le fil de progression NOMME l'étape courante pour un lecteur d'écran", async () => {
    await setup();
    const courant = () => screen.getByRole("navigation").querySelector('[aria-current="step"]');
    expect(courant()?.textContent).toContain("Contact");
    await repondreContact();
    expect(courant()?.textContent).toContain("Client");
    await repondreNoms();
    expect(courant()?.textContent).toContain("Date");
  });
});

describe("Récapitulatif — des réponses, JAMAIS des montants", () => {
  it("fige la réponse validée en ligne de récapitulatif", async () => {
    await setup();
    await repondreClient();
    const recapEl = recap();
    expect(recapEl.textContent).toContain("Amine Belkacem");
    expect(recapEl.textContent).toContain("Invités : 200");
  });

  it("⚠ AUCUN MONTANT dans le récapitulatif avant l'étape Devis", async () => {
    // C'est l'écart assumé avec la maquette, qui met le tarif du jour dans la
    // ligne « Date » et un sous-total dans celle des prestations, puis calcule
    // `Math.round(total * 0.3)` (D81/D188). Le test cherche l'unité monétaire :
    // aucun montant, quelle que soit sa valeur, ne doit s'y trouver.
    await setup();
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    const recapEl = recap();
    // ⚠ Un montant se reconnaît à sa DEVISE. Ma première version cherchait une
    // suite de chiffres et attrapait le NUMÉRO DE TÉLÉPHONE — un détecteur trop
    // large ne prouve pas ce qu'il croit prouver.
    expect(recapEl.textContent).not.toMatch(/DZD|\bDA\b/u);
    // Et nommément : le tarif du jour et le total, que la maquette y met.
    expect(recapEl.textContent).not.toContain(formatDZD(158_100_000));
    expect(recapEl.textContent).not.toContain(formatDZD(478_600_000));
  });

  it("n'affiche PAS l'étape en cours dans le récapitulatif — elle est déjà à l'écran", async () => {
    // ⚠ La première version cherchait « Quelle date » dans le récapitulatif —
    // qui n'y figure jamais, puisqu'il porte le LIBELLÉ d'étape et la réponse,
    // pas la question. Elle ne mordait donc rien. On revient sur l'étape Client
    // et on vérifie que sa réponse n'est pas affichée DEUX fois.
    await setup();
    await repondreClient();
    await repondreDate();
    modifierDepuisRecap(/Modifier.*Client/);
    const recapEl = recap();
    expect(recapEl.textContent).not.toContain("Amine Belkacem");
    expect(screen.getByLabelText("Nom en lettres latines")).toHaveValue("Amine Belkacem");
  });
});

describe("Retour en arrière — les réponses survivent, les montants non", () => {
  it("« Modifier » ramène à l'étape, sans rien effacer", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    modifierDepuisRecap(/Modifier.*Client/);
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText("Nom en lettres latines")).toHaveValue("Amine Belkacem");
  });

  it("⚠ NE REPLIE PAS le récapitulatif — écart assumé avec la maquette", async () => {
    // `editStep(n)` de la maquette remet `confirmedUpTo` à `n - 1` : corriger le
    // nom ferait disparaître la date du récapitulatif et obligerait à recliquer
    // « Continuer » quatre fois. Arbitrage Ko : les réponses survivent.
    await setup();
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    modifierDepuisRecap(/Modifier.*Client/);
    const recapEl = recap();
    expect(recapEl.textContent).toContain("Soirée");
    expect(recapEl.textContent).toContain(LIBRE);
  });

  it("valider une étape corrigée renvoie à la PREMIÈRE question sans réponse", async () => {
    await setup();
    await allerAuDevis();
    modifierDepuisRecap(/Modifier.*Client/);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    // Tout est répondu : on retombe au devis, pas au début du parcours.
    expect(question()).toBe("Devis");
  });
});

describe("Rail latéral, numéros cliquables et remise à zéro", () => {
  it("⚠ cliquer le NUMÉRO d'une étape répondue vaut « Modifier »", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    fireEvent.click(within(rail()).getByRole("button", { name: /Modifier.*Client/ }));
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText("Nom en lettres latines")).toHaveValue("Amine Belkacem");
  });

  it("⚠ une étape SANS réponse n'est pas cliquable dans le rail", async () => {
    // Un bouton qui n'agit pas est pire qu'un élément inerte : il promet une
    // commande. Les étapes non répondues restent de simples `<span>`.
    await setup();
    expect(within(rail()).queryAllByRole("button")).toHaveLength(0);
  });

  it("« Annuler » remet tout à zéro et ramène à la première question", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(question()).toBe("Comment joindre le client ?");
    expect((screen.getByLabelText("Téléphone") as HTMLInputElement).value).toBe("");
    expect(screen.getByLabelText("E-mail")).toHaveValue("");
    expect(recap().textContent).toBe("");
  });

  it("⚠ « Annuler » DISPARAÎT une fois l'affaire conclue — il n'annulerait rien", async () => {
    // Après `convert`, une demande existe en base. Un bouton qui viderait
    // l'écran laisserait croire qu'elle a été annulée. Elle ne l'aurait pas été.
    await setup({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" }))
      }
    });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await screen.findByRole("status");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull());
  });
});

describe("Date et créneau sont DEUX écrans", () => {
  // ⚠ La présence de la GRILLE se mesure sur la `<table>`, pas sur un jour.
  // Première version fautive : `queryByRole("button", { name: /^15$/ })` ne
  // correspondait à rien même grille affichée — le nom accessible d'un jour
  // porte son état et son tarif, pas seulement son numéro. Le test sortait vert
  // quelle que soit la valeur de `show`, relevé par le harnais.
  const grilleDuMois = () => screen.queryByRole("table");

  it("l'étape date montre la grille du mois, jamais les créneaux", async () => {
    await setup();
    await repondreClient();
    await waitFor(() => expect(grilleDuMois()).not.toBeNull());
    expect(screen.queryByRole("button", { name: /Soirée/ })).toBeNull();
  });

  it("⚠ l'étape créneau montre les créneaux, PAS la grille du mois", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    expect(await screen.findByRole("button", { name: /Soirée/ })).toBeInTheDocument();
    expect(grilleDuMois()).toBeNull();
  });
});

describe("La date vient du calendrier réel", () => {
  it("une date VENDUE ne mène à AUCUN créneau réservable — le moteur décide", async () => {
    // ⚠ Le refus porte sur le CRÉNEAU, pas sur le jour : le calendrier laisse
    // cliquer le 22 et désactive sa soirée. Première version de ce test écrite
    // sur l'hypothèse inverse — corrigée en lisant le comportement, pas en
    // affaiblissant l'assertion.
    await setup();
    await repondreClient();
    const vendu = await screen.findByRole("button", { name: /22/ });
    await waitFor(() => expect(vendu).toBeEnabled());
    fireEvent.click(vendu);
    expect(await screen.findByRole("button", { name: /Soirée/ })).toBeDisabled();
  });

  it("⚠ changer la date EFFACE le créneau, le DIT, et repose la question", async () => {
    // Le cas que la maquette n'a pas : garder à l'écran un créneau qui ne
    // s'applique plus serait pire que de le perdre.
    await setup({ services: { listForVenue: vi.fn().mockResolvedValue([]) } });
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    modifierDepuisRecap(/Modifier.*Date/);
    const autre = await screen.findByRole("button", { name: "16" });
    await waitFor(() => expect(autre).toBeEnabled());
    fireEvent.click(autre);
    expect(question()).toBe("Quel créneau ?");
    expect(screen.getByRole("status").textContent).toMatch(/créneau/i);
    // ⚠ ET SURTOUT : le créneau retenu a bel et bien DISPARU.
    // On ne peut PAS le vérifier ici : on est à l'étape créneau, et le
    // récapitulatif exclut l'étape en cours — la ligne « Soirée » serait absente
    // de toute façon. Mesure confondue, relevée par le harnais de
    // neutralisation. On va donc la chercher là où elle SERAIT visible si elle
    // avait survécu : depuis une autre étape.
    modifierDepuisRecap(/Modifier.*Client/);
    const recapEl = recap();
    expect(recapEl.textContent).not.toContain("Soirée");
    expect(recapEl.textContent).toContain(AUTRE);
  });
});

describe("⛔ Rang 39 (D333, DB-10, F-14) — la référence du devis, après « Calculer le devis »", () => {
  /** Verdict NATIF (D304, D316) : `findByText` échoue par une `TestingLibraryElementError`, qui n'est pas une assertion ; `waitFor(expect(queryByText…))` échoue par une `AssertionError`. */
  async function referenceAffichee(reference: string): Promise<HTMLElement> {
    await waitFor(() => expect(screen.queryByText(reference)).not.toBeNull());
    return screen.getByText(reference);
  }

  it("⛔ la référence rendue par le serveur s'affiche juste après le calcul, avec son libellé, isolée de gauche à droite", async () => {
    await setup();
    await allerAuDevis();
    expect(screen.queryByText(draft().reference), "aucune référence avant que le serveur ait chiffré").toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    const valeur = await referenceAffichee(draft().reference);
    expect(valeur.tagName.toLowerCase()).toBe("bdi");
    expect(valeur.getAttribute("dir")).toBe("ltr");
    expect(screen.queryByText(FR.reference)).not.toBeNull();
  });

  it("⛔ la révision remplace la référence par CELLE du serveur : même numéro, version 2 — l'écran n'incrémente rien, il affiche la réponse", async () => {
    const v2 = draft({ id: "q2", version: 2, reference: "DEVIS-2026-0003-0014 v2" });
    const { quotes } = await setup({ quotes: { create: vi.fn().mockResolvedValue(draft()), revise: vi.fn().mockResolvedValue(v2) } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await referenceAffichee(draft().reference);
    fireEvent.click(await screen.findByRole("button", { name: "Modifier le devis" }));
    await waitFor(() => expect(quotes.revise).toHaveBeenCalledTimes(1));
    await referenceAffichee(v2.reference);
    expect(screen.queryByText(draft().reference), "l'ancienne référence ne reste pas à l'écran").toBeNull();
  });

  it("⛔ en arabe : le libellé est arabe, la référence reste LATINE et isolée de gauche à droite", async () => {
    await setup();
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await referenceAffichee(draft().reference);
    await act(async () => void (await i18next.changeLanguage("ar")));
    const valeur = screen.getByText(draft().reference);
    expect(valeur.getAttribute("dir")).toBe("ltr");
    expect(screen.queryByText(AR.reference)).not.toBeNull();
    expect(FR.reference).not.toBe(AR.reference);
  });

  it("⛔ GARDE DE SOURCE — l'application Pro ne bâtit AUCUNE référence : ni `DEVIS-` ni `padStart` dans le parcours (la référence vient du serveur)", () => {
    const code = readFileSync(resolve(__dirname, "walkin-journey.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(/DEVIS-|padStart|formatQuoteReference/.exec(code)?.[0] ?? null).toBeNull();
    expect(code).toContain("quote.reference");
  });
});

describe("Un seul devis, révisé", () => {
  it("⚠ le second calcul RÉVISE la chaîne, il ne crée PAS un devis de plus", async () => {
    const { quotes } = await setup({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        revise: vi.fn().mockResolvedValue(draft({ version: 2 }))
      }
    });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await waitFor(() => expect(quotes.create).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "Modifier le devis" }));
    await waitFor(() => expect(quotes.revise).toHaveBeenCalledTimes(1));
    expect(quotes.create).toHaveBeenCalledTimes(1);
  });

  it("aucun montant total avant que le SERVEUR ait chiffré", async () => {
    await setup();
    await allerAuDevis();
    expect(screen.queryByText(montant(478_600_000))).toBeNull();
  });

  it("le total et l'acompte affichés sont ceux du devis, à l'unité près", async () => {
    await setup();
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    expect(await screen.findByText(montant(478_600_000))).toBeInTheDocument();
    expect(screen.getByText(montant(150_000_000))).toBeInTheDocument();
  });

  it("⚠ changer une condition JETTE le total et le dit — un total périmé est un mensonge", async () => {
    await setup();
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    expect(await screen.findByText(montant(478_600_000))).toBeInTheDocument();
    modifierDepuisRecap(/Modifier.*Créneau/);
    await repondreCreneau();
    expect(screen.queryByText(montant(478_600_000))).toBeNull();
    expect(screen.getByRole("status").textContent).toBeTruthy();
  });
});

describe("Le focus suit la question (R2d, désormais structurel)", () => {
  it("⚠ ne vole PAS le focus au premier rendu — personne n'a rien demandé", async () => {
    await setup();
    expect(document.activeElement).toBe(document.body);
  });

  it("emmène le focus sur la carte de l'étape à chaque transition", async () => {
    await setup();
    await repondreClient();
    await waitFor(() => {
      const carte = screen.getByRole("heading", { level: 2 }).closest("section");
      expect(document.activeElement).toBe(carte);
    });
  });

  it("fait aussi défiler, en une seule fois", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    await setup();
    // Une transition (Contact → Client) : un défilement, pas deux.
    await repondreContact();
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
  });
});

describe("Les deux issues (décision ⑥)", () => {
  async function jusquAuTotal(over: Parameters<typeof setup>[0] = {}) {
    const outils = await setup(over);
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    return outils;
  }

  it("« Bloquer la date » enchaîne convert → accept : c'est ACCEPT qui verrouille", async () => {
    const { quotes, bookings } = await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        convert: vi.fn().mockResolvedValue(draft({ status: "ACCEPTED", bookingId: "b1" }))
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Bloquer la date" }));
    await waitFor(() => expect(bookings.accept).toHaveBeenCalledWith("b1"));
    expect(quotes.convert).toHaveBeenCalledTimes(1);
  });

  it("⚠ « Enregistrer » n'appelle JAMAIS accept — le standby ne verrouille rien", async () => {
    const { bookings } = await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" }))
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    // ⚠ On attend l'annonce RÉELLE — « Enregistré en attente… », relevée du
    // catalogue et non inventée — et on vérifie qu'elle dit explicitement que
    // la date N'EST PAS bloquée. Un écran qui laisserait croire l'inverse serait
    // le mensonge que ce test existe pour empêcher.
    const annonce = await screen.findByRole("status");
    expect(annonce.textContent).toMatch(/n'est pas bloquée/i);
    expect(bookings.accept).not.toHaveBeenCalled();
  });

  it("la date prise entre-temps remonte l'erreur de la BASE, et l'écran ne dit pas « bloquée »", async () => {
    await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        convert: vi.fn().mockResolvedValue(draft({ status: "ACCEPTED", bookingId: "b1" }))
      },
      bookings: {
        accept: vi.fn().mockRejectedValue({ status: 409, body: { code: "BOOKING_SLOT_TAKEN", message: "k" } })
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Bloquer la date" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/date bloquée/i)).toBeNull();
  });

  it("⚠ sans e-mail, la clé est ABSENTE du corps — jamais une chaîne vide (D135)", async () => {
    const { quotes } = await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" }))
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await waitFor(() => expect(quotes.convert).toHaveBeenCalled());
    // ⚠ On assertit l'existence de l'appel AVANT d'indexer : `mock.calls[0]`
    // vaut `undefined` si rien n'a été appelé, et `in` sur `undefined` lève une
    // TypeError qui masquerait la vraie cause.
    const appels = (quotes.convert as ReturnType<typeof vi.fn>).mock.calls;
    expect(appels).toHaveLength(1);
    const corps = appels[0]?.[1] as Record<string, unknown>;
    expect("contactEmail" in corps).toBe(false);
  });
});

describe("La remise par canal (Q2) et le catalogue", () => {
  async function jusquAuTotal(over: Parameters<typeof setup>[0] = {}) {
    const outils = await setup(over);
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    return outils;
  }

  it("les cinq canaux sont RENDUS une fois le devis calculé ; tous sont actifs sauf « e-mail », qui exige une adresse valide (rang 33)", async () => {
    await jusquAuTotal();
    const groupe = screen.getByRole("group", { name: /remis/i });
    const boutons = Array.from(groupe.querySelectorAll("button"));
    expect(boutons).toHaveLength(QUOTE_SENT_VIA_ORDER.length);
    expect(boutons).toHaveLength(5);
    const libelles = messages.fr.venue.ui.quotes as Record<string, string>;
    for (const bouton of boutons) {
      expect(bouton.disabled, bouton.textContent as string).toBe(bouton.textContent === libelles[`sv_${QUOTE_SENT_VIA.EMAIL}`]);
    }
  });

  it("enregistre le canal cliqué sur le devis en cours", async () => {
    const { quotes } = await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        deliver: vi.fn().mockResolvedValue(draft({ sentVia: "SMS" }))
      }
    });
    const groupe = screen.getByRole("group", { name: /remis/i });
    const premier = Array.from(groupe.querySelectorAll("button"));
    expect(premier.length).toBeGreaterThan(0);
    fireEvent.click(premier[0] as HTMLButtonElement);
    // ⛔ Rang 38 (D332) : le clic ouvre la boîte de langue ; l'enregistrement part au CHOIX de la langue.
    const boite = await screen.findByRole("dialog", { name: messages.fr.venue.ui.walkin.langDialogTitle });
    expect(quotes.deliver).not.toHaveBeenCalled();
    fireEvent.click(within(boite).getByRole("button", { name: messages.fr.venue.ui.walkin.langFrench }));
    await waitFor(() => expect(quotes.deliver).toHaveBeenCalledWith("q1", { sentVia: expect.any(String) }));
  });

  it("le catalogue affiché est celui de la SALLE — aucune prestation inventée", async () => {
    await setup({
      services: {
        listForVenue: vi.fn().mockResolvedValue([
          { id: "sv1", nameFr: "Traiteur maison", nameAr: "مطعم", pricingType: "PER_GUEST", isActive: true }
        ])
      }
    });
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    expect(await screen.findByLabelText(/Traiteur maison/)).toBeInstanceOf(HTMLInputElement);
    expect(screen.queryByText(/décoration florale/i)).toBeNull();
  });

  it("⚠ un catalogue ILLISIBLE le dit — jamais « aucune prestation », qui est un autre fait (D133)", async () => {
    await setup({ services: { listForVenue: vi.fn().mockRejectedValue(new Error("boom")) } });
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    const message = await screen.findByRole("status");
    expect(message.textContent).toBeTruthy();
    expect(message.textContent).not.toMatch(/aucune prestation/i);
  });
});

// ── Point D — chrome de parcours PARTAGÉE (`@zwadj/ui/journey`) ─────────────
// ⚠ VOLET PRO du même contrôle que `apps/client/.../filter-wizard.test.tsx`.
// Il est écrit DES DEUX CÔTÉS à dessein : le lot corrige justement le fait que
// deux implémentations d'un même écran avaient divergé sans que personne ne le
// voie. Une garde d'un seul côté aurait reproduit le défaut qu'elle surveille.
describe("Point D — chrome partagée", () => {
  it("⚠⚠ LA CARTE EST REMONTÉE À CHAQUE ÉTAPE : c'est ce qui fait rejouer l'animation", async () => {
    // Défaut présent CÔTÉ PRO AUSSI, depuis la première livraison :
    // `animation: wk-step-in` était déclarée et n'a jamais rejoué, parce que
    // React réconciliait une `<section>` stable. On mesure l'identité du nœud
    // DOM — jsdom ne calcule pas les animations, et un test sur la classe CSS
    // serait resté vert pendant toute la durée du défaut.
    await setup();
    const avant = document.querySelector(".zj-card");
    await repondreClient();
    const apres = document.querySelector(".zj-card");
    expect(apres).not.toBeNull();
    expect(apres).not.toBe(avant);
  });

  it("le rail et le récapitulatif portent la chrome partagée ET la mise en page du Pro", async () => {
    // `grid-area` et la position collante restent propres à cet écran : si la
    // `className` d'app sautait, le rail quitterait sa colonne.
    await setup();
    expect(rail()).toHaveClass("zj-rail");
    expect(rail()).toHaveClass("wk-rail");
  });

  it("le bouton « Modifier » est le composant partagé, identique au client", async () => {
    await setup();
    await repondreClient();
    // Rang 41 (D336) : après l'étape Client, le récapitulatif a DEUX lignes (le contact, le client) — la règle vaut pour CHAQUE bouton, pas pour un exemple.
    const boutons = within(recap()).getAllByRole("button", { name: /Modifier/ });
    expect(boutons.length).toBeGreaterThanOrEqual(2);
    for (const bouton of boutons) expect(bouton).toHaveClass("zj-recap-edit");
  });

  it("⚠ TRAIT DE LIAISON : absent tant qu'il n'y a rien à relier, présent ensuite", async () => {
    await setup();
    expect(document.querySelector(".zj-connector")).toBeNull();
    await repondreClient();
    expect(document.querySelector(".zj-connector")).not.toBeNull();
  });

  it("la coche du rail est une icône, la même que côté client", async () => {
    await setup();
    await repondreClient();
    const faite = rail().querySelector("li.is-done .zj-rail-n");
    expect(faite?.querySelector("svg")).not.toBeNull();
  });
});

// ══ RANG 32 (D325) — RÉPARATIONS DU PARCOURS « NOUVELLE RÉSERVATION » ═══════════════════════════════════════════════════
// Chaque test répond à un point de la consigne de Ko, en français d'abord. ⚠ AUCUNE RÈGLE RECOPIÉE : le téléphone, le nom, l'e-mail viennent du
// CONTRAT (`@zwadj/types`), les textes du CATALOGUE (`messages`) — jamais retapés (D209 n° 6, D275). Les littéraux sont des SAISIES.
const FR = messages.fr.venue.ui.walkin;
const AR = messages.ar.venue.ui.walkin;
const PAYS = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];
const FR_PHONE = messages.fr.common.phone;
/** Un premier chiffre que le modèle REFUSE. */
const MAUVAIS_PREMIER = [..."0123456789"].find((c) => !PAYS.leadingDigits.includes(c)) as string;

afterEach(async () => {
  // Un test d'arabe ne doit pas laisser la page en arabe au suivant.
  if (i18next.language !== "fr") await act(async () => void (await i18next.changeLanguage("fr")));
});

/** Une FRAPPE, un caractère à la fois : la valeur d'après est la valeur d'avant plus le caractère. */
function frapper(champ: HTMLElement, texte: string) {
  for (const caractere of texte) fireEvent.change(champ, { target: { value: (champ as HTMLInputElement).value + caractere } });
}
const telephone = () => screen.getByLabelText(FR.phone) as HTMLInputElement;
/** Les raisons qui retiennent « Continuer » : le texte de la liste que `aria-describedby` désigne. */
function raisonsDuBouton(): string[] {
  const bouton = screen.getByRole("button", { name: FR.continue });
  const id = bouton.getAttribute("aria-describedby");
  if (id === null) return [];
  return [...(document.getElementById(id) as HTMLElement).querySelectorAll("li")].map((li) => li.textContent as string);
}
const phraseCatalogue = (texte: string) => texte.replace("{length}", String(PAYS.nationalLength));

describe("Point 1 — le téléphone : le champ PARTAGÉ, la règle du CONTRAT", () => {
  it("l'indicatif et le drapeau sont devant le champ, venus du modèle de pays ; ce qui se tape ne les contient pas", async () => {
    await setup();
    expect(screen.getByRole("img", { name: `${FR_PHONE.country[DEFAULT_PHONE_COUNTRY]}, ${PAYS.dialCode}` })).toBeInTheDocument();
    expect(telephone().value).toBe("");
  });

  it("seuls les chiffres passent, au plus la longueur du modèle", async () => {
    await setup();
    frapper(telephone(), `${PAYS.leadingDigits.charAt(0)}a1b2c3d4e5f6g7h8i9`);
    expect(telephone().value).toMatch(new RegExp(`^\\d{${PAYS.nationalLength}}$`));
  });

  it("⚠ un premier chiffre refusé s'affiche SEUL avec son message ; la saisie suivante est bloquée ; « Continuer » dit pourquoi", async () => {
    await setup();
    frapper(telephone(), MAUVAIS_PREMIER);
    frapper(telephone(), "55");
    expect(telephone().value).toBe(MAUVAIS_PREMIER);
    expect(within(screen.getByRole("alert")).getByText(FR_PHONE.leadingDigit[DEFAULT_PHONE_COUNTRY])).toBeInTheDocument();
    expect(raisonsDuBouton()).toContain(FR.needPhoneLeading);
  });

  it("le texte d'aide dit la longueur du modèle (plus de « 8 à 9 »)", async () => {
    await setup();
    expect(screen.getByText(FR.phoneHint)).toBeInTheDocument();
    expect(FR.phoneHint).toContain(String(PAYS.nationalLength));
    expect(FR.phoneHint).not.toMatch(/8 à 9/);
  });

  it("⚠ LE FORMAT ENVOYÉ À L'API n'a pas changé : l'indicatif puis les chiffres saisis, à la conversion", async () => {
    const { quotes } = await setup({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" }))
      }
    });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await waitFor(() => expect(quotes.convert).toHaveBeenCalled());
    const corps = (quotes.convert as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    // `repondreClient` colle « +213550000002 » : les chiffres saisis sont « 550000002 ».
    expect(corps.contactPhone).toBe(`${PAYS.dialCode}550000002`);
    expect(corps.contactFirstName).toBe("Amine");
    expect(corps.contactLastName).toBe("Belkacem");
  });
});

describe("Point 2 — nom et prénom : lettres de toute écriture, espaces, « - » et « ' »", () => {
  it("⚠ un chiffre ou un symbole est refusé, sous le champ, et « Continuer » le dit", async () => {
    await setup();
    // Rang 41 (D336) : les noms sont à l'étape CLIENT, après le contact — un nom par écriture.
    await repondreContact();
    fireEvent.change(screen.getByLabelText(FR.nameLatin), { target: { value: "Amine1" } });
    const champ = screen.getByLabelText(FR.nameLatin);
    expect(champ).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(champ.getAttribute("aria-describedby") as string)).toHaveTextContent(FR.nameLatinInvalid);
    // L'erreur d'un champ est une ALERTE : un lecteur d'écran l'annonce à son apparition. Verdict en assertion NATIVE (D304, D316) — c'est ce que mesure la cible N-11
    // de `neutralisation/neutralize-r32.py` ; sans cette ligne, perdre le rôle `alert` laissait les 75 tests verts.
    expect(screen.queryAllByRole("alert").map((e) => e.textContent)).toEqual([FR.nameLatinInvalid]);
    fireEvent.change(screen.getByLabelText(FR.nameAr), { target: { value: "أمين@" } });
    expect(screen.getByLabelText(FR.nameAr)).toHaveAttribute("aria-invalid", "true");
    expect(raisonsDuBouton()).toEqual(expect.arrayContaining([FR.needNameArValid, FR.needNameLatinValid]));
  });

  it("le français accentué, les noms composés, l'apostrophe et L'ARABE passent — le champ n'est pas en erreur", async () => {
    await setup();
    await repondreContact();
    for (const nom of ["Éloïse", "Jean-Pierre", "O'Brien", "أمينة"]) {
      fireEvent.change(screen.getByLabelText(FR.nameLatin), { target: { value: nom } });
      expect(screen.getByLabelText(FR.nameLatin), nom).not.toHaveAttribute("aria-invalid");
    }
    fireEvent.change(screen.getByLabelText(FR.nameAr), { target: { value: "أَمِينَة بن علي" } });
    expect(screen.getByLabelText(FR.nameAr)).not.toHaveAttribute("aria-invalid");
  });
});

describe("Point 3 — l'e-mail : la règle du contrat, importée", () => {
  it("le champ refuse exactement ce que `isValidContactEmail` refuse — le serveur applique la même fonction", async () => {
    await setup();
    let verdictsFaux = 0;
    // Rang 41 (D336) : l'e-mail de l'étape CONTACT ; celui de la conversion suit la même règle (`fieldErrors`, mesuré par `walkin-contact.test.ts`).
    for (const adresse of ["amine@example.com", "amine@", "pas une adresse", "a@b.co", "@example.com"]) {
      fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: adresse } });
      const refuse = screen.getByLabelText(FR.contactEmail).getAttribute("aria-invalid") === "true";
      expect(refuse, adresse).toBe(!isValidContactEmail(adresse));
      if (refuse) verdictsFaux += 1;
    }
    // La comparaison DISCRIMINE : des adresses refusées ET des adresses acceptées.
    expect(verdictsFaux).toBeGreaterThan(0);
    expect(verdictsFaux).toBeLessThan(5);
  });

  it("vide, l'e-mail ne retient rien (D135) ; refusé, il retient « Continuer » avec sa raison", async () => {
    await setup();
    // Le numéro est là : l'e-mail est alors facultatif ; saisi, il doit passer la règle du contrat.
    fireEvent.change(telephone(), { target: { value: "+213550000002" } });
    fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: "amine@" } });
    expect(raisonsDuBouton()).toContain(FR.needEmailValid);
    fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: "" } });
    expect(raisonsDuBouton()).not.toContain(FR.needEmailValid);
  });
});

describe("Point 4 — un exemple du format dans chaque champ, qui ne remplace JAMAIS le libellé", () => {
  /** Rang 41 (D336) : les champs vivent sur TROIS écrans — le contact, le client, la conversion (K-12). Chacun est vérifié là où il s'affiche. */
  const CONTACT_CHAMPS: [string, string, string][] = [
    [FR.phone, FR_PHONE.placeholder[DEFAULT_PHONE_COUNTRY], "téléphone"],
    [FR.contactEmail, FR.emailPlaceholder, "e-mail du contact"]
  ];
  const CLIENT_CHAMPS: [string, string, string][] = [
    [FR.nameAr, FR.nameArPlaceholder, "nom en arabe"],
    [FR.nameLatin, FR.nameLatinPlaceholder, "nom en lettres latines"],
    [FR.guests, FR.guestsPlaceholder, "invités"]
  ];
  const CONVERSION_CHAMPS: [string, string, string][] = [
    [FR.firstName, FR.firstNamePlaceholder, "prénom"],
    [FR.lastName, FR.lastNamePlaceholder, "nom"],
    [FR.phone, FR_PHONE.placeholder[DEFAULT_PHONE_COUNTRY], "téléphone de la conversion"],
    [FR.email, FR.emailPlaceholder, "e-mail"]
  ];
  function verifier(champs: [string, string, string][]) {
    for (const [libelle, exemple, nom] of champs) {
      const champ = screen.getByLabelText(libelle) as HTMLInputElement;
      expect(champ.placeholder, nom).toBe(exemple);
      expect(champ.placeholder, nom).not.toBe("");
      expect(champ.placeholder, nom).not.toBe(libelle);
      expect(screen.getByText(libelle, { selector: "label" }), nom).toBeVisible();
    }
  }

  it("chaque champ porte son exemple, ET son libellé visible reste là, lié au champ (D143)", async () => {
    await setup();
    verifier(CONTACT_CHAMPS);
    await repondreContact();
    verifier(CLIENT_CHAMPS);
    await repondreNoms();
    await repondreDate();
    await repondreCreneau();
    await repondrePrestations();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    verifier(CONVERSION_CHAMPS);
  });

  it("⚠ AUCUNE vraie donnée : le téléphone est un gabarit (« X »), l'e-mail est sur example.com, aucun nom n'est une personne", async () => {
    await setup();
    const gabarit = (screen.getByLabelText(FR.phone) as HTMLInputElement).placeholder;
    expect(gabarit).toMatch(/X/);
    expect(gabarit.replace(/\D/g, "").length).toBeLessThan(PAYS.nationalLength);
    expect((screen.getByLabelText(FR.contactEmail) as HTMLInputElement).placeholder).toMatch(/@example\.com$/);
    expect(AR.emailPlaceholder).toMatch(/@example\.com$/);
    // Les exemples de nom sont introduits comme tels (« Ex. : », « مثال: ») — pas présentés comme la saisie d'une personne.
    for (const cle of ["firstNamePlaceholder", "nameArPlaceholder", "nameLatinPlaceholder"] as const) {
      expect(FR[cle], cle).toMatch(/^Ex\. :/);
      expect(AR[cle], cle).toMatch(/^مثال:/);
    }
  });

  it("le même exemple existe en ARABE, pour chacun des champs", () => {
    for (const cle of ["firstNamePlaceholder", "lastNamePlaceholder", "nameArPlaceholder", "nameLatinPlaceholder", "emailPlaceholder", "guestsPlaceholder"] as const) {
      expect(AR[cle], cle).toBeTruthy();
      expect(AR[cle], cle).not.toBe(FR[cle]);
    }
    expect(messages.ar.common.phone.placeholder[DEFAULT_PHONE_COUNTRY]).toBeTruthy();
  });
});

describe("Point 5 — « Continuer » grisé : la RAISON PRÉCISE, liée au bouton", () => {
  it("tout est vide : la liste nomme CHAQUE manque de l'étape, et le bouton la désigne par `aria-describedby`", async () => {
    await setup();
    const bouton = screen.getByRole("button", { name: FR.continue });
    expect(bouton).toBeDisabled();
    expect(bouton).toHaveAccessibleDescription(new RegExp(FR.continueBlockedLead.replace(/[«»]/g, ".")));
    // Rang 41 (D336) : l'étape Contact ne retient que l'ABSENCE d'identifiant ; l'étape Client, l'absence de nom puis d'invités.
    expect(raisonsDuBouton()).toEqual([FR.needIdentifier]);
    await repondreContact();
    expect(raisonsDuBouton()).toEqual([FR.needName, FR.needGuests]);
  });

  it("⚠ UN SEUL manque : « le nombre d'invités est obligatoire » — et rien d'autre", async () => {
    await setup();
    await repondreContact();
    fireEvent.change(screen.getByLabelText(FR.nameLatin), { target: { value: "Amine Belkacem" } });
    expect(raisonsDuBouton()).toEqual([FR.needGuests]);
    expect(FR.needGuests).toBe("le nombre d'invités est obligatoire");
  });

  it("un numéro INCOMPLET se dit avec la longueur du modèle", async () => {
    await setup();
    frapper(telephone(), PAYS.leadingDigits.charAt(0) + "1".repeat(PAYS.nationalLength - 2));
    expect(raisonsDuBouton()).toContain(phraseCatalogue(FR.needPhoneIncomplete));
  });

  it("tout répondu : plus de liste, plus de description, le bouton s'active", async () => {
    await setup();
    await repondreContact();
    fireEvent.change(screen.getByLabelText(FR.nameLatin), { target: { value: "Amine Belkacem" } });
    fireEvent.change(screen.getByLabelText(FR.guests), { target: { value: "200" } });
    const bouton = screen.getByRole("button", { name: FR.continue });
    expect(bouton).toBeEnabled();
    expect(bouton).not.toHaveAttribute("aria-describedby");
    expect(document.getElementById("wk-continue-reason")).toBeNull();
  });
});

describe("Libellés liés aux champs — en arabe aussi", () => {
  it("⚠ en ARABE, chaque libellé pointe son PROPRE champ (l'identifiant ne vient plus des lettres latines du libellé)", async () => {
    await setup();
    // Rang 41 (D336) : deux écrans, deux contrôles — le contact, puis les noms (le champ des invités a un identifiant fixe, `wk-guests`).
    const propres = (noms: string[]) => {
      const champs = noms.map((nom) => screen.getByLabelText(nom));
      expect(new Set(champs).size).toBe(noms.length);
      for (const champ of champs) expect(champ).toBeInstanceOf(HTMLInputElement);
      expect(new Set(champs.map((c) => c.id)).size).toBe(noms.length);
    };
    await act(async () => void (await i18next.changeLanguage("ar")));
    propres([AR.phone, AR.contactEmail]);
    fireEvent.change(screen.getByLabelText(AR.phone), { target: { value: "+213550000002" } });
    fireEvent.click(screen.getByRole("button", { name: AR.continue }));
    await laisserRetomber();
    await laisserRetomber();
    propres([AR.nameAr, AR.nameLatin]);
  });

  it("⚠ chaque libellé du formulaire porte `for` = l'identifiant d'UN champ qui existe, et deux libellés ne visent jamais le même — en français comme en arabe", async () => {
    await setup();
    const controler = async (minimum: number) => {
      for (const langue of ["fr", "ar"] as const) {
        await act(async () => void (await i18next.changeLanguage(langue)));
        const libelles = Array.from(document.querySelectorAll("label.wk-label"));
        expect(libelles.length, langue).toBeGreaterThanOrEqual(minimum);
        const cibles = libelles.map((l) => l.getAttribute("for"));
        // Verdicts NATIFS (D304, D316) : `getByLabelText` lève une erreur de REQUÊTE quand le lien manque, pas une assertion — c'est ce que mesure la cible N-12.
        for (const cible of cibles) {
          expect(cible, langue).toBeTruthy();
          expect(document.getElementById(cible as string), langue).not.toBeNull();
        }
        expect(new Set(cibles).size, langue).toBe(cibles.length);
      }
      await act(async () => void (await i18next.changeLanguage("fr")));
    };
    // L'étape Contact (téléphone, e-mail), puis l'étape Client (deux noms, invités).
    await controler(2);
    await repondreContact();
    await controler(3);
  });
});

describe("Point 8 — les libellés du rail sont cliquables comme leur pastille, avec les mêmes règles", () => {
  it("le LIBELLÉ d'une étape répondue ramène à elle, sans rien effacer", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    expect(question()).toBe("Quel créneau ?");
    fireEvent.click(within(rail()).getByText("Client"));
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText(FR.nameLatin)).toHaveValue("Amine Belkacem");
  });

  it("⚠ le libellé et la pastille sont UN seul bouton — deux commandes de même nom côte à côte seraient deux arrêts de tabulation", async () => {
    await setup();
    await repondreClient();
    const boutons = within(rail()).getAllByRole("button", { name: /Modifier.*Client/ });
    expect(boutons).toHaveLength(1);
    expect(within(boutons[0] as HTMLElement).getByText("Client")).toBeInTheDocument();
  });

  it("⚠ on ne saute PAS une étape incomplète : le libellé d'une étape sans réponse n'est dans aucun bouton", async () => {
    await setup();
    await repondreClient();
    for (const libelle of ["Créneau", "Prestations", "Devis"]) {
      expect(within(rail()).getByText(libelle).closest("button"), libelle).toBeNull();
    }
    fireEvent.click(within(rail()).getByText("Prestations"));
    expect(question()).toBe("Quelle date ?");
  });

  it("l'étape COURANTE n'est pas cliquable non plus : « Modifier » n'existerait pas", async () => {
    await setup();
    await repondreClient();
    expect(within(rail()).getByText("Date").closest("button")).toBeNull();
  });
});

describe("Point 9 — « Précédent » à gauche, « Continuer » à droite", () => {
  it("absent à la première étape ; présent aux suivantes, et il ramène à l'étape d'avant SANS rien effacer", async () => {
    await setup();
    expect(screen.queryByRole("button", { name: FR.previous })).toBeNull();
    // Rang 41 (D336) : la première étape est le CONTACT ; « Précédent » de l'étape Client y ramène, le numéro intact.
    await repondreContact();
    fireEvent.click(screen.getByRole("button", { name: FR.previous }));
    expect(question()).toBe("Comment joindre le client ?");
    expect(telephone().value).toBe("550000002");
    await repondreContact();
    await repondreNoms();
    fireEvent.click(screen.getByRole("button", { name: FR.previous }));
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText(FR.nameLatin)).toHaveValue("Amine Belkacem");
  });

  it("de l'étape des prestations à celle du créneau, le créneau retenu SURVIT", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    expect(question()).toBe("Quelles prestations ?");
    fireEvent.click(screen.getByRole("button", { name: FR.previous }));
    // Revenir au créneau REMONTE le calendrier, qui part chercher sa disponibilité : ses `setState` retombent ici.
    await laisserRetomber();
    expect(question()).toBe("Quel créneau ?");
    // L'étape courante est exclue du récapitulatif (elle est à l'écran) : la réponse se lit sur le créneau lui-même, retenu.
    expect(await screen.findByRole("button", { name: /Soirée/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("⚠ DANS LE DOM, « Précédent » PRÉCÈDE « Voir le devis » : à gauche en français, et la page arabe le reflète (le sens de la page, pas une propriété physique)", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    const precedent = screen.getByRole("button", { name: FR.previous });
    const suivant = screen.getByRole("button", { name: "Voir le devis" });
    expect(precedent.compareDocumentPosition(suivant) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(precedent.parentElement).toBe(suivant.parentElement);
  });

  it("une fois l'affaire conclue, « Précédent » disparaît — il ne propose plus de modifier ce qui est écrit", async () => {
    await setup({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" }))
      }
    });
    await allerAuDevis();
    expect(screen.getByRole("button", { name: FR.previous })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await screen.findByRole("status");
    expect(screen.queryByRole("button", { name: FR.previous })).toBeNull();
  });
});

describe("Points 10 et 11 — « Nouveau devis » et la fenêtre de confirmation, APRÈS la réponse du serveur", () => {
  async function jusquAuTotal(over: Parameters<typeof setup>[0] = {}) {
    const outils = await setup(over);
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    return outils;
  }
  const convertir = (status = "SENT") => vi.fn().mockResolvedValue(draft({ status: status as QuoteDTO["status"], bookingId: "b1" }));
  /** La date de la fixture, en toutes lettres, dans la langue de la page — formatée par `Intl` seul, hors du composant. */
  const dateLongue = (civil: string, langue: string) =>
    new Intl.DateTimeFormat(langue, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${civil}T00:00:00Z`));

  it("« Nouveau devis » n'est PAS là avant la conclusion — « Annuler » l'est", async () => {
    await setup();
    expect(screen.queryByRole("button", { name: FR.newQuote })).toBeNull();
    expect(screen.getByRole("button", { name: FR.reset })).toBeInTheDocument();
  });

  it("⚠ après « Enregistrer sans bloquer » : « Nouveau devis » REMPLACE « Annuler », et il repart de l'étape 1, formulaire vidé", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), convert: convertir() } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: FR.doneDialogClose }));
    expect(screen.queryByRole("button", { name: FR.reset })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: FR.newQuote }));
    // Rang 41 (D336) : l'étape 1 est le CONTACT, vidé ; l'étape Client l'est aussi (on y revient en répondant de nouveau).
    expect(question()).toBe("Comment joindre le client ?");
    expect(screen.getByLabelText(FR.contactEmail)).toHaveValue("");
    expect(telephone().value).toBe("");
    expect(recap().textContent).toBe("");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: FR.newQuote })).toBeNull();
    expect(screen.getByRole("button", { name: FR.reset })).toBeInTheDocument();
  });

  it("⚠ la fenêtre ne s'ouvre PAS avant la réponse du serveur : elle attend `convert`", async () => {
    let repondre: (q: QuoteDTO) => void = () => undefined;
    const attente = new Promise<QuoteDTO>((resolve) => {
      repondre = resolve;
    });
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), convert: vi.fn().mockReturnValue(attente) } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await laisserRetomber();
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => repondre(draft({ status: "SENT", bookingId: "b1" })));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("⚠ « Bloquer la date » : la fenêtre attend `accept` aussi, et ne s'ouvre pas si la date a été prise", async () => {
    let accepter: () => void = () => undefined;
    const attente = new Promise<void>((resolve) => {
      accepter = resolve;
    });
    await jusquAuTotal({
      quotes: { create: vi.fn().mockResolvedValue(draft()), convert: convertir("ACCEPTED") },
      bookings: { accept: vi.fn().mockReturnValue(attente) }
    });
    fireEvent.click(screen.getByRole("button", { name: "Bloquer la date" }));
    await laisserRetomber();
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => accepter());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("⚠ un ÉCHEC du serveur laisse la fenêtre fermée — l'erreur s'affiche, aucune confirmation", async () => {
    await jusquAuTotal({
      quotes: { create: vi.fn().mockResolvedValue(draft()), convert: convertir("ACCEPTED") },
      bookings: { accept: vi.fn().mockRejectedValue({ status: 409, body: { code: "BOOKING_SLOT_TAKEN", message: "k" } }) }
    });
    fireEvent.click(screen.getByRole("button", { name: "Bloquer la date" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("la fenêtre dit l'ACTION, la DATE et le CLIENT — « enregistrée » pour l'un, « bloquée » pour l'autre", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), convert: convertir() } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    const standby = await screen.findByRole("dialog", { name: FR.doneTitleStandby });
    const dit = standby.textContent as string;
    expect(dit).toContain(dateLongue(LIBRE, "fr"));
    expect(dit).toContain("Amine Belkacem");
    expect(dit).toMatch(/enregistrée/);
    expect(dit).toMatch(/sans être bloquée/);
  });

  it("« Bloquer la date » : « Date bloquée », avec la date et le client", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), convert: convertir("ACCEPTED") } });
    fireEvent.click(screen.getByRole("button", { name: "Bloquer la date" }));
    const verrou = await screen.findByRole("dialog", { name: FR.doneTitleLocked });
    expect(verrou.textContent).toContain(dateLongue(LIBRE, "fr"));
    expect(verrou.textContent).toContain("Amine Belkacem");
    expect(verrou.textContent).toMatch(/bloquée/);
  });

  it("en ARABE, la fenêtre se dit dans la langue de la page, avec la date dans cette langue", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), convert: convertir() } });
    await act(async () => void (await i18next.changeLanguage("ar")));
    fireEvent.click(screen.getByRole("button", { name: AR.standby }));
    const fenetre = await screen.findByRole("dialog", { name: AR.doneTitleStandby });
    expect(fenetre.textContent).toContain(dateLongue(LIBRE, "ar"));
  });

  it("la fenêtre se ferme par son bouton, sans rien défaire : la demande reste inscrite à l'écran", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), convert: convertir() } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: FR.doneDialogClose }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

// ══ RANG 33 (D326) — LES BOUTONS DE REMISE : ENREGISTRER LE CANAL ET TÉLÉCHARGER LE PDF, EN DISANT CE QUI A RÉELLEMENT EU LIEU ═══════════════════════════════════════
// Chaque test répond à une phrase de Ko ou à une décision du relecteur, en français d'abord. ⚠ AUCUN MONTANT n'est calculé ici ni dans le composant : le PDF vient du
// SERVEUR (`quotes.document`), le test ne vérifie que ce que l'écran lui DEMANDE, ce qu'il en FAIT et ce qu'il en DIT. Les libellés viennent du catalogue.
// ⛔ RANG 38 (D332) : chaque bouton ouvre D'ABORD la boîte de langue (décision A de Ko, D327) ; ce qui suit — l'enregistrement, le PDF, la fenêtre — part au CHOIX du pro.
describe("Rang 33 — cinq canaux, le PDF et la fenêtre", () => {
  async function jusquAuTotal(over: Parameters<typeof setup>[0] = {}) {
    const outils = await setup(over);
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    return outils;
  }
  /** Les cinq boutons, dans l'ordre de la liste d'AUTORITÉ, chacun par son libellé de catalogue. */
  const bouton = (canal: QuoteSentVia, langue: "fr" | "ar" = "fr") =>
    screen.getByRole("button", { name: (messages[langue].venue.ui.quotes as Record<string, string>)[`sv_${canal}`] as string });
  /** La boîte de langue, dans la langue de l'INTERFACE. ⚠ Verdict NATIF : `queryByRole` rend `null` quand la boîte est absente (un `getByRole` lèverait une erreur de requête, pas une assertion — D304). */
  const boiteDeLangue = (langueInterface: "fr" | "ar" = "fr") =>
    screen.queryByRole("dialog", { name: messages[langueInterface].venue.ui.walkin.langDialogTitle });
  const etiquetteLangue = (langueDuPdf: "fr" | "ar", langueInterface: "fr" | "ar" = "fr") =>
    messages[langueInterface].venue.ui.walkin[langueDuPdf === "fr" ? "langFrench" : "langArabic"];
  /** Choisit la langue du PDF dans la boîte ouverte, puis laisse retomber le travail lancé. */
  async function choisir(langueDuPdf: "fr" | "ar", langueInterface: "fr" | "ar" = "fr") {
    const boite = boiteDeLangue(langueInterface);
    expect(boite, "la boîte de langue est ouverte").not.toBeNull();
    await act(async () => {
      fireEvent.click(within(boite as HTMLElement).getByRole("button", { name: etiquetteLangue(langueDuPdf, langueInterface) }));
    });
    await laisserRetomber();
    await laisserRetomber();
  }
  /** Un clic sur le canal (la boîte s'ouvre), puis le choix de la langue du PDF : l'enregistrement ET le PDF partent ensemble et se règlent hors du clic. */
  async function cliquer(canal: QuoteSentVia, langueDuPdf: "fr" | "ar" = "fr", langueInterface: "fr" | "ar" = "fr") {
    await act(async () => {
      fireEvent.click(bouton(canal, langueInterface));
    });
    await choisir(langueDuPdf, langueInterface);
  }
  const echec = (code: string, cle: string, status = 409) => new ApiError(status, code, cle, []);
  const fichier = () => new Blob(["%PDF-1.4"], { type: "application/pdf" });
  /** Rang 41 (D336, K-5) — un devis qui porte les DEUX copies du nom : le PDF part dans l'une ou l'autre langue SANS question. Sans la copie arabe,
   *  choisir « العربية » pose d'abord la question du nom (mesuré par le bloc D336, en fin de fichier) — d'où ce devis pour les tests qui choisissent l'arabe. */
  const deuxCopies = () => draft({ clientNameAr: "أمين بلقاسم" });

  beforeEach(() => {
    vi.mocked(saveBlob).mockClear();
    vi.mocked(onQuoteRemitted).mockClear();
  });

  it("cinq canaux, dans l'ordre de la liste d'autorité — l'e-mail est le CINQUIÈME bouton, rangé à côté du SMS", async () => {
    await jusquAuTotal();
    const groupe = screen.getByRole("group", { name: /remis/i });
    const boutons = Array.from(groupe.querySelectorAll("button")).map((b) => b.textContent);
    const libelles = messages.fr.venue.ui.quotes as Record<string, string>;
    expect(boutons).toEqual(QUOTE_SENT_VIA_ORDER.map((canal) => libelles[`sv_${canal}`]));
    expect(boutons).toHaveLength(5);
    expect(boutons).toContain("Envoyé par e-mail");
  });

  it("le canal « e-mail » est INACTIF sans adresse, et la raison est liée au bouton ; le mobile saisi active le SMS et le téléphone", async () => {
    await jusquAuTotal();
    expect((bouton(QUOTE_SENT_VIA.EMAIL) as HTMLButtonElement).disabled).toBe(true);
    const raison = bouton(QUOTE_SENT_VIA.EMAIL).getAttribute("aria-describedby");
    expect(raison).not.toBeNull();
    const zoneRaison = document.getElementById(raison as string);
    expect(zoneRaison, "la raison liée au bouton existe dans la page").not.toBeNull();
    expect(zoneRaison?.textContent).toContain(FR.deliverEmailRequired);
    // Le mobile a été saisi (étape Client) : ces deux-là sont actifs, et la raison de l'e-mail n'est PAS liée à eux.
    for (const canal of [QUOTE_SENT_VIA.PRINT, QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.IN_PERSON, QUOTE_SENT_VIA.PHONE]) {
      expect((bouton(canal) as HTMLButtonElement).disabled, canal).toBe(false);
      expect(bouton(canal).getAttribute("aria-describedby"), canal).toBeNull();
    }
  });

  it("avec une adresse valide à l'étape Contact, le canal « e-mail » est ACTIF", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: "amine@example.com" } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    expect((bouton(QUOTE_SENT_VIA.EMAIL) as HTMLButtonElement).disabled).toBe(false);
    expect(bouton(QUOTE_SENT_VIA.EMAIL).getAttribute("aria-describedby")).toBeNull();
  });

  it("⛔ chaque bouton fait DEUX choses, APRÈS le choix de la langue : enregistre le canal sur le devis en cours ET demande le PDF de CE devis dans la langue CHOISIE, et rien d'autre", async () => {
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      const deliver = vi.fn().mockResolvedValue(draft({ sentVia: canal }));
      const document = vi.fn().mockResolvedValue(fichier());
      await jusquAuTotalAvecEmail({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver, document } });
      await cliquer(canal, "fr");
      expect(deliver, canal).toHaveBeenCalledWith("q1", { sentVia: canal });
      // Le client n'envoie AUCUN montant au serveur : le PDF imprime les valeurs STOCKÉES (règle des montants).
      expect(document, canal).toHaveBeenCalledWith("q1", "fr");
      expect(saveBlob, canal).toHaveBeenCalledTimes(1);
      cleanup();
      vi.mocked(saveBlob).mockClear();
    }
  });

  it("le fichier téléchargé porte le nom que le SERVEUR donne : une seule formule, sans donnée personnelle", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    expect(saveBlob).toHaveBeenCalledTimes(1);
    const [blob, nom] = vi.mocked(saveBlob).mock.calls[0] as [Blob, string];
    expect(blob).toBeInstanceOf(Blob);
    expect(nom).toBe(quoteDocumentFilename(draft(), "fr"));
    // Rang 39 (K-7) : le nom est la référence du devis, la langue CHOISIE et la version — construit ici par de simples chaînes, sans la fonction testée.
    expect(nom).toBe(`${draft().reference.replace(" v1", "_fr_v1")}.pdf`);
    expect(nom).not.toMatch(/Amine|Belkacem|El Ryad/);
  });

  it("⛔ rang 39 (F-15) : le nom du fichier porte la langue CHOISIE dans la boîte, pas celle de l'interface — « العربية » sur une page française donne `_ar_`, « Français » sur une page arabe donne `_fr_`", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(deuxCopies()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
    await cliquer(QUOTE_SENT_VIA.PRINT, "ar", "fr");
    expect(vi.mocked(saveBlob).mock.calls[0]![1]).toBe(`${draft().reference.replace(" v1", "_ar_v1")}.pdf`);
    cleanup();
    vi.mocked(saveBlob).mockClear();
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
    await act(async () => void (await i18next.changeLanguage("ar")));
    await cliquer(QUOTE_SENT_VIA.PRINT, "fr", "ar");
    expect(vi.mocked(saveBlob).mock.calls[0]![1]).toBe(`${draft().reference.replace(" v1", "_fr_v1")}.pdf`);
  });

  it("⛔ rang 39 (F-15) : la fenêtre de remise COMMENCE par la référence du devis remis, isolée de gauche à droite, avant le canal et le PDF", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    const fenetre = await screen.findByRole("dialog", { name: FR.remitTitleDone });
    // L'attendu est écrit avec les DEUX caractères d'isolat (LRI U+2066, PDI U+2069), pas avec `isolateLtr` : une garde qui se calcule avec la fonction qu'elle teste est tautologique.
    const ligneReference = FR.remitReference.replace("{reference}", `⁦${draft().reference}⁩`);
    const texte = fenetre.textContent ?? "";
    expect(texte).toContain(ligneReference);
    expect(texte.indexOf(ligneReference), "la référence précède le canal enregistré").toBeLessThan(texte.indexOf(FR.remitRecorded.replace("{channel}", "Imprimé et remis")));
    expect(texte.indexOf(ligneReference), "…et le PDF").toBeLessThan(texte.indexOf(FR.remitPdfDone));
  });

  it("⚠ la fenêtre de remise ne s'ouvre PAS avant les réponses : elle attend l'enregistrement ET le PDF (la boîte de langue, elle, est déjà fermée)", async () => {
    let finDeliver: (q: QuoteDTO) => void = () => undefined;
    let finDocument: (b: Blob) => void = () => undefined;
    await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        deliver: vi.fn().mockReturnValue(new Promise<QuoteDTO>((ok) => (finDeliver = ok))),
        document: vi.fn().mockReturnValue(new Promise<Blob>((ok) => (finDocument = ok)))
      }
    });
    await act(async () => {
      fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT));
    });
    await choisir("fr");
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => finDeliver(draft({ sentVia: "PRINT" })));
    expect(screen.queryByRole("dialog"), "l'enregistrement est revenu, pas le PDF").toBeNull();
    await act(async () => finDocument(fichier()));
    await laisserRetomber();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("issue 1 — tout a réussi : « Remise enregistrée », le canal nommé, le PDF téléchargé ; et le texte déjà affiché reste (« en plus du texte déjà affiché »)", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    const fenetre = await screen.findByRole("dialog", { name: FR.remitTitleDone });
    expect(fenetre.textContent).toContain(FR.remitRecorded.replace("{channel}", "Imprimé et remis"));
    expect(fenetre.textContent).toContain(FR.remitPdfDone);
    // Le texte d'état déjà affiché dans la page : celui de `delivered`, inchangé.
    const etat = screen.queryByRole("status");
    expect(etat, "le texte d'état de la remise est affiché").not.toBeNull();
    expect(etat?.textContent).toBe(FR.delivered.replace("{channel}", "Imprimé et remis"));
  });

  it("issue 2 — enregistrée, mais le PDF refusé (une version plus récente existe) : la fenêtre le DIT, avec le motif du serveur, et rien n'est téléchargé", async () => {
    await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })),
        document: vi.fn().mockRejectedValue(echec("QUOTE_VERSION_NOT_ACTIVE", "quote.errors.versionNotActive"))
      }
    });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    const fenetre = await screen.findByRole("dialog", { name: FR.remitTitleRecordedOnly });
    expect(fenetre.textContent).toContain(FR.remitRecorded.replace("{channel}", "Imprimé et remis"));
    expect(fenetre.textContent).toContain(FR.remitPdfFailed.replace("{reason}", messages.fr.quote.errors.versionNotActive));
    expect(fenetre.textContent).not.toContain(FR.remitPdfDone);
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it("issue 3 — le PDF est téléchargé, mais l'enregistrement a échoué : la fenêtre le DIT, le PDF est tout de même sauvé, et le texte d'état n'affiche aucune remise", async () => {
    await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        deliver: vi.fn().mockRejectedValue(echec("QUOTE_STATUS_CONFLICT", "quote.errors.statusConflict")),
        document: vi.fn().mockResolvedValue(fichier())
      }
    });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    const fenetre = await screen.findByRole("dialog", { name: FR.remitTitlePdfOnly });
    expect(fenetre.textContent).toContain(FR.remitPdfDone);
    expect(fenetre.textContent).toContain(FR.remitRecordFailed.replace("{reason}", messages.fr.quote.errors.statusConflict));
    expect(fenetre.textContent).not.toContain(FR.remitRecorded.replace("{channel}", "Imprimé et remis"));
    expect(saveBlob).toHaveBeenCalledTimes(1);
    // L'écran ne prétend pas qu'une remise a eu lieu : le serveur n'a rien écrit.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("issue 4 — les deux échouent : « Rien n'a pu être fait », avec les DEUX motifs (une panne du moteur n'est pas un refus)", async () => {
    await jusquAuTotal({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        deliver: vi.fn().mockRejectedValue(echec("QUOTE_STATUS_CONFLICT", "quote.errors.statusConflict")),
        document: vi.fn().mockRejectedValue(echec("QUOTE_DOCUMENT_UNAVAILABLE", "quote.errors.documentUnavailable", 503))
      }
    });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    const fenetre = await screen.findByRole("dialog", { name: FR.remitTitleNone });
    expect(fenetre.textContent).toContain(messages.fr.quote.errors.statusConflict);
    expect(fenetre.textContent).toContain(messages.fr.quote.errors.documentUnavailable);
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it("un échec du TÉLÉCHARGEMENT lui-même (le navigateur refuse le lien) est dit comme un PDF non téléchargé — jamais « téléchargé »", async () => {
    vi.mocked(saveBlob).mockImplementationOnce(() => {
      throw new Error("lien refusé");
    });
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    const fenetre = await screen.findByRole("dialog");
    expect(fenetre.textContent).toContain(FR.remitTitleRecordedOnly);
    expect(fenetre.textContent).not.toContain(FR.remitPdfDone);
  });

  it("⛔ AUCUN TEXTE NE DIT QUE ZWADJ A ENVOYÉ QUOI QUE CE SOIT : pour le SMS et l'e-mail la fenêtre dit « n'envoie pas encore » ; pour les autres canaux, rien de tel", async () => {
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      await jusquAuTotalAvecEmail({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: canal })), document: vi.fn().mockResolvedValue(fichier()) } });
      await cliquer(canal);
      const texte = (await screen.findByRole("dialog")).textContent as string;
      if (canal === QUOTE_SENT_VIA.SMS) expect(texte).toContain(FR.remitNotSentSMS);
      else if (canal === QUOTE_SENT_VIA.EMAIL) expect(texte).toContain(FR.remitNotSentEMAIL);
      else expect(texte, canal).not.toMatch(/n'envoie pas/);
      expect(texte, canal).not.toMatch(/Zwadj a envoy|Zwadj envoie\b(?! pas)|envoyé par Zwadj/i);
      cleanup();
      vi.mocked(saveBlob).mockClear();
    }
  });

  it("la phrase « Zwadj n'imprime rien et n'envoie rien à votre place » a DISPARU de l'écran, et l'aide dit ce que font les boutons", async () => {
    await jusquAuTotal();
    expect(document.body.textContent).not.toMatch(/n'imprime rien/);
    expect(document.body.textContent).not.toMatch(/n'envoie rien à votre place/);
    expect(document.body.textContent).toContain(FR.deliverHint);
  });

  it("⛔ le point de branchement de l'envoi réel est appelé pour le SMS et l'e-mail, UNE fois, avec le devis rendu par le serveur — et pour AUCUN autre canal", async () => {
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      const rendu = draft({ sentVia: canal });
      await jusquAuTotalAvecEmail({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(rendu), document: vi.fn().mockResolvedValue(fichier()) } });
      await cliquer(canal);
      if (canal === QUOTE_SENT_VIA.SMS || canal === QUOTE_SENT_VIA.EMAIL) {
        expect(onQuoteRemitted, canal).toHaveBeenCalledTimes(1);
        expect(onQuoteRemitted, canal).toHaveBeenCalledWith(canal, rendu);
      } else {
        expect(onQuoteRemitted, canal).not.toHaveBeenCalled();
      }
      cleanup();
      vi.mocked(onQuoteRemitted).mockClear();
      vi.mocked(saveBlob).mockClear();
    }
  });

  it("le point de branchement n'est PAS appelé quand l'enregistrement a échoué : on n'enverra pas ce que le serveur n'a pas enregistré", async () => {
    await jusquAuTotalAvecEmail({
      quotes: {
        create: vi.fn().mockResolvedValue(draft()),
        deliver: vi.fn().mockRejectedValue(echec("QUOTE_STATUS_CONFLICT", "quote.errors.statusConflict")),
        document: vi.fn().mockResolvedValue(fichier())
      }
    });
    await cliquer(QUOTE_SENT_VIA.SMS);
    await screen.findByRole("dialog");
    expect(onQuoteRemitted).not.toHaveBeenCalled();
  });

  it("⚠ pendant le travail les boutons sont VERROUILLÉS : un double clic ne fait ni deux remises ni deux téléchargements", async () => {
    let fin: (q: QuoteDTO) => void = () => undefined;
    const deliver = vi.fn().mockReturnValue(new Promise<QuoteDTO>((ok) => (fin = ok)));
    const document = vi.fn().mockResolvedValue(fichier());
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver, document } });
    await act(async () => {
      fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT));
    });
    await choisir("fr");
    expect((bouton(QUOTE_SENT_VIA.PRINT) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT));
    fireEvent.click(bouton(QUOTE_SENT_VIA.SMS));
    expect(boiteDeLangue(), "aucune nouvelle boîte pendant le travail").toBeNull();
    await act(async () => fin(draft({ sentVia: "PRINT" })));
    await laisserRetomber();
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(document).toHaveBeenCalledTimes(1);
    expect(saveBlob).toHaveBeenCalledTimes(1);
  });

  it("la fenêtre se ferme par son bouton, sans rien défaire : la remise reste inscrite à l'écran", async () => {
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
    await cliquer(QUOTE_SENT_VIA.PRINT);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: FR.doneDialogClose }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const etat = screen.queryByRole("status");
    expect(etat, "la remise reste inscrite à l'écran").not.toBeNull();
    expect(etat?.textContent).toContain("Imprimé et remis");
  });

  it("en ARABE : le libellé du cinquième canal, la boîte de langue ET la fenêtre de remise dans la langue de la page, la langue du PDF choisie dans la boîte", async () => {
    const document = vi.fn().mockResolvedValue(fichier());
    await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(deuxCopies()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document } });
    await act(async () => void (await i18next.changeLanguage("ar")));
    expect(bouton(QUOTE_SENT_VIA.EMAIL, "ar").textContent).toBe(messages.ar.venue.ui.quotes.sv_EMAIL);
    await act(async () => {
      fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT, "ar"));
    });
    const boite = boiteDeLangue("ar");
    expect(boite, "la boîte de langue est dans la langue de la page").not.toBeNull();
    expect(boite?.textContent).toContain(AR.langDialogDescription);
    await choisir("ar", "ar");
    expect(document).toHaveBeenLastCalledWith("q1", "ar");
    const fenetre = await screen.findByRole("dialog", { name: AR.remitTitleDone });
    expect(fenetre.textContent).toContain(AR.remitPdfDone);
    expect(fenetre.textContent).toContain(AR.remitRecorded.replace("{channel}", messages.ar.venue.ui.quotes.sv_PRINT));
  });

  /** Comme `jusquAuTotal`, avec une ADRESSE valide à l'étape Contact : la fiche la porte, la conversion la reprend, le canal « e-mail » est actif. */
  async function jusquAuTotalAvecEmail(over: Parameters<typeof setup>[0] = {}) {
    const outils = await setup(over);
    fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: "amine@example.com" } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    return outils;
  }

  // ══ RANG 38 (D332, L35-2) — LA BOÎTE DE LANGUE : le pro choisit français ou arabe à CHAQUE téléchargement (décision A de Ko, D327) ═══════════════════════════════════
  // Modes de défaillance P-10 à P-14. Les verdicts sont NATIFS (`queryByRole` + `expect`) : une boîte absente rend `null`, pas une erreur de requête.
  describe("Rang 38 — la boîte de langue", () => {
    it("⛔ P-10/P-13 : chacun des CINQ boutons ouvre la boîte (français, arabe, annuler) — et RIEN n'est enregistré ni téléchargé tant que le pro n'a pas choisi", async () => {
      for (const canal of QUOTE_SENT_VIA_ORDER) {
        const deliver = vi.fn().mockResolvedValue(draft({ sentVia: canal }));
        const document = vi.fn().mockResolvedValue(fichier());
        await jusquAuTotalAvecEmail({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver, document } });
        await act(async () => {
          fireEvent.click(bouton(canal));
        });
        const boite = boiteDeLangue();
        expect(boite, canal).not.toBeNull();
        for (const nom of [FR.langFrench, FR.langArabic, FR.langDialogCancel]) {
          expect(within(boite as HTMLElement).queryByRole("button", { name: nom }), `${canal} — ${nom}`).not.toBeNull();
        }
        expect(deliver, canal).not.toHaveBeenCalled();
        expect(document, canal).not.toHaveBeenCalled();
        expect(saveBlob, canal).not.toHaveBeenCalled();
        cleanup();
        vi.mocked(saveBlob).mockClear();
      }
    });

    it("⛔ P-10 : ANNULER — par le bouton, par Échap ou par le clic sur le fond — n'enregistre RIEN, ne télécharge RIEN, n'ouvre PAS la fenêtre de remise (décision 2 du relecteur)", async () => {
      for (const geste of ["bouton", "echap", "fond"] as const) {
        const deliver = vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" }));
        const document = vi.fn().mockResolvedValue(fichier());
        await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver, document } });
        await act(async () => {
          fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT));
        });
        const boite = boiteDeLangue() as HTMLElement;
        expect(boite, geste).not.toBeNull();
        await act(async () => {
          if (geste === "bouton") fireEvent.click(within(boite).getByRole("button", { name: FR.langDialogCancel }));
          if (geste === "echap") fireEvent.keyDown(boite, { key: "Escape" });
          if (geste === "fond") fireEvent.mouseDown(boite.parentElement as HTMLElement);
        });
        await laisserRetomber();
        expect(screen.queryByRole("dialog"), `${geste} : aucune boîte, aucune fenêtre`).toBeNull();
        expect(deliver, geste).not.toHaveBeenCalled();
        expect(document, geste).not.toHaveBeenCalled();
        expect(saveBlob, geste).not.toHaveBeenCalled();
        expect(screen.queryByRole("status"), `${geste} : aucune remise inscrite à l'écran`).toBeNull();
        expect((bouton(QUOTE_SENT_VIA.PRINT) as HTMLButtonElement).disabled, `${geste} : les boutons ne sont pas verrouillés`).toBe(false);
        cleanup();
      }
    });

    it("⛔ P-11 : la langue du PDF est celle CHOISIE, pas celle de l'interface — « العربية » sur une page française envoie `ar`, « Français » sur une page arabe envoie `fr`", async () => {
      const document = vi.fn().mockResolvedValue(fichier());
      await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(deuxCopies()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document } });
      await cliquer(QUOTE_SENT_VIA.PRINT, "ar", "fr");
      expect(document).toHaveBeenLastCalledWith("q1", "ar");
      fireEvent.click(screen.getByRole("button", { name: FR.doneDialogClose }));
      await act(async () => void (await i18next.changeLanguage("ar")));
      await cliquer(QUOTE_SENT_VIA.PRINT, "fr", "ar");
      expect(document).toHaveBeenLastCalledWith("q1", "fr");
    });

    it("⛔ P-12 : le canal retenu est celui du DERNIER clic — SMS, annuler, puis impression et « Français » enregistre l'IMPRESSION, une seule fois", async () => {
      const deliver = vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" }));
      await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver, document: vi.fn().mockResolvedValue(fichier()) } });
      await act(async () => {
        fireEvent.click(bouton(QUOTE_SENT_VIA.SMS));
      });
      const boiteSms = boiteDeLangue();
      expect(boiteSms, "la boîte du SMS est ouverte").not.toBeNull();
      await act(async () => {
        fireEvent.click(within(boiteSms as HTMLElement).getByRole("button", { name: FR.langDialogCancel }));
      });
      await cliquer(QUOTE_SENT_VIA.PRINT, "fr");
      expect(deliver).toHaveBeenCalledTimes(1);
      expect(deliver).toHaveBeenCalledWith("q1", { sentVia: QUOTE_SENT_VIA.PRINT });
    });

    it("P-13 : un canal GRISÉ n'ouvre pas la boîte (l'e-mail sans adresse) ; un double clic sur un canal actif en ouvre UNE seule", async () => {
      await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
      fireEvent.click(bouton(QUOTE_SENT_VIA.EMAIL));
      expect(boiteDeLangue(), "e-mail grisé").toBeNull();
      await act(async () => {
        fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT));
        fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT));
      });
      expect(screen.queryAllByRole("dialog")).toHaveLength(1);
    });

    it("P-13 : choisir une langue FERME la boîte tout de suite et verrouille les boutons — même quand l'enregistrement n'a pas répondu", async () => {
      let fin: (q: QuoteDTO) => void = () => undefined;
      await jusquAuTotal({
        quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockReturnValue(new Promise<QuoteDTO>((ok) => (fin = ok))), document: vi.fn().mockResolvedValue(fichier()) }
      });
      await cliquer(QUOTE_SENT_VIA.PRINT, "fr");
      expect(boiteDeLangue(), "la boîte est fermée pendant le travail").toBeNull();
      expect((bouton(QUOTE_SENT_VIA.PRINT) as HTMLButtonElement).disabled).toBe(true);
      await act(async () => fin(draft({ sentVia: "PRINT" })));
      await laisserRetomber();
    });

    it("⛔ P-14 : la boîte est accessible — rôle `dialog`, nom et description, focus initial sur « Annuler », boutons de langue qui déclarent leur `lang` ET leur `dir`", async () => {
      await jusquAuTotal({ quotes: { create: vi.fn().mockResolvedValue(draft()), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })), document: vi.fn().mockResolvedValue(fichier()) } });
      await act(async () => {
        fireEvent.click(bouton(QUOTE_SENT_VIA.PRINT));
      });
      const boite = boiteDeLangue() as HTMLElement;
      expect(boite).not.toBeNull();
      expect(boite.getAttribute("aria-modal")).toBe("true");
      expect(document.getElementById(boite.getAttribute("aria-describedby") as string)?.textContent).toBe(FR.langDialogDescription);
      const annuler = within(boite).getByRole("button", { name: FR.langDialogCancel });
      expect(document.activeElement === annuler, "le focus initial est « Annuler » : une frappe Entrée distraite n'enregistre rien").toBe(true);
      const francais = within(boite).getByRole("button", { name: FR.langFrench });
      const arabe = within(boite).getByRole("button", { name: FR.langArabic });
      expect([francais.getAttribute("lang"), francais.getAttribute("dir")]).toEqual(["fr", "ltr"]);
      expect([arabe.getAttribute("lang"), arabe.getAttribute("dir")]).toEqual(["ar", "rtl"]);
    });

    it("P-14 : les deux libellés de langue sont écrits DANS LEUR PROPRE LANGUE, et IDENTIQUES dans les deux catalogues (« Français » ne se traduit pas en arabe)", () => {
      expect([typeof FR.langFrench, typeof FR.langArabic, typeof AR.langFrench, typeof AR.langArabic]).toEqual(["string", "string", "string", "string"]);
      expect(AR.langFrench).toBe(FR.langFrench);
      expect(AR.langArabic).toBe(FR.langArabic);
      expect(FR.langFrench).toMatch(/^[A-Za-zÀ-ÿ]+$/u);
      expect(FR.langArabic).toMatch(/^\p{Script=Arabic}+$/u);
    });
  });
});

// ══ RANG 41 (D336, L35-4 amendé) — LA FICHE CLIENT ET LE NOM SUR LE DEVIS ═══════════════════════════════════════════════════════════════════════════════
// Consigne v3, § 6 e et g ; modes de défaillance `docs/preuves/D336/modes-de-defaillance.md` (MD-4, MD-6, MD-9, MD-17 ; S-57 ; K-5 ; K-12).
// ⚠ Les verdicts sont NATIFS (`queryBy…` + `expect`) partout où une absence se mesure (D304, D316).
describe("⛔ D336 — le contact d'abord, puis les noms ; la fiche ; la conversion préremplie ; la boîte de langue complète le nom", () => {
  const fiche = (over: Partial<ClientRecordDTO> = {}): ClientRecordDTO => ({
    id: "fiche-9",
    phone: "+213550000002",
    email: null,
    nameAr: null,
    nameLatin: "Amina Bensalem",
    linked: false,
    createdAt: "2026-10-22T10:00:00.000Z",
    updatedAt: "2026-10-22T10:00:00.000Z",
    ...over
  });
  const trouvee = (f: ClientRecordDTO) => vi.fn().mockResolvedValue({ found: true, record: f });
  const nomLatin = () => screen.getByLabelText(FR.nameLatin) as HTMLInputElement;
  const nomArabe = () => screen.getByLabelText(FR.nameAr) as HTMLInputElement;
  const continuer = () => fireEvent.click(screen.getByRole("button", { name: FR.continue }));
  /** Les invités, puis « Continuer » de l'étape Client, sans toucher aux noms (préremplis ou tapés avant). */
  async function validerClient(invites = "200") {
    fireEvent.change(screen.getByLabelText(FR.guests), { target: { value: invites } });
    continuer();
    await laisserRetomber();
    await laisserRetomber();
  }
  async function calculer() {
    await repondreDate();
    await repondreCreneau();
    await repondrePrestations();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
  }
  /** Le dialogue qui DEMANDE le nom manquant, par son titre — `null` s'il n'est pas ouvert (verdict natif). */
  const questionDuNom = (locale: "fr" | "ar") => screen.queryByRole("dialog", { name: locale === "ar" ? FR.nameDialogTitleAr : FR.nameDialogTitleLatin });
  async function cliquerCanal(canal: QuoteSentVia, langueDuPdf: "fr" | "ar") {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: (messages.fr.venue.ui.quotes as Record<string, string>)[`sv_${canal}`] as string }));
    });
    const boite = screen.queryByRole("dialog", { name: FR.langDialogTitle });
    expect(boite, "la boîte de langue est ouverte").not.toBeNull();
    await act(async () => {
      fireEvent.click(within(boite as HTMLElement).getByRole("button", { name: langueDuPdf === "fr" ? FR.langFrench : FR.langArabic }));
    });
    await laisserRetomber();
  }

  it("⛔ MD-17 — le CONTACT est la PREMIÈRE étape, les NOMS la seconde : le rail le dit dans cet ordre, et la première question est celle du contact", async () => {
    await setup();
    const etapes = Array.from(rail().querySelectorAll("li")).map((li) => li.textContent ?? "");
    expect(etapes.length).toBe(6);
    expect(etapes[0]).toContain(FR.stepContact);
    expect(etapes[1]).toContain(FR.stepClient);
    expect(question()).toBe(FR.qContact);
  });

  it("⛔ S-57 — la recherche porte d'abord sur le NUMÉRO, puis sur l'E-MAIL ; un numéro trouvé ne cherche pas l'e-mail", async () => {
    const un = await setup();
    fireEvent.change(telephone(), { target: { value: "+213550000002" } });
    fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: "amine@example.com" } });
    continuer();
    await laisserRetomber();
    await laisserRetomber();
    expect(vi.mocked(un.clients.lookup).mock.calls.map((c) => c[0])).toEqual([{ phone: "+213550000002" }, { email: "amine@example.com" }]);
    cleanup();

    const deux = await setup({ clients: { lookup: trouvee(fiche()) } });
    fireEvent.change(telephone(), { target: { value: "+213550000002" } });
    fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: "amine@example.com" } });
    continuer();
    await laisserRetomber();
    await laisserRetomber();
    expect(vi.mocked(deux.clients.lookup).mock.calls.map((c) => c[0])).toEqual([{ phone: "+213550000002" }]);
  });

  it("une fiche TROUVÉE PRÉREMPLIT les noms de CE devis, modifiables ; aucune fiche n'est créée ; le devis porte la fiche et les noms DE L'ÉCRAN", async () => {
    const { clients, quotes } = await setup({ clients: { lookup: trouvee(fiche({ nameAr: "آمنة بن سالم" })) } });
    await repondreContact();
    expect(question()).toBe(FR.qClient);
    expect(nomLatin().value).toBe("Amina Bensalem");
    expect(nomArabe().value).toBe("آمنة بن سالم");
    expect(nomLatin().disabled).toBe(false);
    fireEvent.change(nomLatin(), { target: { value: "Amina Bensalem-Haddad" } });
    await validerClient();
    expect(clients.create).not.toHaveBeenCalled();
    await calculer();
    expect(vi.mocked(quotes.create).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ clientRecordId: "fiche-9", clientNameAr: "آمنة بن سالم", clientNameLatin: "Amina Bensalem-Haddad" })
    );
  });

  it("⛔ MD-6 — une fiche LIÉE : les deux champs de nom sont GRISÉS, le texte le dit, et le devis porte les noms de la FICHE", async () => {
    const { quotes } = await setup({ clients: { lookup: trouvee(fiche({ nameAr: "آمنة بن سالم", linked: true })) } });
    await repondreContact();
    expect(nomLatin().disabled).toBe(true);
    expect(nomArabe().disabled).toBe(true);
    expect(screen.queryByText(FR.ficheLinked)).not.toBeNull();
    await validerClient();
    await calculer();
    expect(vi.mocked(quotes.create).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ clientRecordId: "fiche-9", clientNameAr: "آمنة بن سالم", clientNameLatin: "Amina Bensalem" })
    );
  });

  it("⛔ MD-6 — une fiche LIÉE RENDUE par la création (K-2, `created: false`) : ses noms s'IMPOSENT au devis, quels que soient les noms tapés", async () => {
    // La recherche n'a rien trouvé, la création rend une fiche existante (une création concurrente l'a précédée) — et elle est liée : le devis porte SES noms.
    const liee = fiche({ nameAr: "آمنة بن سالم", nameLatin: "Amina Bensalem", linked: true });
    const { quotes } = await setup({ clients: { create: vi.fn().mockResolvedValue({ created: false, record: liee }) } });
    await repondreContact();
    await repondreNoms();
    await calculer();
    expect(vi.mocked(quotes.create).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ clientRecordId: "fiche-9", clientNameAr: "آمنة بن سالم", clientNameLatin: "Amina Bensalem" })
    );
  });

  it("un AUTRE numéro après une fiche trouvée, et pas de fiche pour lui : les noms de l'ANCIENNE fiche ne passent pas au nouveau client", async () => {
    const lookup = vi.fn().mockResolvedValueOnce({ found: true, record: fiche() }).mockResolvedValue({ found: false });
    await setup({ clients: { lookup } });
    await repondreContact();
    expect(nomLatin().value).toBe("Amina Bensalem");
    fireEvent.click(screen.getByRole("button", { name: FR.previous }));
    fireEvent.change(telephone(), { target: { value: "+213661234567" } });
    continuer();
    await laisserRetomber();
    await laisserRetomber();
    expect(vi.mocked(lookup).mock.calls.map((c) => c[0])).toEqual([{ phone: "+213550000002" }, { phone: "+213661234567" }]);
    expect(question()).toBe(FR.qClient);
    expect(nomLatin().value).toBe("");
    expect(screen.queryByText(FR.ficheNew)).not.toBeNull();
  });

  it("une fiche ABSENTE se CRÉE (K-2) au « Continuer » de l'étape Client, avec le contact et les noms TAPÉS — et le devis porte la fiche CRÉÉE", async () => {
    const { clients, quotes } = await setup();
    await repondreContact();
    expect(screen.queryByText(FR.ficheNew)).not.toBeNull();
    expect(clients.create).not.toHaveBeenCalled();
    await repondreNoms();
    expect(vi.mocked(clients.create).mock.calls.map((c) => c[0])).toEqual([{ phone: "+213550000002", nameLatin: "Amine Belkacem" }]);
    await calculer();
    expect(vi.mocked(quotes.create).mock.calls[0]?.[1]).toEqual(expect.objectContaining({ clientRecordId: "fiche-1", clientNameLatin: "Amine Belkacem" }));
    expect("clientNameAr" in (vi.mocked(quotes.create).mock.calls[0]?.[1] as object)).toBe(false);
  });

  it("⛔ MD-4 — le numéro du PRO refusé à la création de la fiche : l'erreur est DITE, on reste à l'étape Client, aucun devis", async () => {
    const refus = new ApiError(400, "CLIENT_IS_PRO_CONTACT", "clientRecord.errors.isProContact", []);
    const { quotes } = await setup({ clients: { create: vi.fn().mockRejectedValue(refus) } });
    await repondreContact();
    await repondreNoms();
    expect(screen.queryAllByRole("alert").map((e) => e.textContent)).toContain(messages.fr.clientRecord.errors.isProContact);
    expect(question()).toBe(FR.qClient);
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it("⛔ MD-17 — AUCUNE écriture de fiche après la création : ni au calcul, ni à la conversion, ni à la remise", async () => {
    const { clients } = await setup({
      quotes: { create: vi.fn().mockResolvedValue(draft()), convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" })), deliver: vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" })) }
    });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    await cliquerCanal(QUOTE_SENT_VIA.PRINT, "fr");
    fireEvent.click(await screen.findByRole("button", { name: FR.doneDialogClose }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await screen.findByRole("dialog", { name: FR.doneTitleStandby });
    expect(clients.create).toHaveBeenCalledTimes(1);
    expect(clients.completeNames).not.toHaveBeenCalled();
    expect(clients.update).not.toHaveBeenCalled();
  });

  it("⛔ MD-9 — la conversion est PRÉREMPLIE depuis la copie (coupée au PREMIER espace) et la fiche ; les deux champs restent MODIFIABLES ; l'envoi porte la valeur de l'ÉCRAN", async () => {
    const { quotes } = await setup({
      quotes: {
        create: vi.fn().mockResolvedValue(draft({ clientNameLatin: "Abd El Kader Benali" })),
        convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" }))
      }
    });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    const prenom = screen.getByLabelText(FR.firstName) as HTMLInputElement;
    const nom = screen.getByLabelText(FR.lastName) as HTMLInputElement;
    // Le découpage TOMBE MAL sur un prénom composé : c'est écrit, et le pro corrige.
    expect([prenom.value, nom.value]).toEqual(["Abd", "El Kader Benali"]);
    expect([prenom.disabled, nom.disabled]).toEqual([false, false]);
    fireEvent.change(prenom, { target: { value: "Abd El Kader" } });
    fireEvent.change(nom, { target: { value: "Benali" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await waitFor(() => expect(quotes.convert).toHaveBeenCalledTimes(1));
    expect(vi.mocked(quotes.convert).mock.calls[0]?.[1]).toEqual({
      contactFirstName: "Abd El Kader",
      contactLastName: "Benali",
      contactPhone: "+213550000002",
      paymentMethod: "CASH"
    });
  });

  it("MD-9 — interface en ARABE : la copie ARABE est découpée ; à défaut, l'autre écriture", async () => {
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft({ clientNameAr: "عبد القادر بن علي", clientNameLatin: "Abdelkader Benali" })) } });
    await allerAuDevis();
    await act(async () => void (await i18next.changeLanguage("ar")));
    fireEvent.click(screen.getByRole("button", { name: AR.compute }));
    await screen.findByText(montant(478_600_000));
    expect((screen.getByLabelText(AR.firstName) as HTMLInputElement).value).toBe("عبد");
    expect((screen.getByLabelText(AR.lastName) as HTMLInputElement).value).toBe("القادر بن علي");
    cleanup();
    await act(async () => void (await i18next.changeLanguage("fr")));
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft({ clientNameAr: "عبد القادر بن علي", clientNameLatin: null })) } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    expect((screen.getByLabelText(FR.firstName) as HTMLInputElement).value).toBe("عبد");
  });

  it("MD-9 — une copie SANS espace : tout au NOM, le PRÉNOM vide — et la conclusion RETENUE jusqu'à ce qu'il soit saisi", async () => {
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft({ clientNameLatin: "Bensalem" })) } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    expect((screen.getByLabelText(FR.firstName) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(FR.lastName) as HTMLInputElement).value).toBe("Bensalem");
    expect((screen.getByRole("button", { name: "Enregistrer sans bloquer" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(FR.firstName), { target: { value: "Amina" } });
    expect((screen.getByRole("button", { name: "Enregistrer sans bloquer" }) as HTMLButtonElement).disabled).toBe(false);
  });

  // ⛔ L36-1 (D337) — la conversion par E-MAIL SEUL : « le numéro est DEMANDÉ » (rang 41, K-12) ne tient plus. Q2 de Ko : une réservation est possible avec une adresse e-mail
  // uniquement. ML-1, ML-2, ML-6, ML-9.
  const fichePourEmailSeul = () => ({
    clients: { lookup: trouvee(fiche({ phone: null, email: "amina@example.dz" })) },
    quotes: {
      create: vi.fn().mockResolvedValue(draft({ clientRecordId: "fiche-9", clientNameLatin: "Amina Bensalem" })),
      convert: vi.fn().mockResolvedValue(draft({ status: "SENT", bookingId: "b1" }))
    }
  });
  async function jusquALaConversionParEmail() {
    const outils = await setup(fichePourEmailSeul());
    fireEvent.change(screen.getByLabelText(FR.contactEmail), { target: { value: "amina@example.dz" } });
    continuer();
    await laisserRetomber();
    await laisserRetomber();
    await validerClient();
    await calculer();
    return outils;
  }

  it("⛔ L36-1 — une fiche SANS numéro (trouvée par l'e-mail) : la conversion n'EXIGE PLUS le numéro, le corps n'en porte pas, la fiche n'est PAS réécrite", async () => {
    const { clients, quotes } = await jusquALaConversionParEmail();
    expect(telephone().value).toBe("");
    expect((screen.getByRole("button", { name: "Enregistrer sans bloquer" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await waitFor(() => expect(quotes.convert).toHaveBeenCalledTimes(1));
    const corps = vi.mocked(quotes.convert).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(corps, "contactPhone"), "la clé du numéro doit être ABSENTE").toBe(false);
    expect(corps).toEqual(expect.objectContaining({ contactEmail: "amina@example.dz", paymentMethod: "CASH" }));
    expect(clients.update).not.toHaveBeenCalled();
    expect(clients.completeNames).not.toHaveBeenCalled();
  });

  it("L36-1 — le pro PEUT ajouter un numéro à la conversion : il part avec l'e-mail ; la fiche n'est pas réécrite", async () => {
    const { clients, quotes } = await jusquALaConversionParEmail();
    fireEvent.change(telephone(), { target: { value: "0661234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer sans bloquer" }));
    await waitFor(() => expect(quotes.convert).toHaveBeenCalledTimes(1));
    expect(vi.mocked(quotes.convert).mock.calls[0]?.[1]).toEqual(expect.objectContaining({ contactPhone: "+213661234567", contactEmail: "amina@example.dz" }));
    expect(clients.update).not.toHaveBeenCalled();
  });

  it("ML-1 — ni numéro ni e-mail à la conversion (le pro les efface) : « Enregistrer » redevient inerte, et la raison est « un numéro ou un e-mail »", async () => {
    const { quotes } = await jusquALaConversionParEmail();
    // À la conversion, l'e-mail porte le libellé de la RUBRIQUE (« FR.email »), pas celui de l'étape Contact (« FR.contactEmail »).
    fireEvent.change(screen.getByLabelText(FR.email), { target: { value: "" } });
    const enregistrer = screen.getByRole("button", { name: "Enregistrer sans bloquer" }) as HTMLButtonElement;
    expect(enregistrer.disabled).toBe(true);
    expect(quotes.convert).not.toHaveBeenCalled();
    expect(document.body.textContent ?? "").toContain(FR.needIdentifier);
  });

  it("ML-6 — SANS numéro, les canaux qui l'exigent (SMS, appel) ne sont PAS proposés ; l'e-mail et les canaux sans contact le sont", async () => {
    await jusquALaConversionParEmail();
    const sv = messages.fr.venue.ui.quotes as Record<string, string>;
    const canal = (c: QuoteSentVia) => screen.getByRole("button", { name: sv[`sv_${c}`] as string }) as HTMLButtonElement;
    expect(canal(QUOTE_SENT_VIA.SMS).disabled).toBe(true);
    expect(canal(QUOTE_SENT_VIA.PHONE).disabled).toBe(true);
    expect(canal(QUOTE_SENT_VIA.EMAIL).disabled).toBe(false);
    expect(canal(QUOTE_SENT_VIA.PRINT).disabled).toBe(false);
    expect(canal(QUOTE_SENT_VIA.IN_PERSON).disabled).toBe(false);
    // …et dès qu'un numéro valide est ajouté, SMS et appel s'ouvrent.
    fireEvent.change(telephone(), { target: { value: "0661234567" } });
    expect(canal(QUOTE_SENT_VIA.SMS).disabled).toBe(false);
    expect(canal(QUOTE_SENT_VIA.PHONE).disabled).toBe(false);
  });

  it("⛔ K-5 — la boîte de langue DEMANDE le nom qui manque à la langue choisie, le COMPLÈTE sur le devis, PUIS remet et télécharge dans cette langue", async () => {
    const complete = draft({ clientNameAr: "أمين بلقاسم" });
    const completeClientName = vi.fn().mockResolvedValue(complete);
    const deliver = vi.fn().mockResolvedValue(draft({ sentVia: "PRINT", clientNameAr: "أمين بلقاسم" }));
    const document = vi.fn().mockResolvedValue(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft()), completeClientName, deliver, document } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    await cliquerCanal(QUOTE_SENT_VIA.PRINT, "ar");
    const dialogue = questionDuNom("ar");
    expect(dialogue, "la question du nom en arabe est ouverte").not.toBeNull();
    expect(deliver).not.toHaveBeenCalled();
    expect(document).not.toHaveBeenCalled();
    fireEvent.change(within(dialogue as HTMLElement).getByLabelText(FR.nameAr), { target: { value: "أمين بلقاسم" } });
    await act(async () => {
      fireEvent.click(within(dialogue as HTMLElement).getByRole("button", { name: FR.nameDialogConfirm }));
    });
    await laisserRetomber();
    await laisserRetomber();
    expect(completeClientName).toHaveBeenCalledWith("q1", { locale: "ar", name: "أمين بلقاسم" });
    expect(deliver).toHaveBeenCalledWith("q1", { sentVia: QUOTE_SENT_VIA.PRINT });
    expect(document).toHaveBeenCalledWith("q1", "ar");
  });

  it("K-5 — la copie de la langue choisie est LÀ : aucune question, la remise part (le français d'un devis à copie latine)", async () => {
    const completeClientName = vi.fn();
    const deliver = vi.fn().mockResolvedValue(draft({ sentVia: "PRINT" }));
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft()), completeClientName, deliver } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    await cliquerCanal(QUOTE_SENT_VIA.PRINT, "fr");
    expect(questionDuNom("fr")).toBeNull();
    expect(completeClientName).not.toHaveBeenCalled();
    await waitFor(() => expect(deliver).toHaveBeenCalledTimes(1));
  });

  it("K-5 — ANNULER la question du nom : rien n'est complété, rien n'est remis ni téléchargé", async () => {
    const completeClientName = vi.fn();
    const deliver = vi.fn();
    const document = vi.fn();
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft()), completeClientName, deliver, document } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    await cliquerCanal(QUOTE_SENT_VIA.PRINT, "ar");
    const dialogue = questionDuNom("ar") as HTMLElement;
    expect(dialogue).not.toBeNull();
    await act(async () => {
      fireEvent.click(within(dialogue).getByRole("button", { name: FR.langDialogCancel }));
    });
    await laisserRetomber();
    expect(questionDuNom("ar")).toBeNull();
    expect(completeClientName).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
    expect(document).not.toHaveBeenCalled();
  });

  it("K-5 — le nom saisi passe la règle PARTAGÉE : un chiffre retient la validation, rien ne part", async () => {
    const completeClientName = vi.fn();
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft()), completeClientName } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    await cliquerCanal(QUOTE_SENT_VIA.PRINT, "ar");
    const dialogue = questionDuNom("ar") as HTMLElement;
    fireEvent.change(within(dialogue).getByLabelText(FR.nameAr), { target: { value: "أمين1" } });
    expect((within(dialogue).getByRole("button", { name: FR.nameDialogConfirm }) as HTMLButtonElement).disabled).toBe(true);
    expect(completeClientName).not.toHaveBeenCalled();
  });

  it("K-5 — le serveur REFUSE le complément (409 : déjà complété entre-temps) : l'erreur est DITE, rien n'est remis ni téléchargé", async () => {
    const refus = new ApiError(409, "QUOTE_CLIENT_NAME_ALREADY_SET", "quote.errors.clientNameAlreadySet", []);
    const deliver = vi.fn();
    const document = vi.fn();
    await setup({ quotes: { create: vi.fn().mockResolvedValue(draft()), completeClientName: vi.fn().mockRejectedValue(refus), deliver, document } });
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText(montant(478_600_000));
    await cliquerCanal(QUOTE_SENT_VIA.PRINT, "ar");
    const dialogue = questionDuNom("ar") as HTMLElement;
    fireEvent.change(within(dialogue).getByLabelText(FR.nameAr), { target: { value: "أمين بلقاسم" } });
    await act(async () => {
      fireEvent.click(within(dialogue).getByRole("button", { name: FR.nameDialogConfirm }));
    });
    await laisserRetomber();
    expect(screen.queryAllByRole("alert").map((e) => e.textContent)).toContain(messages.fr.quote.errors.clientNameAlreadySet);
    expect(deliver).not.toHaveBeenCalled();
    expect(document).not.toHaveBeenCalled();
  });

  it("le récapitulatif : l'étape Contact dit le numéro, l'étape Client les noms et les invités — aucun montant", async () => {
    await setup();
    await repondreClient();
    const texte = recap().textContent ?? "";
    expect(texte).toContain("+213550000002");
    expect(texte).toContain("Amine Belkacem");
    expect(texte).toContain("Invités : 200");
    expect(texte).not.toMatch(/DZD|\bDA\b/u);
  });
});
