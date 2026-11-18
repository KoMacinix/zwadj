// ADM-2 (D350, rang 52, R-4, D-1) — la garde de rôle ADMIN, mesurée sous la table de routes RÉELLE (`AppRoutes`), pas sur un composant isolé : « D23 devient : l'app Pro accepte un PRO hors de
// `/admin`, et un ADMIN sous `/admin` seulement ».
//
//  · un ADMIN qui se connecte ARRIVE sous `/admin` ; un ADMIN hors de `/admin` y est RENVOYÉ (jamais la carte « mauvais rôle ») ;
//  · un PRO ou un CLIENT sous `/admin` voit un REFUS EXPLICITE (ni écran vide, ni 403 silencieux) et ne déclenche AUCUN appel à l'API admin ;
//  · un visiteur anonyme est renvoyé à la connexion ; un PRO hors de `/admin` n'est pas touché.
// L'API reste l'autorité (MD-ADM-1) : cette garde n'est qu'un confort. Les textes viennent de l'AUTORITÉ (`ADMIN_TEXTS`, `messages`), jamais recopiés (D209).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { AuthUserDTO } from "@zwadj/types";
import { ApiError, type AuthClient } from "../lib/auth-client";
import { initI18n } from "../i18n";
import { AppProviders, AppRoutes } from "../App";
import { ADMIN_PATH, ADMIN_DELETIONS_PATH, DASHBOARD_PATH, LOGIN_PATH, VENUES_PATH, adminVenuePath } from "../routes";
import { ADMIN_TEXTS } from "../admin/admin-texts";
import { aVenue, makeAdminServerDouble } from "../test-support/admin-doubles";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { elementAttendu, elementPresent } from "../test-support/native-presence";

initI18n();

const BASE: AuthUserDTO = {
  id: "u-1",
  email: "compte@exemple.dz",
  role: "PRO",
  locale: "fr",
  emailVerified: true,
  firstName: null,
  lastName: null,
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Événements Sidi", phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: false }
};
const ADMIN: AuthUserDTO = { ...BASE, id: "u-admin", role: "ADMIN", proProfile: null };
const CLIENT: AuthUserDTO = { ...BASE, id: "u-client", role: "CLIENT", proProfile: null };
const PRO: AuthUserDTO = BASE;

function auth(user: AuthUserDTO | null, over: Partial<AuthClient> = {}): AuthClient {
  return makeAuthDouble({ bootstrap: vi.fn().mockResolvedValue(user), ...over });
}

/** Montre le chemin courant : une redirection se lit dans l'URL, pas seulement dans ce qui s'affiche. */
function Chemin() {
  return <output data-testid="chemin">{useLocation().pathname}</output>;
}

function renderAt(path: string, client: AuthClient, server = makeAdminServerDouble()) {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders client={client} adminClient={server.client} venues={makeVenueClientDouble(null)} referentials={makeReferentialsDouble()}>
        <Chemin />
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>
  );
  return { ...view, server };
}
const chemin = () => screen.getByTestId("chemin").textContent;

describe("R-4 — un ADMIN : sous `/admin`, et nulle part ailleurs", () => {
  it("un ADMIN sur `/admin` voit l'écran de la file (la garde le laisse entrer)", async () => {
    renderAt(ADMIN_PATH, auth(ADMIN));
    await elementAttendu(() => screen.queryByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title }));
    expect(chemin()).toBe(ADMIN_PATH);
  });

  it("un ADMIN hors de `/admin` y est RENVOYÉ — tableau de bord, liste des salles : jamais la carte « mauvais rôle »", async () => {
    for (const hors of [DASHBOARD_PATH, VENUES_PATH]) {
      const { unmount } = renderAt(hors, auth(ADMIN));
      await elementAttendu(() => screen.queryByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title }), hors);
      expect(chemin(), hors).toBe(ADMIN_PATH);
      expect(screen.queryByRole("heading", { name: messages.fr.auth.ui.pro.wrongRoleTitle }), hors).toBeNull();
      unmount();
    }
  });

  it("un ADMIN sur la page de CONNEXION (déjà connecté) est renvoyé sous `/admin`, pas sur `/`", async () => {
    renderAt(LOGIN_PATH, auth(ADMIN));
    await elementAttendu(() => screen.queryByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title }));
    expect(chemin()).toBe(ADMIN_PATH);
  });

  it("un ADMIN qui SE CONNECTE arrive sous `/admin` — la destination suit le rôle", async () => {
    const client = auth(null, { login: vi.fn().mockResolvedValue({ user: ADMIN, accessToken: "jwt" }) });
    renderAt(LOGIN_PATH, client);

    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: ADMIN.email } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await elementAttendu(() => screen.queryByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title }));
    expect(client.login).toHaveBeenCalled();
    expect(chemin()).toBe(ADMIN_PATH);
  });
});

