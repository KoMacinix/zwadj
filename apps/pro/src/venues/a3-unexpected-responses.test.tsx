/**
 * T2 / A3 — RÉPONSES RÉSEAU INATTENDUES (D120).
 *
 * Ce que l'inventaire a trouvé : six sections font `setState(await …list())`
 * sans garde de forme, quatre avec. Et **aucune `ErrorBoundary` dans le dépôt**
 * — zéro occurrence, pas d'`error.tsx` App Router non plus. La garde de forme
 * est donc aujourd'hui la SEULE protection : une section qui lève au rendu
 * emporte la page entière.
 *
 * ⚠ POURQUOI CE N'EST PAS THÉORIQUE. `venue-calendar-page` monte TROIS sections
 * ensemble (demandes, devis, visites). La seule non gardée des trois est
 * `VisitsSection` : sa chute emporte les deux autres, dont les devis — c'est-à-
 * dire l'argent.
 *
 * Ce que « échouer proprement » veut dire ici, et qu'on vérifie :
 *   1. la section rend un état d'erreur lisible, pas un écran blanc ;
 *   2. ses VOISINES continuent d'afficher leurs données ;
 *   3. rien n'est levé hors du rendu (pas de rejet non capturé).
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VenueProClient } from "@zwadj/api-client";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import {
  makeAuthDouble,
  makeBookingsProDouble,
  makeServicesDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";
import { BlocksSection } from "./blocks-section";
import { GuardedSection } from "./guarded-section";
import { BookingRequestsSection } from "./booking-requests-section";
import { ServicesSection } from "./services-section";
import { VisitsSection } from "./visits-section";

initI18n();

/**
 * Les formes qu'une réponse peut prendre quand quelque chose a mal tourné :
 * un proxy qui renvoie du HTML, un backend qui rend `null`, un DTO amputé, une
 * panne réseau. Aucune n'est exotique — la première est ce que renvoie un
 * reverse-proxy mal configuré, et elle traverse `JSON.parse` sans broncher
 * quand le `content-type` ment.
 */
const FORMES_INATTENDUES: { nom: string; valeur: unknown }[] = [
  { nom: "null", valeur: null },
  { nom: "undefined", valeur: undefined },
  { nom: "objet au lieu d'un tableau", valeur: { items: [] } },
  { nom: "chaîne (HTML d'un proxy)", valeur: "<!doctype html><html>502</html>" }
];

/**
 * ⚠ CAS À PART, ET C'EST LE POINT DE TOUT L'EXERCICE.
 *
 * Un tableau VALIDE dont les LIGNES sont amputées passe `Array.isArray` sans
 * broncher, puis explose au rendu quand celui-ci lit un champ absent. Aucune
 * garde de forme raisonnable ne couvre ça : il faudrait valider chaque champ de
 * chaque ligne à chaque écran. C'est exactement la place de la frontière.
 */
const LIGNES_AMPUTEES = [{ id: "x" }];

/**
 * ⚠ SANS CETTE ASSERTION, CES TESTS PASSAIENT POUR RIEN.
 *
 * Première version : `waitFor(heading présent)`. Vert sur du code cassé — le
 * titre existe dès l'état de CHARGEMENT, donc l'assertion tombait AVANT que la
 * réponse aberrante n'arrive. `rows.map is not a function` était bien levé,
 * mais après le verdict, et React se contentait de le journaliser.
 *
 * On attend donc que le chargement ait eu lieu, et on juge sur ce que React
 * écrit quand un rendu explose. C'est ça, l'invariant : pas « un titre existe »,
 * mais « rien n'a explosé ».
 */
