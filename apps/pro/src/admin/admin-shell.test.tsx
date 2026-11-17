// ADM-2 (D350, rang 52, R-5) — la coquille de l'administration : le titre, la navigation entre les deux écrans, la déconnexion. Mesurée sous la table de routes RÉELLE (`AppRoutes`), avec un ADMIN.
//
// Ce qui se mesure : la navigation est un `<nav>` NOMMÉ ; l'écran courant porte `aria-current="page"` (et lui seul) ; chaque entrée mène à SON adresse (les constantes de `routes.ts`, jamais
// recopiées) ; la déconnexion appelle `logout` ; le contenu est dans un `<main>` ; la langue de l'écran est le FRANÇAIS (D-2), quelle que soit la langue choisie par ailleurs dans l'application.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthUserDTO } from "@zwadj/types";
import { AppProviders, AppRoutes } from "../App";
import { initI18n } from "../i18n";
import { ADMIN_PATH, ADMIN_DELETIONS_PATH } from "../routes";
import { ADMIN_TEXTS } from "./admin-texts";
import { makeAdminServerDouble } from "../test-support/admin-doubles";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";

initI18n();
afterEach(cleanup);

const ADMIN: AuthUserDTO = {
  id: "u-admin",
  email: "admin@exemple.dz",
  role: "ADMIN",
  locale: "fr",
  emailVerified: true,
  firstName: null,
  lastName: null,
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: null
};

function Chemin() {
  return <output data-testid="chemin">{useLocation().pathname}</output>;
}

function renderAt(path: string, over: Parameters<typeof makeAuthDouble>[0] = {}) {
  const client = makeAuthDouble({ bootstrap: vi.fn().mockResolvedValue(ADMIN), ...over });
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders client={client} adminClient={makeAdminServerDouble().client} venues={makeVenueClientDouble(null)} referentials={makeReferentialsDouble()}>
        <Chemin />
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>
  );
  return client;
}

describe("la coquille `/admin`", () => {
  it("le titre de l'administration, un `<nav>` nommé, le contenu dans un `<main>`", async () => {
    renderAt(ADMIN_PATH);
    expect(await screen.findByText(ADMIN_TEXTS.shell.brand)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: ADMIN_TEXTS.shell.navLabel });
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
    expect(within(screen.getByRole("main")).getByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title })).toBeInTheDocument();
  });

  it("l'écran courant porte `aria-current=\"page\"`, et lui seul ; chaque entrée mène à SON adresse", async () => {
    renderAt(ADMIN_PATH);
    const nav = await screen.findByRole("navigation", { name: ADMIN_TEXTS.shell.navLabel });
    const salles = within(nav).getByRole("link", { name: ADMIN_TEXTS.shell.venues });
    const suppressions = within(nav).getByRole("link", { name: ADMIN_TEXTS.shell.deletions });
    expect(salles).toHaveAttribute("href", ADMIN_PATH);
    expect(suppressions).toHaveAttribute("href", ADMIN_DELETIONS_PATH);
    expect(salles).toHaveAttribute("aria-current", "page");
    expect(suppressions).not.toHaveAttribute("aria-current");

    fireEvent.click(suppressions);
    expect(await screen.findByRole("heading", { level: 1, name: ADMIN_TEXTS.deletions.title })).toBeInTheDocument();
    expect(screen.getByTestId("chemin").textContent).toBe(ADMIN_DELETIONS_PATH);
    expect(within(nav).getByRole("link", { name: ADMIN_TEXTS.shell.deletions })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: ADMIN_TEXTS.shell.venues })).not.toHaveAttribute("aria-current");
  });

  it("« Se déconnecter » appelle `logout`", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderAt(ADMIN_PATH, { logout });
    fireEvent.click(await screen.findByRole("button", { name: ADMIN_TEXTS.shell.logout }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("D-2 — les écrans de l'administration sont en FRANÇAIS, ltr, quelle que soit la langue du Pro (`lang=\"fr\"` posé sur la coquille)", async () => {
    renderAt(ADMIN_PATH);
    // Le titre d'abord : pendant le démarrage de la session, le loader de marque rend lui aussi un `<main>` (sans `lang`) — la mesure aurait porté sur lui.
    await screen.findByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title });
    const main = screen.getByRole("main");
    const racine = main.closest("[lang]");
    expect(racine).not.toBeNull();
    expect(racine?.getAttribute("lang")).toBe("fr");
    expect(racine?.getAttribute("dir")).toBe("ltr");
  });
});
