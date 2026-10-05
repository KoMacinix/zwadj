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
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import i18next from "i18next";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { formatDZD, messages } from "@zwadj/i18n";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, isValidContactEmail, type QuoteDTO, type VenueProDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import {
  makeAuthDouble,
  makeBookingsProDouble,
  makeQuotesDouble,
  makeServicesDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";
import { WalkinJourney } from "./walkin-journey";

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
  } = {}
) {
  const quotes = makeQuotesDouble({ create: vi.fn().mockResolvedValue(draft()), ...over.quotes });
  const bookings = makeBookingsProDouble(over.bookings);
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={makeVenueClientDouble(VENUE, { availability: availabilityDouble() })}
        quotesClient={quotes}
        servicesClient={makeServicesDouble(over.services)}
        bookingsPro={bookings}
      >
        <WalkinJourney venue={VENUE} />
      </AppProviders>
    </MemoryRouter>
  );
  // ⚠ Le bootstrap d'`AppProviders` est encore en vol quand `render` rend la
  // main : c'est lui qui produisait 2 avertissements `AuthProvider` et 1
  // `WalkinJourney` dans CHACUN des 41 tests, soit 122 des 293.
  await laisserRetomber();
  return { quotes, bookings };
}

/** Répond à l'étape CLIENT et valide. ⚠ Le nombre d'invités est ICI, pas à
 *  l'étape des prestations : une prestation par personne se chiffre
 *  `unitPrice × guests`, donc la question précède forcément le catalogue. */
async function repondreClient(invites = "200") {
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Belkacem" } });
  fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000002" } });
  fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: invites } });
  fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
  // ⚠ Valider le client fait apparaître l'étape date, donc MONTE
  // `VenueCalendar`, qui part aussitôt chercher sa disponibilité. Ses trois
  // `setState` (`setData`, `setError`, `setLoading`) retombent ici.
  await laisserRetomber();
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
  it("s'ouvre sur la question du client, et sur elle seule", async () => {
    await setup();
    expect(question()).toBe("Qui est le client ?");
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
    await repondreClient();
    expect(screen.queryByLabelText("Prénom")).toBeNull();
    expect(screen.queryByLabelText("Nombre d'invités")).toBeNull();
  });

  it("chaque réponse fait apparaître la suivante, dans l'ordre arbitré", async () => {
    await setup();
    await repondreClient();
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
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
    expect(question()).toBe("Qui est le client ?");
  });

  it("⚠ le nombre d'invités MANQUANT bloque aussi — il chiffre les prestations", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Belkacem" } });
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000002" } });
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
  });

  it("chaque champ client porte un LABEL visible — quatre cases nues ne se distinguent pas", async () => {
    await setup();
    // ⚠ Libellés EXACTS, pas des expressions régulières : /Nom/ attrapait aussi
    // « Nombre d'invités », et le test échouait sur son propre sélecteur.
    for (const nom of ["Prénom", "Nom", "Téléphone", "E-mail (facultatif)"]) {
      expect(screen.getByLabelText(nom)).toBeInstanceOf(HTMLInputElement);
    }
  });

  it("le fil de progression NOMME l'étape courante pour un lecteur d'écran", async () => {
    await setup();
    const courant = () => screen.getByRole("navigation").querySelector('[aria-current="step"]');
    expect(courant()?.textContent).toContain("Client");
    await repondreClient();
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
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
  });
});

