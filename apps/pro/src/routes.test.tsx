// Rang 29 (D321) — `LOGIN_PATH` du Pro désigne une page RÉELLE : la route qui rend `LoginPage`.
//
// ⚠ Le Pro n'a pas de routage par fichiers : « la page existe » veut dire « la table de routes rend la page de connexion
// À CETTE ADRESSE, sans la quitter ». Rendre la page ne suffit pas — un anonyme sur une adresse inconnue est redirigé
// vers `/` puis vers la connexion, et la page s'affiche QUAND MÊME. Le test exige donc que l'adresse reste celle qu'on a
// demandée (bras positif), et le bras négatif montre qu'une adresse sans route, elle, est quittée.
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { AuthClient } from "./lib/auth-client";
import { initI18n } from "./i18n";
import { AppProviders, AppRoutes } from "./App";
import type { VenueProDTO } from "@zwadj/types";
import * as ROUTES from "./routes";
import { LOGIN_PATH } from "./routes";
import {
  makeAuthDouble,
  makeBookingsProDouble,
  makeQuotesDouble,
  makeReferentialsDouble,
  makeServicesDouble,
  makeVenueClientDouble
} from "./test-support/client-doubles";

initI18n();

const ANONYME = {
  bootstrap: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  googleAuth: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  authedRequest: vi.fn(),
  getAccessToken: () => null
} satisfies AuthClient;

/** L'adresse où le routeur s'est ARRÊTÉ, lue dans le routeur lui-même. */
function Adresse() {
  return <p>{`adresse=${useLocation().pathname}`}</p>;
}

function rendreA(chemin: string) {
  render(
    <MemoryRouter initialEntries={[chemin]}>
      <AppProviders client={ANONYME}>
        <AppRoutes />
        <Adresse />
      </AppProviders>
    </MemoryRouter>
  );
}

describe("LOGIN_PATH du Pro — vérifiée contre sa page (rang 29, D321)", () => {
  it("à LOGIN_PATH, la page de connexion se rend, et l'adresse RESTE celle demandée", async () => {
    rendreA(LOGIN_PATH);
    // `waitFor` + assertion NATIVE : sous neutralisation, l'échec se lit comme une ASSERTION (D304, D316).
    await waitFor(() => expect(screen.queryByRole("heading", { level: 1 })?.textContent).toBe(messages.fr.auth.ui.login.title));
    expect(screen.getByText(/^adresse=/).textContent).toBe(`adresse=${LOGIN_PATH}`);
  });

  it("calibration, bras négatif : une adresse SANS route est quittée (l'ancienne cible `/connexion` du client)", async () => {
    rendreA("/connexion");
    await screen.findByRole("heading", { level: 1, name: messages.fr.auth.ui.login.title });
    expect(screen.getByText(/^adresse=/).textContent).not.toBe("adresse=/connexion");
  });
});

// ── FC-5 (session `front-client`) — CHAQUE constante de la table est une route DÉCLARÉE ─────────────────────────────────────
// La table de routes RÉELLE (`AppRoutes`) y rend une page, et l'adresse RESTE celle demandée — patron de D322 et du test de
// LOGIN_PATH ci-dessus : une adresse inconnue est quittée (bras négatif). Les constantes sont lues dans le MODULE, pas recopiées :
// une constante ajoutée demain est vérifiée sans toucher ce test. Les pages d'ENTRÉE (`/auth/…`) se jouent sans session — elles
// sont fermées à une session ouverte (D148) ; les autres, avec une session PRO et tous les doubles (patron de `calendar-link`).
const SALLE_EXEMPLE = {
  id: "v1",
  slug: "salle-v1",
  cityId: "11111111-1111-4111-8111-111111111111",
  nameFr: "Salle Une",
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
  matterportModelId: null
} as unknown as VenueProDTO;

function rendreConnecteA(chemin: string) {
  render(
    <MemoryRouter initialEntries={[chemin]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={makeVenueClientDouble(SALLE_EXEMPLE)}
        referentials={makeReferentialsDouble()}
        bookingsPro={makeBookingsProDouble()}
        servicesClient={makeServicesDouble()}
        quotesClient={makeQuotesDouble()}
      >
        <AppRoutes />
        <Adresse />
      </AppProviders>
    </MemoryRouter>
  );
}

/** Les adresses de la table qui sont des routes DU PRO : chaînes, hors pages du client liées depuis le pro (`CLIENT_…`), hors
 *  le motif paramétré (vérifié par `venuePath` ci-dessous), hors `/` (une adresse inconnue y est renvoyée : « rester sur `/` »
 *  ne distinguerait rien). */
const ADRESSES_DU_PRO = Object.entries(ROUTES).filter(
  (entree): entree is [string, string] =>
    typeof entree[1] === "string" && !entree[0].startsWith("CLIENT_") && entree[0] !== "VENUE_PATH_PATTERN" && entree[1] !== "/"
);

describe("FC-5 — chaque adresse de la table du Pro est une route DÉCLARÉE (patron de D322)", () => {
  it("la table porte plus que la connexion (D290 : un zéro sur zéro ne mesure rien)", () => {
    expect(ADRESSES_DU_PRO.length).toBeGreaterThan(8);
  });

  for (const [nom, adresse] of ADRESSES_DU_PRO) {
    it(`${nom} (« ${adresse} ») : la page s'y rend, et l'adresse RESTE celle demandée`, async () => {
      if (adresse.startsWith("/auth/")) rendreA(adresse);
      else rendreConnecteA(adresse);
      await waitFor(() => expect(screen.queryByRole("heading", { level: 1 })).not.toBeNull());
      expect(screen.getByText(/^adresse=/).textContent).toBe(`adresse=${adresse}`);
    });
  }

  it("venuePath(id) — l'assistant d'une salle : la page s'y rend, et l'adresse RESTE celle demandée", async () => {
    // Lue par son nom : absente (avant FC-5), le rouge se lit en ASSERTION (D304) et le fichier compile avant comme après.
    const venuePath = (ROUTES as Record<string, unknown>).venuePath;
    expect(typeof venuePath).toBe("function");
    const adresse = (venuePath as (id: string) => string)(SALLE_EXEMPLE.id);
    rendreConnecteA(adresse);
    await waitFor(() => expect(screen.queryByRole("heading", { level: 1 })).not.toBeNull());
    expect(screen.getByText(/^adresse=/).textContent).toBe(`adresse=${adresse}`);
  });

  it("calibration, bras négatif CONNECTÉ : une adresse sans route est quittée (renvoyée au tableau de bord)", async () => {
    rendreConnecteA("/salles/v1/calendrier");
    await waitFor(() => expect(screen.getByText(/^adresse=/).textContent).not.toBe("adresse=/salles/v1/calendrier"));
  });
});
