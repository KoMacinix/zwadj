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
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { formatDZD } from "@zwadj/i18n";
import type { QuoteDTO, VenueProDTO } from "@zwadj/types";
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

/** Un jour LIBRE et un jour VENDU, pour que le test puisse mesurer l'écart entre
 *  « cliquable » et « refusé par le moteur ». Les prix sont ceux que rendrait le
 *  moteur (B2/B3) — jamais recalculés ici. */
const LIBRE = "2026-08-15";
const AUTRE = "2026-08-16";
const VENDU = "2026-08-22";

/** ⚠ La disponibilité passe désormais par le CLIENT AUTHENTIFIÉ
 *  (`GET /pro/venues/:id/availability`), plus par un `fetch` brut sur la route
 *  publique. Ces tests stubaient donc `global.fetch`, ce qui ne mesurait plus
 *  rien : ils validaient un chemin que le composant n'emprunte plus. */
function availabilityDouble() {
  return vi.fn().mockResolvedValue({
    venueId: "v1",
    slug: "salle-el-ryad",
    bookingMode: "SINGLE_SLOT",
    from: "2026-08-01",
    to: "2026-08-31",
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

function setup(
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
}

/** ⚠ On attend que la case soit ACTIVE, pas seulement présente. La grille du
 *  mois se dessine avant que la disponibilité n'arrive, et ses cases sont alors
 *  désactivées : cliquer trop tôt ne fait rien, et le test échouerait plus loin
 *  sur un symptôme sans rapport. */
async function repondreDate(jourVisible = /15/) {
  const jour = await screen.findByRole("button", { name: jourVisible });
  await waitFor(() => expect(jour).toBeEnabled());
  fireEvent.click(jour);
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
    setup();
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
    setup();
    await repondreClient();
    expect(screen.queryByLabelText("Prénom")).toBeNull();
    expect(screen.queryByLabelText("Nombre d'invités")).toBeNull();
  });

  it("chaque réponse fait apparaître la suivante, dans l'ordre arbitré", async () => {
    setup();
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
    setup();
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
    expect(question()).toBe("Qui est le client ?");
  });

  it("⚠ le nombre d'invités MANQUANT bloque aussi — il chiffre les prestations", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Belkacem" } });
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000002" } });
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
  });

  it("chaque champ client porte un LABEL visible — quatre cases nues ne se distinguent pas", () => {
    setup();
    // ⚠ Libellés EXACTS, pas des expressions régulières : /Nom/ attrapait aussi
    // « Nombre d'invités », et le test échouait sur son propre sélecteur.
    for (const nom of ["Prénom", "Nom", "Téléphone", "E-mail (facultatif)"]) {
      expect(screen.getByLabelText(nom)).toBeInstanceOf(HTMLInputElement);
    }
  });

  it("le fil de progression NOMME l'étape courante pour un lecteur d'écran", async () => {
    setup();
    const courant = () => screen.getByRole("navigation").querySelector('[aria-current="step"]');
    expect(courant()?.textContent).toContain("Client");
    await repondreClient();
    expect(courant()?.textContent).toContain("Date");
  });
});

describe("Récapitulatif — des réponses, JAMAIS des montants", () => {
  it("fige la réponse validée en ligne de récapitulatif", async () => {
    setup();
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
    setup();
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
    setup();
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
    setup();
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
    setup();
    await repondreClient();
    await repondreDate();
    await repondreCreneau();
    modifierDepuisRecap(/Modifier.*Client/);
    const recapEl = recap();
    expect(recapEl.textContent).toContain("Soirée");
    expect(recapEl.textContent).toContain("2026-08-15");
  });

  it("valider une étape corrigée renvoie à la PREMIÈRE question sans réponse", async () => {
    setup();
    await allerAuDevis();
    modifierDepuisRecap(/Modifier.*Client/);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    // Tout est répondu : on retombe au devis, pas au début du parcours.
    expect(question()).toBe("Devis");
  });
});

