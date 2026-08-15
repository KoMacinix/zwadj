// Panneau gauche du tableau de bord — Lot UIP-A, décision ⑦.
//
// ⚠ CE QUE CES TESTS MESURENT VRAIMENT.
// Un compteur est le pire endroit pour un test creux : il rend un nombre, et
// « 0 » est un rendu parfaitement valide. Un test qui monte le composant et
// vérifie qu'un chiffre s'affiche serait vert avec un compteur toujours à zéro.
// Chaque cas ci-dessous fournit donc des lignes qui NE DOIVENT PAS être comptées
// en même temps que celles qui doivent l'être — c'est l'écart entre les deux qui
// prouve que le filtre existe.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ProBookingDTO, ProVisitBookingDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import {
  makeAuthDouble,
  makeBookingsProDouble,
  makeQuotesDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";
import { DashboardAside } from "./dashboard-aside";

initI18n();

/** 8 août 2026, 10 h UTC → 11 h à Alger. La date civile attendue est le 8. */
const NOW_MS = Date.parse("2026-08-08T10:00:00Z");
const TODAY = "2026-08-08";

const VENUE = {
  id: "v1",
  nameFr: "Salle El Ryad",
  nameAr: "قاعة الرياض"
} as Parameters<typeof DashboardAside>[0]["venue"];

function visit(over: Partial<ProVisitBookingDTO>): ProVisitBookingDTO {
  return {
    id: "vb1",
    date: TODAY,
    startMinutes: 600,
    scheduledAt: "2026-08-08T09:00:00.000Z",
    status: "CONFIRMED",
    clientFirstName: "Yacine",
    clientLastName: "Mansouri",
    clientEmail: "y@example.dz",
    contactPhone: "+213550000001",
    cancelledAt: null,
    createdAt: "2026-08-01T09:00:00.000Z",
    ...over
  };
}

function booking(over: Partial<ProBookingDTO>): ProBookingDTO {
  return {
    id: "b1",
    status: "PENDING",
    contactFirstName: "Amine",
    contactLastName: "Belkacem",
    contactPhone: "+213550000002",
    contactEmail: null,
    conflictIds: [],
    ...over
  } as ProBookingDTO;
}

function renderAside(venues = makeVenueClientDouble(), bookingsPro = makeBookingsProDouble()) {
  // ⚠ Le panneau porte désormais une NAVIGATION latérale : il a besoin d'un
  // routeur. C'est le contrat qui a changé avec la refonte, pas le test qui
  // trichait.
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={venues}
        bookingsPro={bookingsPro}
        quotesClient={makeQuotesDouble()}
      >
        <DashboardAside venue={VENUE} nowMs={NOW_MS} />
      </AppProviders>
    </MemoryRouter>
  );
}

describe("Panneau gauche — les onglets (R2b)", () => {
  /** ⚠ L'ORDRE est le sujet, pas la présence. Vérifier que les quatre libellés
   *  existent serait vert avec n'importe quelle permutation — or c'est
   *  précisément la séquence qui a été décidée, et qui s'écarte de la maquette.
   *  On lit donc les liens DANS L'ORDRE DU DOM. */
  it("range les onglets Ma salle → Demandes → Calendrier → Réservations", async () => {
    renderAside();
    const nav = await screen.findByRole("navigation", { name: "Navigation de la salle" });
    const liens = within(nav).getAllByRole("link");
    expect(liens.map((a) => a.textContent)).toEqual([
      "Ma salle",
      "Demandes",
      "Calendrier",
      "Réservations"
    ]);
  });

  /** ⚠ « Et c'est tout » est une borne, donc elle se mesure. Sans ce cas, une
   *  cinquième entrée réintroduite passerait inaperçue tant que les quatre
   *  premières restent dans l'ordre. */
  it("n'expose AUCUN autre onglet — Compte a quitté le panneau", async () => {
    renderAside();
    const nav = await screen.findByRole("navigation", { name: "Navigation de la salle" });
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
    expect(within(nav).queryByRole("link", { name: /compte/i })).toBeNull();
  });

  /** Les icônes sont un HABILLAGE : le nom accessible de chaque onglet doit
   *  rester EXACTEMENT son libellé, sinon les quatre entrées se mettent à
   *  s'annoncer « Ma salle bâtiment », « Calendrier calendrier »…
   *
   *  ⚠ CE QUE CE CAS NE MESURE PAS, ET POURQUOI IL A ÉTÉ RÉÉCRIT. Il comptait
   *  d'abord les `svg[aria-hidden="true"]`. Neutralisation faite : retirer notre
   *  `aria-hidden` explicite laissait le test VERT. Lucide en pose un TOUT SEUL
   *  dès qu'une icône n'a ni enfant ni prop d'accessibilité — notre attribut est
   *  donc redondant, et l'assertion ne pouvait pas rougir.
   *
   *  Le vrai risque est l'inverse : qu'on AJOUTE un `aria-label` à un glyphe
   *  pour « bien faire ». Lucide retire alors son `aria-hidden`, l'icône entre
   *  dans l'arbre d'accessibilité et s'ajoute au nom du lien. C'est cette
   *  correspondance EXACTE que le cas mesure, et elle rougit sur ce geste-là. */
  it("les icônes restent décoratives : le nom accessible est le seul libellé", async () => {
    renderAside();
    const nav = await screen.findByRole("navigation", { name: "Navigation de la salle" });
    for (const libelle of ["Ma salle", "Demandes", "Calendrier", "Réservations"]) {
      expect(within(nav).getByRole("link", { name: libelle })).toBeInTheDocument();
    }
  });
});