describe("R-4 — un PRO ou un CLIENT sous `/admin` : un REFUS explicite, et aucun appel à l'API admin", () => {
  const SOUS_ADMIN = [ADMIN_PATH, ADMIN_DELETIONS_PATH, adminVenuePath("00000000-0000-4000-8000-000000000001")];

  it("un PRO : la carte de refus (titre, explication, retour à son espace), sur CHAQUE adresse `/admin`, sans redirection silencieuse", async () => {
    for (const adresse of SOUS_ADMIN) {
      const { unmount, server } = renderAt(adresse, auth(PRO));
      await elementAttendu(() => screen.queryByRole("heading", { name: ADMIN_TEXTS.forbidden.title }), adresse);
      elementPresent(() => screen.queryByText(ADMIN_TEXTS.forbidden.body), adresse);
      const retour = elementPresent(() => screen.queryByRole("link", { name: ADMIN_TEXTS.forbidden.backToPro }), adresse);
      expect(retour.getAttribute("href"), adresse).toBe(DASHBOARD_PATH);
      expect(chemin(), `${adresse} : le refus est RENDU, l'adresse ne change pas`).toBe(adresse);
      // Le refus n'a lu aucune donnée de l'administration.
      expect(server.calls, adresse).toEqual([]);
      unmount();
    }
  });

  it("un CLIENT : le même refus, sans lien vers un espace qui n'est pas le sien ; il peut se déconnecter", async () => {
    const client = auth(CLIENT, { logout: vi.fn().mockResolvedValue(undefined) });
    const { server } = renderAt(ADMIN_PATH, client);
    await elementAttendu(() => screen.queryByRole("heading", { name: ADMIN_TEXTS.forbidden.title }));
    expect(screen.queryByRole("link", { name: ADMIN_TEXTS.forbidden.backToPro })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.forbidden.logout }));
    await waitFor(() => expect(client.logout).toHaveBeenCalled());
    expect(server.calls).toEqual([]);
  });

  it("le refus n'est PAS la file : aucun titre de l'administration n'est rendu à un PRO", async () => {
    renderAt(ADMIN_PATH, auth(PRO));
    await elementAttendu(() => screen.queryByRole("heading", { name: ADMIN_TEXTS.forbidden.title }));
    expect(screen.queryByRole("heading", { name: ADMIN_TEXTS.queue.title })).toBeNull();
  });
});

describe("R-4 — les autres cas", () => {
  it("anonyme sur `/admin` : renvoyé à la connexion", async () => {
    renderAt(ADMIN_PATH, auth(null));
    await elementAttendu(() => screen.queryByRole("heading", { name: "Connexion" }));
    expect(chemin()).toBe(LOGIN_PATH);
  });

  it("pendant le démarrage de la session, rien de l'administration n'est montré (ni la file ni le refus)", async () => {
    let finir!: (u: AuthUserDTO) => void;
    const bootstrap = vi.fn(() => new Promise<AuthUserDTO>((resolve) => (finir = resolve)));
    renderAt(ADMIN_PATH, auth(null, { bootstrap }));
    expect(screen.queryByRole("heading", { name: ADMIN_TEXTS.queue.title })).toBeNull();
    expect(screen.queryByRole("heading", { name: ADMIN_TEXTS.forbidden.title })).toBeNull();
    finir(ADMIN);
    await elementAttendu(() => screen.queryByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title }));
  });

  it("un PRO hors de `/admin` n'est pas touché : sa liste de salles s'affiche, à l'adresse demandée", async () => {
    renderAt(VENUES_PATH, auth(PRO));
    await elementAttendu(() => screen.queryByRole("heading", { name: "Aucune salle pour le moment" }));
    expect(chemin()).toBe(VENUES_PATH);
  });

  it("un CLIENT hors de `/admin` garde la carte « mauvais rôle » du Pro (D23, inchangée)", async () => {
    renderAt(DASHBOARD_PATH, auth(CLIENT));
    await elementAttendu(() => screen.queryByRole("heading", { name: messages.fr.auth.ui.pro.wrongRoleTitle }));
  });

  it("un refus d'API sur l'écran (ADMIN rétrogradé : 403) ne laisse pas un écran vide — l'API reste l'autorité", async () => {
    const server = makeAdminServerDouble({ venues: [aVenue()] });
    server.failNext("listPendingVenues", new ApiError(403, "FORBIDDEN", undefined));
    renderAt(ADMIN_PATH, auth(ADMIN), server);
    await elementAttendu(() => screen.queryByRole("alert"));
    expect(screen.queryByRole("heading", { name: ADMIN_TEXTS.forbidden.title })).toBeNull();
  });
});