describe("Retour en arrière — les réponses survivent, les montants non", () => {
  it("« Modifier » ramène à l'étape, sans rien effacer", async () => {
    await setup();
    await repondreClient();
    await repondreDate();
    modifierDepuisRecap(/Modifier.*Client/);
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
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
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
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
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText("Prénom")).toHaveValue("");
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
    await repondreClient();
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

  it("les quatre canaux sont RENDUS et ACTIFS une fois le devis calculé", async () => {
    await jusquAuTotal();
    const groupe = screen.getByRole("group", { name: /remis/i });
    const boutons = Array.from(groupe.querySelectorAll("button"));
    expect(boutons).toHaveLength(4);
    for (const bouton of boutons) expect(bouton).toBeEnabled();
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
    const bouton = within(recap()).getByRole("button", { name: /Modifier/ });
    expect(bouton).toHaveClass("zj-recap-edit");
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
    fireEvent.change(screen.getByLabelText(FR.firstName), { target: { value: "Amine1" } });
    const champ = screen.getByLabelText(FR.firstName);
    expect(champ).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(champ.getAttribute("aria-describedby") as string)).toHaveTextContent(FR.firstNameInvalid);
    // L'erreur d'un champ est une ALERTE : un lecteur d'écran l'annonce à son apparition. Verdict en assertion NATIVE (D304, D316) — c'est ce que mesure la cible N-11
    // de `neutralisation/neutralize-r32.py` ; sans cette ligne, perdre le rôle `alert` laissait les 75 tests verts.
    expect(screen.queryAllByRole("alert").map((e) => e.textContent)).toEqual([FR.firstNameInvalid]);
    fireEvent.change(screen.getByLabelText(FR.lastName), { target: { value: "B@lkacem" } });
    expect(screen.getByLabelText(FR.lastName)).toHaveAttribute("aria-invalid", "true");
    expect(raisonsDuBouton()).toEqual(expect.arrayContaining([FR.needFirstNameValid, FR.needLastNameValid]));
  });

  it("le français accentué, les noms composés, l'apostrophe et L'ARABE passent — le champ n'est pas en erreur", async () => {
    await setup();
    for (const nom of ["Éloïse", "Jean-Pierre", "O'Brien", "أمينة"]) {
      fireEvent.change(screen.getByLabelText(FR.firstName), { target: { value: nom } });
      expect(screen.getByLabelText(FR.firstName), nom).not.toHaveAttribute("aria-invalid");
    }
  });
});

describe("Point 3 — l'e-mail : la règle du contrat, importée", () => {
  it("le champ refuse exactement ce que `isValidContactEmail` refuse — le serveur applique la même fonction", async () => {
    await setup();
    let verdictsFaux = 0;
    for (const adresse of ["amine@example.com", "amine@", "pas une adresse", "a@b.co", "@example.com"]) {
      fireEvent.change(screen.getByLabelText(FR.email), { target: { value: adresse } });
      const refuse = screen.getByLabelText(FR.email).getAttribute("aria-invalid") === "true";
      expect(refuse, adresse).toBe(!isValidContactEmail(adresse));
      if (refuse) verdictsFaux += 1;
    }
    // La comparaison DISCRIMINE : des adresses refusées ET des adresses acceptées.
    expect(verdictsFaux).toBeGreaterThan(0);
    expect(verdictsFaux).toBeLessThan(5);
  });

  it("vide, l'e-mail ne retient rien (D135) ; refusé, il retient « Continuer » avec sa raison", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText(FR.email), { target: { value: "amine@" } });
    expect(raisonsDuBouton()).toContain(FR.needEmailValid);
    fireEvent.change(screen.getByLabelText(FR.email), { target: { value: "" } });
    expect(raisonsDuBouton()).not.toContain(FR.needEmailValid);
  });
});

describe("Point 4 — un exemple du format dans chaque champ, qui ne remplace JAMAIS le libellé", () => {
  const CHAMPS: [string, string, string][] = [
    [FR.firstName, FR.firstNamePlaceholder, "prénom"],
    [FR.lastName, FR.lastNamePlaceholder, "nom"],
    [FR.phone, FR_PHONE.placeholder[DEFAULT_PHONE_COUNTRY], "téléphone"],
    [FR.email, FR.emailPlaceholder, "e-mail"],
    [FR.guests, FR.guestsPlaceholder, "invités"]
  ];

  it("chaque champ porte son exemple, ET son libellé visible reste là, lié au champ (D143)", async () => {
    await setup();
    for (const [libelle, exemple, nom] of CHAMPS) {
      const champ = screen.getByLabelText(libelle) as HTMLInputElement;
      expect(champ.placeholder, nom).toBe(exemple);
      expect(champ.placeholder, nom).not.toBe("");
      expect(champ.placeholder, nom).not.toBe(libelle);
      expect(screen.getByText(libelle, { selector: "label" }), nom).toBeVisible();
    }
  });

  it("⚠ AUCUNE vraie donnée : le téléphone est un gabarit (« X »), l'e-mail est sur example.com, aucun nom n'est une personne", async () => {
    await setup();
    const gabarit = (screen.getByLabelText(FR.phone) as HTMLInputElement).placeholder;
    expect(gabarit).toMatch(/X/);
    expect(gabarit.replace(/\D/g, "").length).toBeLessThan(PAYS.nationalLength);
    expect((screen.getByLabelText(FR.email) as HTMLInputElement).placeholder).toMatch(/@example\.com$/);
    expect(AR.emailPlaceholder).toMatch(/@example\.com$/);
    // Les exemples de nom sont introduits comme tels (« Ex. : », « مثال: ») — pas présentés comme la saisie d'une personne.
    expect(FR.firstNamePlaceholder).toMatch(/^Ex\. :/);
    expect(AR.firstNamePlaceholder).toMatch(/^مثال:/);
  });

  it("le même exemple existe en ARABE, pour chacun des cinq champs", () => {
    for (const cle of ["firstNamePlaceholder", "lastNamePlaceholder", "emailPlaceholder", "guestsPlaceholder"] as const) {
      expect(AR[cle], cle).toBeTruthy();
      expect(AR[cle], cle).not.toBe(FR[cle]);
    }
    expect(messages.ar.common.phone.placeholder[DEFAULT_PHONE_COUNTRY]).toBeTruthy();
  });
});

