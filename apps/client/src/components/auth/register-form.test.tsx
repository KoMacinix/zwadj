// Formulaire d'inscription CLIENT — rang 32 (D325) : le téléphone (facultatif) est le champ PARTAGÉ.
//
// Ce formulaire n'avait AUCUN test. La garde de l'intégration du champ partagé doit exister DANS ce consommateur : un rouge d'un seul côté,
// sous neutralisation de `@zwadj/ui`, dirait que l'autre ne mesure rien.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import { messages } from "@zwadj/i18n";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { RegisterForm } from "./register-form";

const pushMock = vi.fn();
vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/auth/inscription",
  redirect: vi.fn()
}));

const PAYS = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];
const FR_PHONE = messages.fr.common.phone;
const USER = {
  id: "u1",
  email: "aya@example.dz",
  role: "CLIENT" as const,
  locale: "fr" as const,
  emailVerified: false,
  firstName: "Aya",
  lastName: "Boudiaf",
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: null
};

function makeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(null),
    authedRequest: vi.fn(),
    login: vi.fn(),
    googleAuth: vi.fn(),
    register: vi.fn().mockResolvedValue({ accessToken: "jwt", user: USER }),
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

/** ⚠ Le bootstrap de l'`AuthProvider` est encore en vol quand `render` rend la main : on le laisse retomber DANS `act`, sinon son `setState`
 *  tombe hors du test et le plafond de console rougit — un test qui finit avant sa propre mise à jour. */
async function renderRegister(client: AuthClient) {
  await act(async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages.fr}>
        <AuthProvider client={client}>
          <RegisterForm />
        </AuthProvider>
      </NextIntlClientProvider>
    );
  });
}

function remplirSansTelephone() {
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Aya" } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Boudiaf" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "aya@example.dz" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Motdepasse1" } });
  fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "Motdepasse1" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("RegisterForm — le téléphone est le champ partagé (rang 32)", () => {
  beforeEach(() => pushMock.mockClear());

  it("l'indicatif et le drapeau sont devant, le gabarit d'exemple n'est pas un numéro", async () => {
    await renderRegister(makeClient());
    const champ = screen.getByLabelText("Téléphone") as HTMLInputElement;
    expect(screen.getByRole("img", { name: `${FR_PHONE.country[DEFAULT_PHONE_COUNTRY]}, ${PAYS.dialCode}` })).toBeInTheDocument();
    expect(champ.placeholder).toBe(FR_PHONE.placeholder[DEFAULT_PHONE_COUNTRY]);
    expect(champ.placeholder.replace(/\D/g, "").length).toBeLessThan(PAYS.nationalLength);
  });

  it("⚠ facultatif : laissé VIDE, la clé est ABSENTE du corps — jamais une chaîne vide", async () => {
    const client = makeClient();
    await renderRegister(client);
    remplirSansTelephone();
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    await waitFor(() => expect(client.register).toHaveBeenCalled());
    const corps = (client.register as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect("phone" in corps && corps.phone !== undefined).toBe(false);
  });

  it("⚠ LE FORMAT ENVOYÉ N'A PAS CHANGÉ : un numéro collé à la locale part au format canonique", async () => {
    const client = makeClient();
    await renderRegister(client);
    remplirSansTelephone();
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "0551 22 33 44" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    await waitFor(() => expect(client.register).toHaveBeenCalledWith(expect.objectContaining({ phone: `${PAYS.dialCode}551223344` })));
  });

  it("⚠ un fixe ne se tape pas : le premier chiffre refusé reste seul, avec son message", async () => {
    await renderRegister(makeClient());
    const champ = screen.getByLabelText("Téléphone") as HTMLInputElement;
    for (const caractere of "0212") fireEvent.change(champ, { target: { value: champ.value + caractere } });
    expect(champ.value).toBe("0");
    expect(screen.getByRole("alert")).toHaveTextContent(FR_PHONE.leadingDigit[DEFAULT_PHONE_COUNTRY]);
  });

  it("un numéro INCOMPLET est refusé par le schéma partagé : aucun appel", async () => {
    const client = makeClient();
    await renderRegister(client);
    remplirSansTelephone();
    const champ = screen.getByLabelText("Téléphone") as HTMLInputElement;
    for (const caractere of PAYS.leadingDigits.charAt(0) + "12") fireEvent.change(champ, { target: { value: champ.value + caractere } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText(messages.fr.auth.validation.phoneInvalid)).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });
});
