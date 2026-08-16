// Nouvelle réservation — client sur place. Lot UIP-B, refonte graphique.
//
// ⚠ CE QUE CES TESTS MESURENT, ET CE QU'ILS REFUSENT DE MESURER.
// Ce composant orchestre cinq appels dans un ordre qui a des conséquences
// financières et un verrou de base de données au bout. Les tests portent donc sur
// la CHAÎNE — quels appels, dans quel ordre, avec quels arguments — et sur les
// trois endroits où l'écran pourrait mentir : un total périmé, une date qu'on
// dirait bloquée sans l'avoir bloquée, et un devis de plus à chaque clic.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function fillContact() {
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Belkacem" } });
  fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000002" } });
}

/** Choisit la date LIBRE dans le calendrier réel, puis son créneau.
 *
 *  ⚠ On attend que la case soit ACTIVE, pas seulement présente. La grille du mois
 *  se dessine avant que la disponibilité n'arrive, et ses cases sont alors
 *  désactivées : cliquer trop tôt ne fait rien, et le test échouerait plus loin
 *  sur un symptôme sans rapport. */
async function pickDateAndSlot() {
  const jour = await screen.findByRole("button", { name: /15/ });
  await waitFor(() => expect(jour).toBeEnabled());
  fireEvent.click(jour);
  const creneau = await screen.findByRole("button", { name: /Soirée/ });
  fireEvent.click(creneau);
  fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "200" } });
}

describe("Nouvelle réservation — l'en-tête et les étapes", () => {
  it("porte le sur-titre, le titre et la description de la maquette", async () => {
    setup();
    expect(await screen.findByRole("heading", { level: 1, name: "Nouvelle réservation" })).toBeInTheDocument();
    expect(screen.getByText("Client présent sur place")).toBeInTheDocument();
    expect(screen.getByText(/synchronisé en temps réel/)).toBeInTheDocument();
  });

  it("les trois étapes se suivent dans l'ORDRE DU DOM, pas dans celui des colonnes", async () => {
    setup();
    await screen.findByRole("heading", { level: 1 });
    const titres = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    // ⚠ L'écart mesuré : la maquette place 02 dans la colonne de droite, ce qui
    // donnerait 01 → 03 → 02 au clavier. Ici le DOM compte à l'endroit.
    expect(titres.slice(0, 3)).toEqual([
      "01Informations client",
      "02Date de l'événement",
      "03Devis et prestations"
    ]);
  });

  it("chaque champ client porte un LABEL visible — quatre cases nues ne se distinguent pas", async () => {
    setup();
    await screen.findByRole("heading", { level: 1 });
    for (const nom of ["Prénom", "Nom", "Téléphone", "E-mail (facultatif)"]) {
      const champ = screen.getByLabelText(nom);
      // `aria-label` seul serait invisible à l'œil : on exige un vrai `<label>`
      // relié par `for`, donc un élément de texte présent dans le document.
      expect(champ).toHaveAttribute("id");
      expect(document.querySelector(`label[for="${champ.getAttribute("id")}"]`)).not.toBeNull();
    }
  });
});

describe("Nouvelle réservation — la date vient du calendrier réel", () => {
  it("une date VENDUE n'est pas cliquable : le moteur décide, pas l'écran", async () => {
    setup();
    // Le 22 est BOOKED côté moteur. On ne recopie pas la règle ici — on vérifie
    // que l'écran obéit à la réponse.
    const vendu = await screen.findByRole("button", { name: /22/ });
    await waitFor(() => expect(vendu).toBeEnabled());
    fireEvent.click(vendu);
    expect(await screen.findByRole("button", { name: /Soirée/ })).toBeDisabled();
  });

  it("le tarif du jour affiché est celui du moteur, jamais un calcul local", async () => {
    setup();
    await pickDateAndSlot();
    // ⚠ `findAllByText` : le tarif du jour paraît DEUX fois — dans le bandeau
    // « tarif jour » et sur la ligne du créneau. Les deux viennent de la même
    // réponse du moteur, donc les deux doivent porter la même valeur.
    const vus = await screen.findAllByText(montant(158_100_000));
    expect(vus.length).toBeGreaterThanOrEqual(1);
  });

  it("aucun montant total avant que le SERVEUR ait chiffré", async () => {
    setup();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Total à facturer")).not.toBeInTheDocument();
  });
});