describe("Panneau gauche — les deux compteurs (décision ⑦)", () => {
  it("interroge les visites sur la JOURNÉE d'Alger, pas sur une fenêtre glissante", async () => {
    const listVisitBookings = vi.fn().mockResolvedValue([]);
    renderAside(makeVenueClientDouble(null, { listVisitBookings }));

    await screen.findByText("Visites aujourd'hui");
    // ⚠ La borne est RELEVÉE de la fonction partagée, jamais écrite de mémoire :
    // `from` et `to` valent le même jour civil algérien (UTC+1 toute l'année).
    expect(listVisitBookings).toHaveBeenCalledWith("v1", { from: TODAY, to: TODAY });
  });

  it("compte les visites du jour SANS les annulées — le créneau est libéré, personne ne vient", async () => {
    const listVisitBookings = vi.fn().mockResolvedValue([
      visit({ id: "a" }),
      visit({ id: "b" }),
      visit({ id: "c", status: "CANCELLED", cancelledAt: "2026-08-02T09:00:00.000Z" })
    ]);
    renderAside(makeVenueClientDouble(null, { listVisitBookings }));

    // 3 lignes, 2 comptées : c'est l'écart qui prouve le filtre.
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("compte les demandes PENDING seulement — une date acceptée n'attend plus rien", async () => {
    const listForVenue = vi.fn().mockResolvedValue([
      booking({ id: "1" }),
      booking({ id: "2" }),
      booking({ id: "3", status: "ACCEPTED" }),
      booking({ id: "4", status: "DECLINED" })
    ]);
    renderAside(makeVenueClientDouble(), makeBookingsProDouble({ listForVenue }));

    await screen.findByText("Demandes en attente");
    // 4 lignes, 2 comptées.
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("⚠ une réponse MALFORMÉE dit « Indisponible », jamais « 0 » — un compte faux est pire", async () => {
    // Le cas réel : un proxy en 502 rend du HTML. Le `.filter` lève, le
    // `try/catch` du chargeur l'attrape, le compteur annonce qu'il ne sait pas.
    // ⚠ Ce test est une SENTINELLE contre une « correction » tentante : ajouter
    // `Array.isArray(list) ? list : []` afficherait 0 visite un jour où le
    // serveur n'a rien répondu de lisible. Le panneau et l'autre compteur
    // survivent — c'est le `try/catch` qui les protège, pas une garde de forme.
    const listForVenue = vi.fn().mockResolvedValue("<html>502</html>" as unknown as ProBookingDTO[]);
    const listVisitBookings = vi.fn().mockResolvedValue([visit({ id: "a" }), visit({ id: "b" })]);
    renderAside(
      makeVenueClientDouble(null, { listVisitBookings }),
      makeBookingsProDouble({ listForVenue })
    );

    expect(await screen.findByText("Indisponible")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    // L'autre compteur a bien sa valeur : la frontière tient.
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("la même règle vaut côté visites : malformé ⇒ « Indisponible », pas zéro", async () => {
    const listVisitBookings = vi.fn().mockResolvedValue(null as unknown as ProVisitBookingDTO[]);
    const listForVenue = vi.fn().mockResolvedValue([booking({ id: "1" }), booking({ id: "2" }), booking({ id: "3" })]);
    renderAside(
      makeVenueClientDouble(null, { listVisitBookings }),
      makeBookingsProDouble({ listForVenue })
    );

    expect(await screen.findByText("Indisponible")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("⚠ D120 — un résumé de devis MALFORMÉ ne fait pas tomber le panneau (chemin de RENDU)", async () => {
    // ⚠ L'écart avec les deux compteurs : cette valeur part vers le JSX
    // (`conversion.sent`) sans `try/catch` autour. Sans garde de forme, un objet
    // incomplet lève AU RENDU et emporte le panneau entier — nom de la salle et
    // navigation compris. C'est le cas que D120 vise vraiment.
    const conversion = vi.fn().mockResolvedValue({ sent: "deux" } as never);
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppProviders
          client={makeAuthDouble()}
          venues={makeVenueClientDouble()}
          bookingsPro={makeBookingsProDouble()}
          quotesClient={makeQuotesDouble({ conversion })}
        >
          <DashboardAside venue={VENUE} nowMs={NOW_MS} />
        </AppProviders>
      </MemoryRouter>
    );

    expect(await screen.findByText("Salle El Ryad")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Devis/ }));
    expect(await screen.findByText("Résumé indisponible pour le moment.")).toBeInTheDocument();
  });

  it("un compteur qui ÉCHOUE le dit et laisse l'autre vivre — l'échec ne se propage pas", async () => {
    const listForVenue = vi.fn().mockRejectedValue(new Error("réseau"));
    const listVisitBookings = vi.fn().mockResolvedValue([visit({ id: "a" })]);
    renderAside(
      makeVenueClientDouble(null, { listVisitBookings }),
      makeBookingsProDouble({ listForVenue })
    );

    expect(await screen.findByText("Indisponible")).toBeInTheDocument();
    // L'autre compteur a bien sa valeur : 1 visite.
    expect(await screen.findByText("1")).toBeInTheDocument();
  });
});