describe("Rail latéral, numéros cliquables et remise à zéro", () => {
  it("⚠ cliquer le NUMÉRO d'une étape répondue vaut « Modifier »", async () => {
    setup();
    await repondreClient();
    await repondreDate();
    fireEvent.click(within(rail()).getByRole("button", { name: /Modifier.*Client/ }));
    expect(question()).toBe("Qui est le client ?");
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
  });

  it("⚠ une étape SANS réponse n'est pas cliquable dans le rail", () => {
    // Un bouton qui n'agit pas est pire qu'un élément inerte : il promet une
    // commande. Les étapes non répondues restent de simples `<span>`.
    setup();
    expect(within(rail()).queryAllByRole("button")).toHaveLength(0);
  });

  it("« Annuler » remet tout à zéro et ramène à la première question", async () => {
    setup();
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
    setup({
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
    setup();
    await repondreClient();
    await waitFor(() => expect(grilleDuMois()).not.toBeNull());
    expect(screen.queryByRole("button", { name: /Soirée/ })).toBeNull();
  });

  it("⚠ l'étape créneau montre les créneaux, PAS la grille du mois", async () => {
    setup();
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
    setup();
    await repondreClient();
    const vendu = await screen.findByRole("button", { name: /22/ });
    await waitFor(() => expect(vendu).toBeEnabled());
    fireEvent.click(vendu);
    expect(await screen.findByRole("button", { name: /Soirée/ })).toBeDisabled();
  });

  it("⚠ changer la date EFFACE le créneau, le DIT, et repose la question", async () => {
    // Le cas que la maquette n'a pas : garder à l'écran un créneau qui ne
    // s'applique plus serait pire que de le perdre.
    setup({ services: { listForVenue: vi.fn().mockResolvedValue([]) } });
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
    const { quotes } = setup({
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
    setup();
    await allerAuDevis();
    expect(screen.queryByText(montant(478_600_000))).toBeNull();
  });

  it("le total et l'acompte affichés sont ceux du devis, à l'unité près", async () => {
    setup();
    await allerAuDevis();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    expect(await screen.findByText(montant(478_600_000))).toBeInTheDocument();
    expect(screen.getByText(montant(150_000_000))).toBeInTheDocument();
  });

  it("⚠ changer une condition JETTE le total et le dit — un total périmé est un mensonge", async () => {
    setup();
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
  it("⚠ ne vole PAS le focus au premier rendu — personne n'a rien demandé", () => {
    setup();
    expect(document.activeElement).toBe(document.body);
  });

  it("emmène le focus sur la carte de l'étape à chaque transition", async () => {
    setup();
    await repondreClient();
    await waitFor(() => {
      const carte = screen.getByRole("heading", { level: 2 }).closest("section");
      expect(document.activeElement).toBe(carte);
    });
  });

  it("fait aussi défiler, en une seule fois", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    setup();
    await repondreClient();
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
  });
});

describe("Les deux issues (décision ⑥)", () => {
  async function jusquAuTotal(over: Parameters<typeof setup>[0] = {}) {
    const outils = setup(over);
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
    const outils = setup(over);
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
    setup({
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
    setup({ services: { listForVenue: vi.fn().mockRejectedValue(new Error("boom")) } });
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
    setup();
    const avant = document.querySelector(".zj-card");
    await repondreClient();
    const apres = document.querySelector(".zj-card");
    expect(apres).not.toBeNull();
    expect(apres).not.toBe(avant);
  });

  it("le rail et le récapitulatif portent la chrome partagée ET la mise en page du Pro", () => {
    // `grid-area` et la position collante restent propres à cet écran : si la
    // `className` d'app sautait, le rail quitterait sa colonne.
    setup();
    expect(rail()).toHaveClass("zj-rail");
    expect(rail()).toHaveClass("wk-rail");
  });

  it("le bouton « Modifier » est le composant partagé, identique au client", async () => {
    setup();
    await repondreClient();
    const bouton = within(recap()).getByRole("button", { name: /Modifier/ });
    expect(bouton).toHaveClass("zj-recap-edit");
  });

  it("⚠ TRAIT DE LIAISON : absent tant qu'il n'y a rien à relier, présent ensuite", async () => {
    setup();
    expect(document.querySelector(".zj-connector")).toBeNull();
    await repondreClient();
    expect(document.querySelector(".zj-connector")).not.toBeNull();
  });

  it("la coche du rail est une icône, la même que côté client", async () => {
    setup();
    await repondreClient();
    const faite = rail().querySelector("li.is-done .zj-rail-n");
    expect(faite?.querySelector("svg")).not.toBeNull();
  });
});