describe("Point 5 — « Continuer » grisé : la RAISON PRÉCISE, liée au bouton", () => {
  it("tout est vide : la liste nomme les quatre manques, et le bouton la désigne par `aria-describedby`", async () => {
    await setup();
    const bouton = screen.getByRole("button", { name: FR.continue });
    expect(bouton).toBeDisabled();
    expect(bouton).toHaveAccessibleDescription(new RegExp(FR.continueBlockedLead.replace(/[«»]/g, ".")));
    expect(raisonsDuBouton()).toEqual([FR.needFirstName, FR.needLastName, FR.needPhone, FR.needGuests]);
  });

  it("⚠ UN SEUL manque : « le nombre d'invités est obligatoire » — et rien d'autre", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText(FR.firstName), { target: { value: "Amine" } });
    fireEvent.change(screen.getByLabelText(FR.lastName), { target: { value: "Belkacem" } });
    fireEvent.change(telephone(), { target: { value: "+213550000002" } });
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
    fireEvent.change(screen.getByLabelText(FR.firstName), { target: { value: "Amine" } });
    fireEvent.change(screen.getByLabelText(FR.lastName), { target: { value: "Belkacem" } });
    fireEvent.change(telephone(), { target: { value: "+213550000002" } });
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
    await act(async () => void (await i18next.changeLanguage("ar")));
    const noms = [AR.firstName, AR.lastName, AR.phone, AR.email];
    const champs = noms.map((nom) => screen.getByLabelText(nom));
    expect(new Set(champs).size).toBe(noms.length);
    for (const champ of champs) expect(champ).toBeInstanceOf(HTMLInputElement);
    expect(new Set(champs.map((c) => c.id)).size).toBe(noms.length);
  });

  it("⚠ chaque libellé du formulaire porte `for` = l'identifiant d'UN champ qui existe, et deux libellés ne visent jamais le même — en français comme en arabe", async () => {
    await setup();
    for (const langue of ["fr", "ar"] as const) {
      await act(async () => void (await i18next.changeLanguage(langue)));
      const libelles = Array.from(document.querySelectorAll("label.wk-label"));
      expect(libelles.length, langue).toBeGreaterThanOrEqual(4);
      const cibles = libelles.map((l) => l.getAttribute("for"));
      // Verdicts NATIFS (D304, D316) : `getByLabelText` lève une erreur de REQUÊTE quand le lien manque, pas une assertion — c'est ce que mesure la cible N-12.
      for (const cible of cibles) {
        expect(cible, langue).toBeTruthy();
        expect(document.getElementById(cible as string), langue).not.toBeNull();
      }
      expect(new Set(cibles).size, langue).toBe(cibles.length);
    }
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
    expect(screen.getByLabelText(FR.firstName)).toHaveValue("Amine");
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
    await repondreClient();
    fireEvent.click(screen.getByRole("button", { name: FR.previous }));
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText(FR.firstName)).toHaveValue("Amine");
    expect(telephone().value).toBe("550000002");
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
    expect(question()).toBe("Qui est le client ?");
    for (const libelle of [FR.firstName, FR.lastName, FR.email, FR.guests]) expect(screen.getByLabelText(libelle)).toHaveValue("");
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