describe("Nouvelle réservation — un seul devis, révisé", () => {
  it("⚠ le second calcul RÉVISE la chaîne, il ne crée PAS un devis de plus", async () => {
    const create = vi.fn().mockResolvedValue(draft());
    const revise = vi.fn().mockResolvedValue(draft({ version: 2, totalCents: 500_000_000 }));
    setup({ quotes: { create, revise } });
    await pickDateAndSlot();

    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText("Total à facturer");

    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "260" } });
    fireEvent.click(await screen.findByRole("button", { name: "Modifier le devis" }));

    // L'écart qui compte : UN create, UN revise. Sans le suivi de chaîne, ce
    // serait deux create — et le compteur de transformation compterait deux
    // affaires là où il n'y en a qu'une.
    await waitFor(() => expect(revise).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledTimes(1);
    expect(revise).toHaveBeenCalledWith("q1", expect.objectContaining({ guests: 260 }));
  });

  it("le bouton s'appelle « Modifier le devis » dès qu'un devis existe", async () => {
    setup({ quotes: { revise: vi.fn().mockResolvedValue(draft({ version: 2 })) } });
    await pickDateAndSlot();
    expect(screen.getByRole("button", { name: "Calculer le devis" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    expect(await screen.findByRole("button", { name: "Modifier le devis" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calculer le devis" })).not.toBeInTheDocument();
  });
});

describe("Nouvelle réservation — le devis vient à l'utilisateur (R2d)", () => {
  /** ⚠ LE VRAI DÉFAUT ÉTAIT INVISIBLE À L'ŒIL DU DÉVELOPPEUR. Le devis s'affiche
   *  PLUS BAS que le bouton : sur un portable, rien ne bouge dans le champ de
   *  vision et le pro croit que son clic n'a rien fait — il reclique.
   *
   *  Et faire défiler ne suffit pas : un défilement visuel ne déplace pas le
   *  curseur d'un lecteur d'écran. C'est le FOCUS qu'on mesure ici. */
  it("emmène le focus sur le bloc du devis après le calcul", async () => {
    setup();
    await pickDateAndSlot();

    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText("Total à facturer");

    await waitFor(() => {
      const actif = document.activeElement as HTMLElement | null;
      expect(actif?.className).toContain("wk-total");
    });
  });

  /** ⚠ « Le focus est arrivé » ne prouve pas « l'écran a suivi » : les deux sont
   *  découplés par `preventScroll`, justement. jsdom n'implémente pas
   *  `scrollIntoView` — on le pose donc soi-même pour pouvoir l'observer. */
  it("fait aussi défiler, en une seule fois", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    try {
      setup();
      await pickDateAndSlot();
      fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
      await screen.findByText("Total à facturer");
      await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    } finally {
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    }
  });

  /** ⚠ CE CAS EST LA RAISON D'ÊTRE DU DRAPEAU. Sans lui, un effet branché sur
   *  `quote` referait sauter l'écran à CHAQUE remplacement du devis — donc à la
   *  conversion et à l'acceptation, où l'utilisateur n'a rien demandé. Ici le
   *  devis est remplacé sans passer par « Calculer » : rien ne doit bouger. */
  it("ne rebondit PAS quand le devis change sans que le pro ait recalculé", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    try {
      setup({
        quotes: { convert: vi.fn().mockResolvedValue(draft({ status: "ACCEPTED", bookingId: "b1" })) }
      });
      await pickDateAndSlot();
      fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
      await screen.findByText("Total à facturer");
      await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));

      // Conclure exige le contact : sans lui le bouton est inerte et le test
      // ne prouverait rien — il « passerait » sans avoir rien déclenché.
      fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
      fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Belkacem" } });
      fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000002" } });

      const conclure = screen.getByRole("button", { name: "Enregistrer sans bloquer" });
      expect(conclure, "bouton inerte : le cas ne mesurerait rien").toBeEnabled();
      fireEvent.click(conclure);

      // ⚠ ATTENDRE UN SIGNAL D'ACHÈVEMENT, pas un élément déjà présent. Une
      // première version guettait « Total à facturer » — qui est là depuis le
      // calcul : l'assertion tombait AVANT que la conversion soit rendue, et le
      // cas restait vert même en retirant le drapeau. Mesuré par neutralisation.
      // Le message de dénouement, lui, n'apparaît qu'une fois `conclude` fini.
      await screen.findByText("Enregistré en attente. La date n'est pas bloquée et pourra être prise par un autre client.");

      // Le devis a bien été remplacé par la version convertie, et l'écran n'a
      // pas rebondi pour autant.
      expect(scroll).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    }
  });
});

describe("Nouvelle réservation — le total ne survit pas à un changement", () => {
  it("⚠ changer le créneau JETTE le total et le dit — un total périmé est un mensonge", async () => {
    setup();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    expect(await screen.findByText("Total à facturer")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "300" } });

    await waitFor(() => expect(screen.queryByText("Total à facturer")).not.toBeInTheDocument());
    expect(screen.getByText(/recalculez le devis/)).toBeInTheDocument();
  });

  it("le total et l'acompte affichés sont ceux du devis, à l'unité près", async () => {
    setup();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));

    const q = draft();
    expect(await screen.findByText(montant(q.totalCents))).toBeInTheDocument();
    expect(screen.getByText(montant(q.depositCents))).toBeInTheDocument();
    // ⚠ Et l'acompte n'est PAS 30 % du total : c'est la politique de la salle
    // (D81) que le serveur applique. La maquette calcule `total * 0.3`.
    expect(q.depositCents).not.toBe(Math.round(q.totalCents * 0.3));
  });
});

