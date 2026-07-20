// Tests du bouton Google (Lot 9). Le module `gis` est SUBSTITUÉ (Google est
// injoignable en bac à sable — limite connue du cadrage Lot 8) : on capture le
// callback passé à initialize() et on le déclenche à la main, exactement ce
// que ferait le vrai bouton GIS après le consentement de l'utilisateur.
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GisCredentialResponse, GisIdApi } from "../../lib/auth/gis";
import { ApiError, type AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { GoogleSignIn } from "./google-signin";

const pushMock = vi.fn();
// Objet routeur STABLE (comme le vrai App Router) — un mock qui renverrait un
// objet neuf par rendu ne reproduirait pas le contrat de stabilité de Next.
const routerMock = { push: pushMock };
vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => routerMock,
  usePathname: () => "/auth/connexion",
  redirect: vi.fn()
}));

// Doublure du chargeur GIS : initialize/renderButton espionnés, callback capturé.
const initializeMock = vi.fn<(config: { client_id: string; callback: (r: GisCredentialResponse) => void }) => void>();
const renderButtonMock = vi.fn<(parent: HTMLElement, options: Record<string, unknown>) => void>();
const loadGisMock = vi.fn<() => Promise<GisIdApi>>();
vi.mock("../../lib/auth/gis", () => ({
  loadGis: (...args: []) => loadGisMock(...args)
}));

function gisResolved(): void {
  loadGisMock.mockResolvedValue({ initialize: initializeMock, renderButton: renderButtonMock } as unknown as GisIdApi);
}

/** Callback GIS capturé au dernier initialize() — la « pression » du bouton. */
function capturedCallback(): (r: GisCredentialResponse) => void {
  const config = initializeMock.mock.calls.at(-1)?.[0];
  if (!config) throw new Error("initialize() n'a pas été appelé");
  return config.callback;
}

const USER = {
  id: "u1",
  email: "aya@example.dz",
  role: "CLIENT" as const,
  locale: "fr" as const,
  emailVerified: true,
  firstName: "Aya",
  lastName: "Boudiaf",
  proProfile: null
};

function makeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
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
    getAccessToken: () => null,
    ...overrides
  };
}

function renderGoogle(client: AuthClient, locale: "fr" | "ar" = "fr") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <AuthProvider client={client}>
        <GoogleSignIn />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("GoogleSignIn (Lot 9)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    gisResolved();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("SANS NEXT_PUBLIC_GOOGLE_CLIENT_ID : ne rend RIEN et ne charge PAS le script Google (feature OFF)", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    const { container } = renderGoogle(makeClient());

    expect(container).toBeEmptyDOMElement();
    expect(loadGisMock).not.toHaveBeenCalled();
  });

  it("avec client ID : initialize(client_id) + renderButton OFFICIEL (D29) dans l'emplacement, locale transmise", async () => {
    renderGoogle(makeClient());

    expect(screen.getByText("ou")).toBeInTheDocument(); // séparateur FR
    await waitFor(() => expect(renderButtonMock).toHaveBeenCalledTimes(1));
    expect(initializeMock).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "test-client-id.apps.googleusercontent.com" })
    );
    const [parent, options] = renderButtonMock.mock.calls[0]!;
    expect(parent).toBe(screen.getByTestId("google-button-slot"));
    expect(options).toMatchObject({ text: "continue_with", locale: "fr" });
  });

  it("en /ar : séparateur « أو » et locale ar passée au bouton GIS (RTL géré par Google)", async () => {
    renderGoogle(makeClient(), "ar");

    expect(screen.getByText("أو")).toBeInTheDocument();
    await waitFor(() => expect(renderButtonMock).toHaveBeenCalled());
    expect(renderButtonMock.mock.calls[0]![1]).toMatchObject({ locale: "ar" });
  });

  it("credential reçu : googleAuth({ idToken, locale COURANTE }) puis redirection accueil (session ouverte)", async () => {
    const client = makeClient({ googleAuth: vi.fn().mockResolvedValue({ accessToken: "jwt-g", user: USER }) });
    renderGoogle(client, "ar");
    await waitFor(() => expect(initializeMock).toHaveBeenCalled());

    capturedCallback()({ credential: "gis-id-token" });

    // Arbitrage Lot 8 : la locale du front voyage dans le body — jamais le
    // défaut `fr` quand l'utilisateur est sur /ar.
    await waitFor(() => expect(client.googleAuth).toHaveBeenCalledWith({ idToken: "gis-id-token", locale: "ar" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("403 GOOGLE_ACCOUNT_NOT_CLIENT : erreur DÉDIÉE « compte Professionnel » avec lien vers l'espace Pro", async () => {
    const client = makeClient({
      googleAuth: vi
        .fn()
        .mockRejectedValue(new ApiError(403, "GOOGLE_ACCOUNT_NOT_CLIENT", "auth.errors.googleAccountNotClient"))
    });
    renderGoogle(client);
    await waitFor(() => expect(initializeMock).toHaveBeenCalled());

    capturedCallback()({ credential: "gis-id-token" });

    expect(
      await screen.findByText(/Cet email est associé à un compte Professionnel/)
    ).toBeInTheDocument();
    const proLink = screen.getByRole("link", { name: "Ouvrir l'espace Pro" });
    expect(proLink).toHaveAttribute("href", "http://localhost:5173/auth/connexion");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("503 GOOGLE_AUTH_DISABLED (front configuré, API non) : message localisé de la clé PARTAGÉE", async () => {
    const client = makeClient({
      googleAuth: vi.fn().mockRejectedValue(new ApiError(503, "GOOGLE_AUTH_DISABLED", "auth.errors.googleAuthDisabled"))
    });
    renderGoogle(client);
    await waitFor(() => expect(initializeMock).toHaveBeenCalled());

    capturedCallback()({ credential: "gis-id-token" });

    expect(
      await screen.findByText("La connexion avec Google est momentanément indisponible. Utilisez votre email et votre mot de passe.")
    ).toBeInTheDocument();
  });

  it("script GIS injoignable : dégradation SILENCIEUSE — séparateur présent, aucune erreur affichée", async () => {
    loadGisMock.mockRejectedValue(new Error("blocked"));
    renderGoogle(makeClient());

    // Le bloc reste (séparateur + emplacement vide), le formulaire classique
    // au-dessus demeure le chemin nominal — aucune alerte pour une option absente.
    expect(screen.getByText("ou")).toBeInTheDocument();
    await waitFor(() => expect(loadGisMock).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(renderButtonMock).not.toHaveBeenCalled();
  });
});
