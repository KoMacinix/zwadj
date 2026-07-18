// Tests de la tranche auth Pro (fr) : garde D24, refus de rôle D23, dashboard,
// 403 EMAIL_NOT_VERIFIED avec renvoi (D22), inscription → « vérifiez votre
// email » sans auto-login (D21). Client API injecté, MemoryRouter en jsdom.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import { ApiError, type AuthClient } from "./lib/auth-client";
import { initI18n } from "./i18n";
import { AppProviders, AppRoutes } from "./App";

initI18n();

function makeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(null),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn().mockResolvedValue({ status: "ok" }),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    getAccessToken: () => null,
    ...overrides
  };
}

const PRO_USER = {
  id: "u1",
  email: "contact@salle.dz",
  role: "PRO" as const,
  locale: "fr" as const,
  emailVerified: true,
  firstName: null,
  lastName: null,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567" }
};

function renderAt(path: string, client: AuthClient) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders client={client}>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>
  );
}

describe("Coquille protégée (D23/D24)", () => {
  it("anonyme sur / : redirigé vers la page de connexion", async () => {
    renderAt("/", makeClient());
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
  });

  it("session CLIENT sur / : refus explicite « espace réservé aux professionnels »", async () => {
    const client = makeClient({
      bootstrap: vi.fn().mockResolvedValue({ ...PRO_USER, role: "CLIENT", proProfile: null })
    });
    renderAt("/", client);
    expect(await screen.findByRole("heading", { name: "Espace réservé aux professionnels" })).toBeInTheDocument();
  });

  it("session PRO sur / : tableau de bord avec le nom de l'établissement", async () => {
    renderAt("/", makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) }));
    expect(await screen.findByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
    expect(screen.getByText("Salle El Ryad")).toBeInTheDocument();
  });
});

describe("Connexion PRO — D22 (403 EMAIL_NOT_VERIFIED)", () => {
  it("montre l'action de renvoi, qui déclenche resend-verification avec l'email saisi", async () => {
    const client = makeClient({
      login: vi.fn().mockRejectedValue(new ApiError(403, "EMAIL_NOT_VERIFIED", "auth.errors.emailNotVerified"))
    });
    renderAt("/auth/connexion", client);

    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "contact@salle.dz" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    const resendBtn = await screen.findByRole("button", { name: "Renvoyer l'email de vérification" });
    fireEvent.click(resendBtn);
    await waitFor(() => expect(client.resendVerification).toHaveBeenCalledWith("contact@salle.dz"));
    expect(await screen.findByText(/nouvel email vient d'être envoyé/)).toBeInTheDocument();
  });
});

describe("Inscription PRO — D21 (pas d'auto-login)", () => {
  it("succès : écran « vérifiez votre boîte mail » avec l'email, AUCUN login enchaîné", async () => {
    const client = makeClient({ register: vi.fn().mockResolvedValue({ id: "u2", email: "contact@salle.dz" }) });
    renderAt("/auth/inscription", client);

    fireEvent.change(await screen.findByLabelText("Nom de l'établissement"), { target: { value: "Salle El Ryad" } });
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213551234567" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "contact@salle.dz" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeInTheDocument();
    expect(screen.getByText(/contact@salle\.dz/)).toBeInTheDocument();
    expect(client.register).toHaveBeenCalledWith(
      expect.objectContaining({ role: "PRO", businessName: "Salle El Ryad", phone: "+213551234567", locale: "fr" })
    );
    expect(client.login).not.toHaveBeenCalled(); // D1 : pas de session PRO non vérifiée
  });

  it("téléphone hors format +213 : erreur de validation partagée, AUCUN appel API", async () => {
    const client = makeClient();
    renderAt("/auth/inscription", client);

    fireEvent.change(await screen.findByLabelText("Nom de l'établissement"), { target: { value: "Salle El Ryad" } });
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "0551223344" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "contact@salle.dz" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText(/\+213XXXXXXXXX/)).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });
});
