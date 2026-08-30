// Devis — écran PRO, Lot E2e ; refonte de la machine à états au lot Q2.
//
// Ce qui se prouve ici, et qui n'est pas cosmétique :
//   - que l'écran n'affiche AUCUN montant qu'il aurait calculé lui-même : tous
//     viennent du `QuoteDTO` rendu par le serveur ;
//   - que le bouton dit « Créer la demande » et non « Accepter » ;
//   - que « remplacé » et « refusé » ne se lisent pas pareil ;
//   - qu'un devis converti l'annonce, au lieu de laisser le pro recliquer.
//
// ── ⚠ ET SURTOUT, DEPUIS Q2 : QUE LES BOUTONS N'ONT PAS DISPARU ─────────────
// L'écran décidait de trois affichages sur `status === "SENT"`. Ce statut n'est
// plus écrit : les trois conditions seraient devenues fausses et convertir,
// refuser et réviser auraient quitté l'écran SANS ERREUR. Aucun test existant
// ne l'aurait vu — ils partaient tous d'une fixture en `SENT`. Les cas
// ci-dessous partent donc d'un `DRAFT`, qui est l'état RÉEL d'un devis neuf
// après Q2, et c'est ce changement de fixture qui fait le travail.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { QuotesClient } from "@zwadj/api-client";
import { QUOTE_SENT_VIA_ORDER, QuoteStatus, type QuoteDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeQuotesDouble, makeServicesDouble, makeVenueClientDouble } from "../test-support/client-doubles";

import { QuotesSection } from "./quotes-section";

initI18n();

/** ⚠ `DRAFT` et `sentVia: null` — l'état d'un devis neuf APRÈS Q2. La fixture
 *  d'avant était en `SENT`, statut que plus rien n'écrit : la garder aurait
 *  laissé toute cette suite verte sur un état que la production ne produit
 *  plus. Une fixture périmée est un test qui mesure le passé. */
const BASE: QuoteDTO = {
  id: "q1",
  venueId: "v1",
  clientId: null,
  status: "DRAFT",
  version: 1,
  chainId: "q1",
  parentQuoteId: null,
  eventDate: "2027-09-18",
  slotTemplateId: "s1",
  guests: 250,
  basePriceCents: 20_000_000,
  servicesTotalCents: 5_000_000,
  totalCents: 25_000_000,
  depositCents: 7_500_000,
  lines: [],
  sentAt: null,
  sentVia: null,
  acceptedAt: null,
  createdAt: "2026-08-02T09:00:00.000Z",
  bookingId: null
};

function setup(rows: QuoteDTO[], overrides: Partial<QuotesClient> = {}) {
  const client = makeQuotesDouble({ listForVenue: vi.fn().mockResolvedValue(rows), ...overrides });
  render(
    <MemoryRouter>
      <AppProviders
        client={makeAuthDouble()}
        venues={makeVenueClientDouble()}
        servicesClient={makeServicesDouble()}
        quotesClient={client}
      >
        <QuotesSection venueId="v1" />
      </AppProviders>
    </MemoryRouter>
  );
  return client;
}

describe("Devis pro — les montants viennent du SERVEUR", () => {
  it("affiche le total et l'acompte tels que l'API les rend", async () => {
    setup([BASE]);
    // 25 000 000 centimes = 250 000 DA ; acompte 7 500 000 = 75 000 DA.
    expect(await screen.findByText((text) => /250.?000/.test(text))).toBeInTheDocument();
    expect(screen.getByText((text) => /acompte/.test(text) && /75.?000/.test(text))).toBeInTheDocument();
  });

  it("le formulaire de création n'affiche AUCUN total : rien n'est calculé ici", async () => {
    setup([]);
    await screen.findByText(/Aucun devis/);
    expect(screen.getByText(/calculé par le serveur/)).toBeInTheDocument();
  });
});