let erreursNonCapturees: unknown[] = [];
beforeEach(() => {
  erreursNonCapturees = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    erreursNonCapturees.push(args);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Erreurs de RENDU React, distinguées des simples avertissements. */
function erreursDeRendu(): string[] {
  return erreursNonCapturees
    .map((a) => (Array.isArray(a) ? a.map(String).join(" ") : String(a)))
    .filter((m) => m.includes("TypeError") || m.includes("The above error occurred"));
}

/** Laisse le `load()` du montage se résoudre ET le rendu suivant s'exécuter. */
async function apresChargement(appel: { mock: { calls: unknown[] } }): Promise<void> {
  await waitFor(() => expect(appel.mock.calls.length).toBeGreaterThan(0));
  await act(async () => {
    await Promise.resolve();
  });
}

function renderAvec(venues: VenueProClient, ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AppProviders client={makeAuthDouble()} venues={venues}>
        {ui}
      </AppProviders>
    </MemoryRouter>
  );
}

describe("A3 — VisitsSection face à une réponse inattendue (D120)", () => {
  for (const forme of FORMES_INATTENDUES) {
    it(`survit à : ${forme.nom}`, async () => {
      const venues = makeVenueClientDouble(null, {
        listVisitBookings: vi.fn().mockResolvedValue(forme.valeur)
      });

      renderAvec(venues, <VisitsSection venueId="v1" />);
      await apresChargement(venues.listVisitBookings as never);

      // Le titre reste à l'écran : la section a échoué SUR PLACE.
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      // Et RIEN n'a explosé au rendu.
      expect(erreursDeRendu(), erreursDeRendu().join("\n")).toEqual([]);
    });
  }

  it("survit à une panne réseau", async () => {
    const venues = makeVenueClientDouble(null, {
      listVisitBookings: vi.fn().mockRejectedValue(new Error("Failed to fetch"))
    });
    renderAvec(venues, <VisitsSection venueId="v1" />);
    await apresChargement(venues.listVisitBookings as never);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(erreursDeRendu(), erreursDeRendu().join("\n")).toEqual([]);
  });
});

describe("A3 — BlocksSection face à une réponse inattendue (D120)", () => {
  for (const forme of FORMES_INATTENDUES) {
    it(`survit à : ${forme.nom}`, async () => {
      const venues = makeVenueClientDouble(null, {
        listAvailabilityBlocks: vi.fn().mockResolvedValue(forme.valeur)
      });
      renderAvec(venues, <BlocksSection venueId="v1" />);
      await apresChargement(venues.listAvailabilityBlocks as never);
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      expect(erreursDeRendu(), erreursDeRendu().join("\n")).toEqual([]);
    });
  }
});

describe("A3 — ISOLATION : une section qui tombe n'emporte pas ses voisines (D120)", () => {
  it("VisitsSection reçoit une forme aberrante ; demandes et prestations restent affichées", async () => {
    // ⚠ LA CONFIGURATION RÉELLE de `venue-calendar-page`. C'est ce test-là qui
    // dit si le défaut coûte une section ou une page.
    const venues = makeVenueClientDouble(null, {
      listVisitBookings: vi.fn().mockResolvedValue("<!doctype html>")
    });
    const bookings = makeBookingsProDouble({
      listForVenue: vi.fn().mockResolvedValue([])
    });
    const services = makeServicesDouble({
      listForVenue: vi.fn().mockResolvedValue([])
    });

    render(
      <MemoryRouter>
        <AppProviders client={makeAuthDouble()} venues={venues} bookingsPro={bookings} servicesClient={services}>
          <BookingRequestsSection venueId="v1" />
          <VisitsSection venueId="v1" />
          <ServicesSection venueId="v1" />
        </AppProviders>
      </MemoryRouter>
    );

    // Les DEUX voisines sont toujours là. Sans `ErrorBoundary`, une exception
    // levée pendant le rendu de la section du milieu démonte tout l'arbre :
    // ce compte-ci passerait de 3 à 0.
    await apresChargement(venues.listVisitBookings as never);

    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(3);
    expect(erreursDeRendu(), erreursDeRendu().join("\n")).toEqual([]);
  });
});

describe("A3 — ce que la garde de forme NE PEUT PAS couvrir, la frontière l'attrape (D120)", () => {
  it("lignes amputées : la section bascule sur son repli, la page tient", async () => {
    const venues = makeVenueClientDouble(null, {
      listAvailabilityBlocks: vi.fn().mockResolvedValue(LIGNES_AMPUTEES)
    });

    render(
      <MemoryRouter>
        <AppProviders client={makeAuthDouble()} venues={venues}>
          <GuardedSection title="Blocages">
            <BlocksSection venueId="v1" />
          </GuardedSection>
        </AppProviders>
      </MemoryRouter>
    );

    await apresChargement(venues.listAvailabilityBlocks as never);

    // Le repli est là, nommé : l'utilisateur sait LAQUELLE des sections a lâché.
    await waitFor(() => {
      expect(document.querySelector('[data-section-failed="true"]')).not.toBeNull();
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("une section qui explose ne démonte pas ses voisines (frontière par section)", async () => {
    // ⚠ SANS frontière par section, ce test est le contraire d'un détail :
    // c'est la différence entre perdre une liste de blocages et perdre l'écran
    // salle entier — devis compris.
    const venues = makeVenueClientDouble(null, {
      listAvailabilityBlocks: vi.fn().mockResolvedValue(LIGNES_AMPUTEES),
      listVisitBookings: vi.fn().mockResolvedValue([])
    });

    render(
      <MemoryRouter>
        <AppProviders client={makeAuthDouble()} venues={venues}>
          <GuardedSection title="Blocages">
            <BlocksSection venueId="v1" />
          </GuardedSection>
          <GuardedSection title="Rendez-vous de visite">
            <VisitsSection venueId="v1" />
          </GuardedSection>
        </AppProviders>
      </MemoryRouter>
    );

    await apresChargement(venues.listAvailabilityBlocks as never);

    await waitFor(() => {
      expect(document.querySelector('[data-section-failed="true"]')).not.toBeNull();
    });
    // La voisine est INTACTE : son propre titre est rendu par elle, pas par un repli.
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('[data-section-failed="true"]').length).toBe(1);
  });
});