describe("Nouvelle réservation — les deux issues (décision ⑥)", () => {
  it("« Bloquer la date » enchaîne convert → accept : c'est ACCEPT qui verrouille", async () => {
    const convert = vi.fn().mockResolvedValue(draft({ bookingId: "b9" }));
    const accept = vi.fn().mockResolvedValue({ id: "b9", status: "ACCEPTED" });
    const { quotes } = setup({ quotes: { convert }, bookings: { accept } });

    fillContact();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    fireEvent.click(await screen.findByRole("button", { name: "Bloquer la date" }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith("b9"));
    // ⚠ L'ÉTAPE INTERMÉDIAIRE A DISPARU (Q2), et c'est l'assertion qui compte.
    // `conclude()` appelait `send()` sur un brouillon parce que la conversion
    // exigeait `SENT` ; la route n'existe plus, et un appel resté en place
    // aurait échoué au clic, en production, sur les deux issues. Aucun type,
    // aucun lint ne l'aurait vu — le double `deliver` accepte n'importe quel
    // devis.
    expect(quotes.deliver).not.toHaveBeenCalled();
    expect(convert).toHaveBeenCalledWith("q1", {
      contactFirstName: "Amine",
      contactLastName: "Belkacem",
      contactPhone: "+213550000002",
      paymentMethod: "CASH"
    });
  });

  it("⚠ « Enregistrer » n'appelle JAMAIS accept — le standby ne verrouille rien", async () => {
    const convert = vi.fn().mockResolvedValue(draft({ bookingId: "b9" }));
    const accept = vi.fn();
    setup({ quotes: { convert }, bookings: { accept } });

    fillContact();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    fireEvent.click(await screen.findByRole("button", { name: /Enregistrer/ }));

    expect(await screen.findByText(/n'est pas bloquée/)).toBeInTheDocument();
    expect(accept).not.toHaveBeenCalled();
    expect(convert).toHaveBeenCalledTimes(1);
  });

  it("la date prise entre-temps remonte l'erreur de la BASE, et l'écran ne dit pas « bloquée »", async () => {
    const accept = vi.fn().mockRejectedValue(
      Object.assign(new Error("409"), { status: 409, code: "BOOKING_SLOT_TAKEN" })
    );
    setup({
      quotes: { convert: vi.fn().mockResolvedValue(draft({ bookingId: "b9" })) },
      bookings: { accept }
    });

    fillContact();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    fireEvent.click(await screen.findByRole("button", { name: "Bloquer la date" }));

    await waitFor(() => expect(accept).toHaveBeenCalled());
    // ⚠ L'assertion qui compte : AUCUNE annonce de succès. Un écran qui dirait
    // « date bloquée » après un refus de la base ferait perdre la salle deux fois.
    expect(screen.queryByText(/La date est bloquée/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("⚠ sans e-mail, la clé est ABSENTE du corps — jamais une chaîne vide (D135)", async () => {
    const convert = vi.fn().mockResolvedValue(draft({ bookingId: "b9" }));
    setup({ quotes: { convert } });

    fillContact();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    fireEvent.click(await screen.findByRole("button", { name: /Enregistrer/ }));

    await waitFor(() => expect(convert).toHaveBeenCalled());
    // `contactEmail: ""` serait refusé par `.email()` : l'écran renverrait une
    // erreur de validation là où il n'y a rien à déclarer.
    const corps = convert.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(corps).not.toHaveProperty("contactEmail");
    expect(corps.contactPhone).toBe("+213550000002");
  });

  it("conclure exige nom, prénom et TÉLÉPHONE — l'e-mail est facultatif (D135)", async () => {
    setup();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText("Total à facturer");

    expect(screen.getByRole("button", { name: "Bloquer la date" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amine" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Belkacem" } });
    expect(screen.getByRole("button", { name: "Bloquer la date" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000002" } });
    expect(screen.getByRole("button", { name: "Bloquer la date" })).toBeEnabled();
  });
});

describe("Nouvelle réservation — la remise par canal (Q2) et le catalogue", () => {
  /** ⚠ CES BOUTONS ÉTAIENT INERTES ET NE LE SONT PLUS. Trois d'entre eux
   *  disaient « en attente du PDF et de la fiche client » ; ils enregistrent
   *  désormais COMMENT le pro a remis le devis, avec ses propres moyens. Le
   *  quatrième — « Envoyer par e-mail » — a disparu : `EMAIL` n'est pas un des
   *  quatre canaux et rien ne l'enverrait. */
  it("les quatre canaux sont RENDUS et ACTIFS une fois le devis calculé", async () => {
    setup();
    fillContact();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText("Total à facturer");

    for (const nom of ["Imprimé et remis", "Envoyé par SMS", "Annoncé de vive voix", "Convenu par téléphone"]) {
      expect(screen.getByRole("button", { name: nom })).toBeEnabled();
    }
    // ⚠ Et le cinquième n'est pas revenu par nostalgie du gabarit.
    expect(screen.queryByRole("button", { name: /e-mail/i })).toBeNull();
  });

  it("enregistre le canal cliqué sur le devis en cours", async () => {
    const deliver = vi.fn().mockResolvedValue(draft({ sentVia: "PRINT", sentAt: "2026-08-15T09:00:00.000Z" }));
    setup({ quotes: { deliver } });
    fillContact();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    fireEvent.click(await screen.findByRole("button", { name: "Imprimé et remis" }));

    await waitFor(() => expect(deliver).toHaveBeenCalledWith("q1", { sentVia: "PRINT" }));
    // ⚠ L'écran DIT ce que le SERVEUR a écrit, il ne le suppose pas : la
    // confirmation vient du devis rendu, donc un 409 ne produirait aucune
    // annonce de remise.
    expect(await screen.findByText("Remise enregistrée : Imprimé et remis")).toBeInTheDocument();
  });

  /** ⚠ D160 + D158 — LA GARDE DU TÉLÉPHONE, ET SON PÉRIMÈTRE. On ne peut ni
   *  envoyer un SMS ni appeler un numéro qu'on n'a pas. Mais l'appliquer aux
   *  quatre canaux interdirait de déclarer un devis remis EN MAIN PROPRE à
   *  quelqu'un dont on n'a pas le numéro — le cas même que les canaux
   *  déclaratifs existent pour couvrir. C'est l'ÉCART entre les deux moitiés du
   *  test qui prouve que la borne est posée là où elle décrit quelque chose. */
  it("⚠ SMS et téléphone exigent un mobile valide ; imprimer et vive voix, non", async () => {
    setup();
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText("Total à facturer");

    // Aucun téléphone saisi.
    expect(screen.getByRole("button", { name: "Envoyé par SMS" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Convenu par téléphone" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Imprimé et remis" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Annoncé de vive voix" })).toBeEnabled();
    expect(screen.getByText(/demandent un numéro de mobile valide/)).toBeInTheDocument();
  });

  it("un numéro MAL FORMÉ ne débloque pas davantage qu'un champ vide", async () => {
    // ⚠ Le cas qui distingue « il y a du texte » de « c'est un mobile
    // algérien ». Un fixe d'Alger a huit chiffres et passerait un simple test
    // de non-vacuité : c'est `normalizeDzPhone` qui tranche, pas la longueur.
    setup();
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "021234567" } });
    await pickDateAndSlot();
    fireEvent.click(screen.getByRole("button", { name: "Calculer le devis" }));
    await screen.findByText("Total à facturer");

    expect(screen.getByRole("button", { name: "Envoyé par SMS" })).toBeDisabled();

    // Et le même champ, avec un vrai mobile, débloque : l'écart est la mesure.
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "0555123456" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Envoyé par SMS" })).toBeEnabled());
  });

  it("le catalogue affiché est celui de la SALLE — aucune prestation inventée", async () => {
    setup({
      services: {
        listForVenue: vi.fn().mockResolvedValue([
          { id: "srv1", nameFr: "DJ & sonorisation", nameAr: "دي جي", pricingType: "FIXED", isActive: true },
          { id: "srv2", nameFr: "Retirée", nameAr: "م", pricingType: "FIXED", isActive: false }
        ])
      }
    });
    expect(await screen.findByRole("checkbox", { name: /DJ & sonorisation/ })).toBeInTheDocument();
    // Les retirées de la vente ne s'affichent pas, et la maquette n'a rien ajouté :
    // ni décoration florale, ni traiteur, ni paliers inventés.
    expect(screen.queryByText("Retirée")).not.toBeInTheDocument();
    expect(screen.queryByText(/Décoration florale/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Traiteur/)).not.toBeInTheDocument();
  });

  it("⚠ un catalogue ILLISIBLE le dit — jamais « aucune prestation », qui est un autre fait (D133)", async () => {
    setup({ services: { listForVenue: vi.fn().mockResolvedValue("<html>502</html>" as never) } });
    expect(await screen.findByText(/catalogue n'a pas pu être lu/)).toBeInTheDocument();
    expect(screen.queryByText(/aucune prestation en vente/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