describe("Devis pro — accepter n'est pas une action", () => {
  it("le bouton dit « Créer la demande », jamais « Accepter »", async () => {
    setup([BASE]);
    expect(await screen.findByRole("button", { name: /Créer la demande de réservation/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Accepter/ })).toBeNull();
  });

  it("un devis DÉJÀ converti l'annonce au lieu de proposer de recliquer", async () => {
    setup([{ ...BASE, bookingId: "b1" }]);
    expect(await screen.findByText(/attend votre acceptation de la date/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Créer la demande de réservation/ })).toBeNull();
  });

  it("la conversion exige nom, prénom et TÉLÉPHONE — plus l'e-mail (D135)", async () => {
    const client = setup([BASE]);
    fireEvent.click(await screen.findByRole("button", { name: /Créer la demande de réservation/ }));
    expect(screen.getByRole("button", { name: "Créer la demande" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Prénom du client"), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText("Nom du client"), { target: { value: "Bensalem" } });
    fireEvent.change(screen.getByLabelText("Téléphone du client"), { target: { value: "+213550000001" } });

    // ⚠ Trois champs, et le bouton s'ACTIVE : l'e-mail reste vide. Ce test
    // mesurait l'inverse jusqu'à D135, parce que la borne Zod était plus stricte
    // que `bookings.contact_email`, qui est nullable depuis toujours.
    fireEvent.click(screen.getByRole("button", { name: "Créer la demande" }));
    await waitFor(() => expect(client.convert).toHaveBeenCalled());

    // ⚠ Et la CLÉ EST ABSENTE, jamais `""` : `.email()` refuse la chaîne vide.
    const corps = vi.mocked(client.convert).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(corps).not.toHaveProperty("contactEmail");
    expect(corps.contactPhone).toBe("+213550000001");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Q2 — LE PIÈGE N°2, MESURÉ.
//
// ⚠ CE QUE CE BLOC ATTRAPE ET QUE LES SIX PORTES NE VOIENT PAS. Un bouton qui
// disparaît d'un écran ne casse rien : pas d'exception, pas de type invalide,
// pas de requête en échec. L'app se compile, se lint, se construit et se teste
// en vert — et le pro ne peut plus conclure une affaire. Seule une assertion de
// PRÉSENCE sur l'état réel après migration peut le voir.
// ─────────────────────────────────────────────────────────────────────────────
describe("Q2 — un BROUILLON reste conclusible : les trois boutons sont là", () => {
  it("un devis DRAFT propose convertir, clore ET réviser", async () => {
    setup([BASE]);
    expect(await screen.findByRole("button", { name: /Créer la demande de réservation/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clore le devis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Créer une version/ })).toBeInTheDocument();
  });

  it("⚠ la conversion NE DEMANDE PLUS de remise préalable (D160)", async () => {
    // Le devis n'a jamais été remis — `sentVia` est nul — et il se convertit
    // quand même. C'est l'écart avec l'avant : « Envoyer » était un péage.
    const client = setup([{ ...BASE, sentVia: null, sentAt: null }]);
    fireEvent.click(await screen.findByRole("button", { name: /Créer la demande de réservation/ }));
    fireEvent.change(screen.getByLabelText("Prénom du client"), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText("Nom du client"), { target: { value: "Bensalem" } });
    fireEvent.change(screen.getByLabelText("Téléphone du client"), { target: { value: "+213550000001" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la demande" }));

    await waitFor(() => expect(client.convert).toHaveBeenCalled());
    // Et AUCUNE remise n'a été déclenchée au passage : convertir n'est pas
    // remettre, sinon l'entonnoir compterait des devis que personne n'a reçus.
    expect(client.deliver).not.toHaveBeenCalled();
  });

  it("⚠ un devis LEGACY resté en SENT garde ses boutons — la migration ne l'a pas amputé", async () => {
    // D166 : les `SENT` qui portaient une réservation n'ont PAS été ramenés en
    // DRAFT. Ces lignes existent encore, et le pro doit pouvoir agir dessus.
    setup([{ ...BASE, status: "SENT", sentAt: "2026-08-02T10:00:00.000Z" }]);
    expect(await screen.findByRole("button", { name: "Clore le devis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Créer une version/ })).toBeInTheDocument();
  });

  it("une chaîne CLOSE ne propose plus rien : ni conversion, ni refus, ni remise", async () => {
    // L'écart qui prouve que la condition n'est pas « toujours vrai ». Sans lui,
    // remplacer les trois tests par `true` passerait les cas ci-dessus.
    setup([{ ...BASE, status: "CANCELLED" }]);
    expect(await screen.findByText("Clos sans suite")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Créer la demande de réservation/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clore le devis" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enregistrer la remise" })).toBeNull();
  });
});

describe("Q2 — la remise par canal", () => {
  it("offre les QUATRE canaux, dans l'ordre du contrat partagé", async () => {
    setup([BASE]);
    const select = await screen.findByLabelText("Comment le devis a-t-il été remis ?");
    const options = [...select.querySelectorAll("option")].map((o) => o.getAttribute("value"));
    // ⚠ L'ordre est RELEVÉ du contrat, jamais recopié ici : recopier « PRINT,
    // SMS, IN_PERSON, PHONE » ferait un test qui valide sa propre copie.
    expect(options).toEqual(["", ...QUOTE_SENT_VIA_ORDER]);
  });

  it("⚠ n'enregistre RIEN tant qu'aucun canal n'est choisi — pas de canal par défaut", async () => {
    // D168 appliquée au présent : un canal qu'on n'a pas choisi est un canal
    // inventé, et il fausserait l'entonnoir sans jamais lever d'erreur.
    setup([BASE]);
    expect(await screen.findByRole("button", { name: "Enregistrer la remise" })).toBeDisabled();
  });

  it("enregistre le canal choisi, et le devis NE CHANGE PAS d'état", async () => {
    const client = setup([BASE]);
    fireEvent.change(await screen.findByLabelText("Comment le devis a-t-il été remis ?"), {
      target: { value: "IN_PERSON" }
    });
    const bouton = screen.getByRole("button", { name: "Enregistrer la remise" });
    expect(bouton).toBeEnabled();
    fireEvent.click(bouton);

    await waitFor(() => expect(client.deliver).toHaveBeenCalledWith("q1", { sentVia: "IN_PERSON" }));
  });

  it("DIT si le devis a été remis, et par quoi — sinon le pro remet deux fois", async () => {
    setup([{ ...BASE, sentVia: "PHONE", sentAt: "2026-08-02T10:00:00.000Z" }]);
    expect(await screen.findByText(/Remis au client : Convenu par téléphone/)).toBeInTheDocument();
  });

  it("et dit aussi quand il ne l'a PAS été — l'écart prouve que la ligne lit la donnée", async () => {
    setup([BASE]);
    expect(await screen.findByText("Pas encore remis au client.")).toBeInTheDocument();
    expect(screen.queryByText(/Remis au client :/)).toBeNull();
  });
});

describe("Q3a — chaque statut sait s'afficher", () => {
  /** ⚠ CETTE GARDE AURAIT ATTRAPÉ UN DÉFAUT DE CE LOT MÊME. L'écran rend
   *  `t(\`venue.ui.quotes.st_${'${latest.status}'}\`)`. Ajouter `CANCELLED` à l'énuméré sans
   *  ajouter `st_CANCELLED` aux deux langues n'aurait produit AUCUNE erreur :
   *  i18next rend la clé brute, et le pro aurait lu « venue.ui.quotes.st_CANCELLED »
   *  dans son tableau de bord.
   *
   *  ⚠ Elle boucle sur l'ÉNUMÉRÉ, pas sur une liste recopiée — sinon elle ne
   *  verrait pas le statut qu'on aurait oublié d'y ajouter, qui est précisément
   *  celui qui casse. Les statuts LEGACY y sont compris : ils sont encore en
   *  base, donc encore affichés. */
  it("les SIX statuts, LEGACY compris, ont un libellé dans les deux langues", async () => {
    const statuts = Object.values(QuoteStatus);
    expect(statuts.length).toBe(6);
    setup(statuts.map((status, i) => ({ ...BASE, id: `q${i}`, chainId: `q${i}`, status })));

    // On attend que la liste soit rendue avant d'inspecter.
    await screen.findByText("Brouillon");
    for (const status of statuts) {
      expect(
        screen.queryByText(`venue.ui.quotes.st_${status}`),
        `libellé manquant pour ${status} — le pro verrait la clé brute`
      ).toBeNull();
    }
  });
});

describe("Q3a — l'écran ne montre QUE la dernière version (décision A)", () => {
  /** ⚠ CE CAS EST L'INVERSE DE CE QU'IL MESURAIT. Il exigeait que l'historique
   *  d'une chaîne « reste lisible » sous un repli. La décision A garde le
   *  VERSIONNEMENT en base — c'est lui qui protège la traçabilité, et il n'y a
   *  donc aucune garde en base à écrire — mais retire son AFFICHAGE : trois
   *  versions dépliables encombraient l'écran sans servir au quotidien. */
  it("affiche la dernière version, et PAS les précédentes", async () => {
    setup([
      { ...BASE, id: "v1", version: 1, status: "SUPERSEDED", totalCents: 30_000_000 },
      { ...BASE, id: "v2", version: 2, chainId: "q1", parentQuoteId: "v1", totalCents: 25_000_000 }
    ]);
    // La v2 est là, avec son numéro : sans lui, le pro ne saurait pas qu'il a révisé.
    expect(await screen.findByText("Version 2")).toBeInTheDocument();
    expect(screen.queryByText(/version\(s\) précédente\(s\)/)).toBeNull();
    // ⚠ Et l'ÉCART qui prouve qu'on affiche bien la DERNIÈRE et non la première :
    // 300 000 DA était le total de la v1, il ne doit apparaître nulle part.
    expect(screen.queryByText((txt) => /300.?000/.test(txt))).toBeNull();
    expect(screen.getByText((txt) => /250.?000/.test(txt))).toBeInTheDocument();
  });

  it("une chaîne d'UNE seule version s'affiche comme avant", async () => {
    // Le cas courant ne doit pas avoir régressé au passage.
    setup([BASE]);
    expect(await screen.findByText("Version 1")).toBeInTheDocument();
  });
});

describe("Devis pro — le taux de transformation", () => {
  it("affiche les TROIS compteurs de chaînes : « expirés » a disparu avec validUntil", async () => {
    setup([], { conversion: vi.fn().mockResolvedValue({ delivered: 7, accepted: 3, cancelled: 2 }) });
    expect(await screen.findByText(/7 remis · 3 aboutis · 2 perdus/)).toBeInTheDocument();
    // ⚠ L'assertion NÉGATIVE compte autant : un quatrième compteur figé à zéro
    // serait un fait présenté comme mesuré, qui ne l'est plus.
    expect(screen.queryByText(/expirés/)).toBeNull();
  });
});

describe("Q2 — ce que l'écran ne propose PLUS", () => {
  it("aucun champ « Valable jusqu'au » : le devis n'expire plus (D160)", async () => {
    setup([]);
    await screen.findByText(/Aucun devis/);
    expect(screen.queryByLabelText(/Valable jusqu'au/)).toBeNull();
  });

  it("aucun bouton « Envoyer » : la remise a remplacé l'envoi", async () => {
    setup([BASE]);
    await screen.findByRole("button", { name: /Créer la demande de réservation/ });
    expect(screen.queryByRole("button", { name: "Envoyer" })).toBeNull();
  });
});
