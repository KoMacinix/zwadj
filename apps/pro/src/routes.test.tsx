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
import { LOGIN_PATH } from "./routes";

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
