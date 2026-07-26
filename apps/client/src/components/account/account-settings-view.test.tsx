// Tests de la vue compte CLIENT (Lot A11b). On ne re-teste pas ici ce qu'A11a
// couvre déjà (AccountMenu, initialsOf, les trois états de suppression) : ce
// qui est propre au Client, et testé, c'est
//  - le profil porté par `User` et NON par un ProProfile ;
//  - la garde de session, première page protégée du site client ;
//  - le cas Google-only, qui est ICI l'état par défaut d'une part réelle des
//    comptes (tout compte créé via « Continuer avec Google »).
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { AccountClient } from "@zwadj/api-client";
import type { AuthUserDTO } from "@zwadj/types";
import { AuthProvider } from "../../lib/auth/auth-context";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AccountSettingsView } from "./account-settings-view";

const USER: AuthUserDTO = {
  id: "u1",
  email: "aya@example.dz",
  role: "CLIENT",
  locale: "fr",
  emailVerified: true,
  firstName: "Aya",
  lastName: "Boudiaf",
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: null
};

function makeAuth(user: AuthUserDTO | null): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(user),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    me: vi.fn().mockResolvedValue(user),
    authedRequest: vi.fn().mockResolvedValue(user),
    getAccessToken: () => "token"
  } as unknown as AuthClient;
}

function makeClient(overrides: Partial<AccountClient> = {}): AccountClient {
  return {
    updateProfile: vi.fn().mockResolvedValue(USER),
    changeEmail: vi.fn().mockResolvedValue({ status: "pending_verification", pendingEmail: "neuf@example.dz" }),
    changePassword: vi.fn().mockResolvedValue(undefined),
    getDeletionRequest: vi.fn().mockResolvedValue(null),
    requestDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
    reloadUser: vi.fn().mockResolvedValue(USER),
    ...overrides
  };
}

function renderView(client: AccountClient, user: AuthUserDTO | null = USER) {
  const auth = makeAuth(user);
  return {
    auth,
    ...render(
      <NextIntlClientProvider locale="fr" messages={messages.fr}>
        <AuthProvider client={auth}>
          <AccountSettingsView client={client} />
        </AuthProvider>
      </NextIntlClientProvider>
    )
  };
}

describe("garde de session — première page protégée du site client", () => {
  it("anonyme : pas de formulaire, un lien de connexion", async () => {
    renderView(makeClient(), null);
    expect(await screen.findByText(/Connectez-vous pour accéder/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Prénom")).not.toBeInTheDocument();
  });
});

describe("profil CLIENT — porté par User, pas par un ProProfile", () => {
  it("affiche prénom/nom/téléphone, et AUCUN champ d'établissement", async () => {
    renderView(makeClient());
    expect(await screen.findByLabelText("Prénom")).toHaveValue("Aya");
    expect(screen.getByLabelText("Nom")).toHaveValue("Boudiaf");
    expect(screen.getByLabelText("Téléphone (facultatif)")).toBeInTheDocument();
    // Ces deux-là sont réservés au pro : les voir ici signifierait qu'on a
    // recopié l'écran Pro sans le retailler.
    expect(screen.queryByLabelText("Nom de l'établissement")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Second téléphone (facultatif)")).not.toBeInTheDocument();
  });

  it("téléphone vidé ⇒ null EXPLICITE (il est facultatif à l'inscription client)", async () => {
    const client = makeClient();
    renderView(client, { ...USER, phone: "+213770000001" });

    fireEvent.change(await screen.findByLabelText("Téléphone (facultatif)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(client.updateProfile).toHaveBeenCalledWith({ firstName: "Aya", lastName: "Boudiaf", phone: null })
    );
  });
});

describe("mot de passe — le compte Google-only est ici le cas COURANT (D42)", () => {
  it("hasPassword=false : « Définir », deux champs, aucun « Mot de passe actuel »", async () => {
    renderView(makeClient(), { ...USER, hasPassword: false, hasGoogle: true });
    expect(await screen.findByRole("heading", { name: "Définir un mot de passe" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Mot de passe actuel")).not.toBeInTheDocument();
  });

  it("mode « définir » : currentPassword absent du corps, session rechargée via /me", async () => {
    const client = makeClient();
    const { auth } = renderView(client, { ...USER, hasPassword: false, hasGoogle: true });

    fireEvent.change(await screen.findByLabelText("Nouveau mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("button", { name: "Définir le mot de passe" }));

    await waitFor(() => expect(client.changePassword).toHaveBeenCalledWith({ newPassword: "Motdepasse1" }));
    // `refreshUser()` du contexte client passe par `api.me()`.
    await waitFor(() => expect(auth.me).toHaveBeenCalled());
    expect(await screen.findByText(/soit avec Google, soit avec votre email/)).toBeInTheDocument();
  });
});

describe("suppression — pas de promesse d'archivage côté client", () => {
  it("les conséquences sont affichées, mais RIEN sur des salles conservées", async () => {
    renderView(makeClient());
    expect(await screen.findByRole("button", { name: "Demander la suppression" })).toBeInTheDocument();
    // Un client n'a pas de salle : lui promettre qu'elles sont conservées
    // serait incompréhensible.
    expect(screen.queryByText(/conservées en archive/)).not.toBeInTheDocument();
  });
});
