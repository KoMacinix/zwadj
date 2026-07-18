// Test composant du formulaire de connexion (FR) : validation Zod partagée
// affichée en clair, soumission avec email normalisé, erreur API traduite via
// la clé partagée. La navigation next-intl est doublée (pas de routeur Next
// en jsdom) ; le client API est injecté dans l'AuthProvider.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import { vi } from "vitest";
import { ApiError, type AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { LoginForm } from "./login-form";

const pushMock = vi.fn();
vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/auth/connexion",
  redirect: vi.fn()
}));

function makeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(null),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    getAccessToken: () => null,
    ...overrides
  };
}

const USER = {
  id: "u1",
  email: "aya@example.dz",
  role: "CLIENT" as const,
  locale: "fr" as const,
  emailVerified: false,
  firstName: "Aya",
  lastName: null,
  proProfile: null
};

function renderLogin(client: AuthClient) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages.fr}>
      <AuthProvider client={client}>
        <LoginForm />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("LoginForm (fr)", () => {
  beforeEach(() => pushMock.mockClear());

  it("soumission vide : erreurs de validation partagées, AUCUN appel API", async () => {
    const client = makeClient();
    renderLogin(client);

    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Adresse email invalide.")).toBeInTheDocument();
    expect(screen.getByText("Le mot de passe est requis.")).toBeInTheDocument();
    expect(client.login).not.toHaveBeenCalled();
  });

  it("soumission valide : login appelé avec l'email NORMALISÉ (lowercase du schéma), puis redirection accueil", async () => {
    const client = makeClient({ login: vi.fn().mockResolvedValue({ accessToken: "jwt", user: USER }) });
    renderLogin(client);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "  AYA@Example.DZ " } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() =>
      expect(client.login).toHaveBeenCalledWith({
        email: "aya@example.dz",
        password: "Motdepasse1",
        rememberMe: true // case cochée par défaut ⇒ cookie persistant (D27)
      })
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("« Se souvenir de moi » décoché : login part avec rememberMe: false (cookie de session, D27)", async () => {
    const client = makeClient({ login: vi.fn().mockResolvedValue({ accessToken: "jwt", user: USER }) });
    renderLogin(client);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "aya@example.dz" } });
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByLabelText("Se souvenir de moi"));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() =>
      expect(client.login).toHaveBeenCalledWith({
        email: "aya@example.dz",
        password: "Motdepasse1",
        rememberMe: false
      })
    );
  });

  it("401 INVALID_CREDENTIALS : le message traduit de la clé PARTAGÉE s'affiche", async () => {
    const client = makeClient({
      login: vi.fn().mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "auth.errors.invalidCredentials"))
    });
    renderLogin(client);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "aya@example.dz" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Mauvaismdp9" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Email ou mot de passe incorrect.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
