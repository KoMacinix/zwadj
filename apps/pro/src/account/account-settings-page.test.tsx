// Tests du menu de compte et de la page de configuration (Lot A11a).
// Ce qui est couvert, et pourquoi :
//  - l'accessibilité EXIGÉE par le cadrage : aria-expanded, Escape,
//    clic-extérieur, restitution du focus au déclencheur ;
//  - `initialsOf` sur les cas qui cassent une implémentation naïve (arabe,
//    tiret, hors BMP, nom absent) ;
//  - D42 : les DEUX modes de l'écran mot de passe, dont l'ABSENCE du champ
//    « ancien mot de passe » quand il n'existe pas ;
//  - les TROIS états de l'écran de suppression, et la formulation verrouillée
//    (« validée par Zwadj », jamais « compte supprimé »).
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { AccountClient } from "@zwadj/api-client";
import { messages } from "@zwadj/i18n";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, type AuthUserDTO, type DeletionRequestDTO } from "@zwadj/types";
import { AccountMenu, initialsOf } from "@zwadj/ui";
import { AppProviders } from "../App";
import type { AuthClient } from "../lib/auth-client";
import { initI18n } from "../i18n";
import { RequireProSession } from "../auth/require-pro";
import { AccountSettingsPage } from "./account-settings-page";

beforeAll(() => {
  initI18n();
});

describe("initialsOf", () => {
  it.each([
    ["Salle El Ryad", "aya@example.dz", "SE"],
    ["El-Ferdous", "x@y.dz", "EF"], // découpage sur le tiret aussi
    ["Zwadj", "x@y.dz", "Z"],
    // Arabe : unicase — `toLocaleUpperCase()` ne doit rien altérer.
    ["قاعة الفردوس", "x@y.dz", "قا"],
    [null, "aya@example.dz", "A"], // repli sur l'e-mail
    ["", "aya@example.dz", "A"],
    [null, "", "?"]
  ])("initialsOf(%s, %s) → %s", (name, email, expected) => {
    expect(initialsOf(name as string | null, email)).toBe(expected);
  });

  it("ne coupe PAS un caractère hors BMP en deux (indexation par point de code)", () => {
    // `"🎉"[0]` renverrait un demi-surrogate, affiché en losange.
    expect(initialsOf("🎉 Fête", "x@y.dz")).toBe("🎉F");
  });
});

describe("AccountMenu — accessibilité", () => {
  function renderMenu(onSelect = vi.fn()) {
    const utils = render(
      <AccountMenu
        displayName="Salle El Ryad"
        email="pro@example.dz"
        triggerLabel="Mon compte"
        items={[{ key: "settings", label: "Configuration du compte", onSelect }]}
      />
    );
    return { ...utils, onSelect, trigger: screen.getByRole("button", { name: "Mon compte" }) };
  }

  it("fermé par défaut : aria-expanded=false et aucun menu dans l'arbre", () => {
    const { trigger } = renderMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("ouvre, expose role=menu, et donne le focus à la première entrée", async () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // PAS de aria-modal : un menu n'est pas modal, l'annoncer ainsi mentirait.
    expect(screen.getByRole("menu")).not.toHaveAttribute("aria-modal");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Configuration du compte" })).toHaveFocus());
  });

  it("Escape ferme ET rend le focus au déclencheur", async () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus(); // restitution exigée par le cadrage
  });

  it("le focus qui QUITTE le menu le ferme (clic-extérieur)", async () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    // `relatedTarget` hors du conteneur = le focus s'en va vraiment.
    fireEvent.blur(screen.getByRole("menu"), { relatedTarget: document.body });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("sélectionner une entrée ferme le menu PUIS déclenche l'action", async () => {
    const { trigger, onSelect } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Configuration du compte" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});

// ── Page de configuration ────────────────────────────────────────────────────

const PRO_USER: AuthUserDTO = {
  id: "u1",
  email: "pro@example.dz",
  role: "PRO",
  locale: "fr",
  emailVerified: true,
  firstName: null,
  lastName: null,
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: false }
};

function makeClient(overrides: Partial<AccountClient> = {}): AccountClient {
  return {
    updateProfile: vi.fn().mockResolvedValue(PRO_USER),
    changeEmail: vi.fn().mockResolvedValue({ status: "pending_verification", pendingEmail: "neuf@example.dz" }),
    changePassword: vi.fn().mockResolvedValue(undefined),
    getDeletionRequest: vi.fn().mockResolvedValue(null),
    requestDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
    reloadUser: vi.fn().mockResolvedValue(PRO_USER),
    ...overrides
  };
}

/**
 * Rend la page sous le VRAI `AuthProvider`, avec un `AuthClient` mocké dont
 * `bootstrap()` renvoie l'utilisateur voulu — c'est le patron des tests A5.
 *
 * Une première version de ce helper injectait un faux contexte via
 * `vi.doMock("../auth/auth-context")`. C'était INOPÉRANT : `doMock` n'agit
 * qu'avant l'import du module, et la page est importée statiquement en tête de
 * fichier. Passer par le vrai provider a en plus l'avantage de tester le
 * CÂBLAGE réel : `reloadUser` s'observe alors sur `authedRequest("/auth/me")`,
 * et `applyUser` sur ce qui est effectivement rendu.
 */
function makeAuth(user: AuthUserDTO): AuthClient & { authedRequest: ReturnType<typeof vi.fn> } {
  const authedRequest = vi.fn().mockResolvedValue(user);
  return {
    bootstrap: vi.fn().mockResolvedValue(user),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    authedRequest,
    getAccessToken: () => "token"
  } as unknown as AuthClient & { authedRequest: ReturnType<typeof vi.fn> };
}

function renderPage(client: AccountClient, user: AuthUserDTO = PRO_USER) {
  const auth = makeAuth(user);
  return {
    auth,
    ...render(
      <MemoryRouter initialEntries={["/compte"]}>
        <AppProviders client={auth}>
          {/* Monte la page comme en production : sous la garde, donc JAMAIS
              avant que la session soit hydratee. Le formulaire profil
              initialise son etat au montage (useState), il exige donc un
              `user` deja present. */}
          <RequireProSession>
            <AccountSettingsPage client={client} />
          </RequireProSession>
        </AppProviders>
      </MemoryRouter>
    )
  };
}

describe("écran mot de passe — D42, deux modes", () => {
  it("hasPassword=true : trois champs, dont « Mot de passe actuel »", async () => {
    renderPage(makeClient(), PRO_USER);
    expect(await screen.findByLabelText("Mot de passe actuel")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Modifier le mot de passe" })).toBeInTheDocument();
  });

  it("hasPassword=false : AUCUN champ « actuel » — le demander serait un cul-de-sac", async () => {
    renderPage(makeClient(), { ...PRO_USER, hasPassword: false, hasGoogle: true });
    expect(await screen.findByRole("heading", { name: "Définir un mot de passe" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Mot de passe actuel")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nouveau mot de passe")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmer le mot de passe")).toBeInTheDocument();
  });

  it("mode « définir » : currentPassword n'est PAS envoyé, et la session est rechargée", async () => {
    const client = makeClient();
    const { auth } = renderPage(client, { ...PRO_USER, hasPassword: false, hasGoogle: true });

    fireEvent.change(await screen.findByLabelText("Nouveau mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("button", { name: "Définir le mot de passe" }));

    await waitFor(() => expect(client.changePassword).toHaveBeenCalledWith({ newPassword: "Motdepasse1" }));
    // Sans ce rechargement, l'écran resterait en mode « définir ». Observé sur
    // le VRAI câblage : `reloadUser` relit /auth/me via `authedRequest`.
    await waitFor(() => expect(auth.authedRequest).toHaveBeenCalledWith("/auth/me"));
    // Le message doit annoncer que les DEUX voies fonctionnent.
    expect(await screen.findByText(/soit avec Google, soit avec votre email/)).toBeInTheDocument();
  });

  it("confirmation différente : erreur locale, AUCUN appel API", async () => {
    const client = makeClient();
    renderPage(client, PRO_USER);

    fireEvent.change(await screen.findByLabelText("Mot de passe actuel"), { target: { value: "Motdepasse1" } });
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "Autrechose1" } });
    fireEvent.click(screen.getByRole("button", { name: "Modifier le mot de passe" }));

    expect(await screen.findByText("Les deux mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(client.changePassword).not.toHaveBeenCalled();
  });
});

describe("écran suppression — trois états (D37/D41)", () => {
  const PENDING: DeletionRequestDTO = {
    id: "r1",
    status: "PENDING",
    reason: null,
    requestedAt: "2026-07-01T10:00:00.000Z",
    decidedAt: null,
    decisionNote: null
  };

  it("aucune demande : conséquences + promesse d'archivage AVANT le bouton", async () => {
    renderPage(makeClient());
    expect(await screen.findByRole("button", { name: "Demander la suppression" })).toBeInTheDocument();
    // Formulation verrouillée : on promet la récupération des SALLES.
    expect(screen.getByText(/conservées en archive/)).toBeInTheDocument();
    // …et JAMAIS celle du compte.
    expect(screen.queryByText(/récupérer votre compte/)).not.toBeInTheDocument();
  });

  it("demande en cours : « validée par Zwadj », jamais « compte supprimé », + bouton d'annulation", async () => {
    renderPage(makeClient({ getDeletionRequest: vi.fn().mockResolvedValue(PENDING) }));
    expect(await screen.findByText(/validée par Zwadj/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler ma demande" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Demander la suppression" })).not.toBeInTheDocument();
  });

  it("demande refusée : le motif de l'admin est affiché, et on peut re-demander", async () => {
    renderPage(
      makeClient({
        getDeletionRequest: vi
          .fn()
          .mockResolvedValue({ ...PENDING, status: "REJECTED", decisionNote: "Commissions en cours." })
      })
    );
    expect(await screen.findByText(/Commissions en cours\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demander la suppression" })).toBeInTheDocument();
  });

  it("échec de LECTURE : pas de formulaire de demande (sinon on taperait dans l'index unique)", async () => {
    renderPage(makeClient({ getDeletionRequest: vi.fn().mockRejectedValue(new Error("boom")) }));
    expect(await screen.findByText(/Impossible de vérifier l'état/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Demander la suppression" })).not.toBeInTheDocument();
  });
});

describe("écran e-mail", () => {
  it("après envoi : annonce que l'ANCIENNE adresse reste active", async () => {
    const client = makeClient();
    renderPage(client);

    fireEvent.change(await screen.findByLabelText("Nouvelle adresse email"), {
      target: { value: "neuf@example.dz" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien de confirmation" }));

    await waitFor(() => expect(client.changeEmail).toHaveBeenCalledWith({ newEmail: "neuf@example.dz" }));
    // L'invariant du flux, dit à l'écran.
    expect(await screen.findByText(/reste active jusqu'à ce que vous l'ouvriez/)).toBeInTheDocument();
  });
});

describe("écran profil", () => {
  it("second téléphone vidé ⇒ null EXPLICITE (effacement D38), pas une chaîne vide", async () => {
    const client = makeClient();
    renderPage(client, {
      ...PRO_USER,
      proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: "+213770000001", notifyByEmail: true, notifyBySms: false }
    });

    fireEvent.change(await screen.findByLabelText("Second téléphone (facultatif)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(client.updateProfile).toHaveBeenCalledWith({
        businessName: "Salle El Ryad",
        phone: "+213551234567",
        phone2: null, notifyByEmail: true, notifyBySms: false
      })
    );
  });
});

describe("Canaux de notification — D60", () => {
  const bothOn: AuthUserDTO = {
    ...PRO_USER,
    proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: true }
  };

  it("les deux cases reflètent l'état du compte", async () => {
    renderPage(makeClient(), bothOn);
    expect(await screen.findByLabelText("Par e-mail")).toBeChecked();
    expect(screen.getByLabelText("Par WhatsApp")).toBeChecked();
  });

  it("décocher LES DEUX annonce le refus AVANT d'envoyer", async () => {
    renderPage(makeClient());
    // Le SMS est déjà décoché sur PRO_USER : couper l'e-mail coupe tout.
    fireEvent.click(await screen.findByLabelText("Par e-mail"));
    expect(screen.getByText(/^Gardez au moins un canal/)).toBeInTheDocument();
  });

  it("garder UN seul canal reste permis", async () => {
    renderPage(makeClient(), bothOn);
    fireEvent.click(await screen.findByLabelText("Par e-mail"));
    expect(screen.queryByText(/^Gardez au moins un canal/)).toBeNull();
  });

  it("les canaux partent avec le profil, jamais dans un appel séparé", async () => {
    const client = makeClient();
    renderPage(client, bothOn);
    fireEvent.click(await screen.findByLabelText("Par WhatsApp"));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(client.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ notifyByEmail: true, notifyBySms: false })
      )
    );
  });
});

// ══ RANG 32 (D325) — les DEUX numéros du pro (D38) sont le champ partagé : mobile seulement, +213, 9 chiffres, premier chiffre 5, 6 ou 7 ═════════
// ⚠ AUCUNE RÈGLE RECOPIÉE : l'indicatif, la longueur et les premiers chiffres viennent du modèle de pays ; les messages, du catalogue.
describe("écran profil — les deux numéros du pro (D38) sont le champ de téléphone PARTAGÉ", () => {
  const PAYS = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];
  const FR_PHONE = messages.fr.common.phone;
  const mauvaisPremier = [..."0123456789"].find((c) => !PAYS.leadingDigits.includes(c)) as string;

  it("les numéros enregistrés s'affichent en chiffres NATIONAUX, l'indicatif et le drapeau devant — chaque champ a les siens", async () => {
    renderPage(makeClient(), {
      ...PRO_USER,
      proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: "+213770000001", notifyByEmail: true, notifyBySms: false }
    });
    const premier = (await screen.findByLabelText("Téléphone")) as HTMLInputElement;
    const second = screen.getByLabelText("Second téléphone (facultatif)") as HTMLInputElement;
    expect(premier.value).toBe("551234567");
    expect(second.value).toBe("770000001");
    expect(screen.getAllByRole("img", { name: `${FR_PHONE.country[DEFAULT_PHONE_COUNTRY]}, ${PAYS.dialCode}` })).toHaveLength(2);
  });

  it("⚠ des lettres, un dixième chiffre, un premier chiffre refusé : rien de tout cela n'entre dans l'un ni l'autre champ", async () => {
    renderPage(makeClient(), { ...PRO_USER, proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: false } });
    const second = (await screen.findByLabelText("Second téléphone (facultatif)")) as HTMLInputElement;
    for (const caractere of `${PAYS.leadingDigits.charAt(0)}ab12345678901`) fireEvent.change(second, { target: { value: second.value + caractere } });
    expect(second.value).toMatch(new RegExp(`^\\d{${PAYS.nationalLength}}$`));
    fireEvent.change(second, { target: { value: "" } });
    fireEvent.change(second, { target: { value: mauvaisPremier } });
    expect(second.value).toBe(mauvaisPremier);
    expect(screen.getByRole("alert")).toHaveTextContent(FR_PHONE.leadingDigit[DEFAULT_PHONE_COUNTRY]);
  });

  it("⚠ LE FORMAT ENVOYÉ N'A PAS CHANGÉ : l'indicatif puis les chiffres saisis, pour les deux numéros", async () => {
    const client = makeClient();
    renderPage(client);
    const second = (await screen.findByLabelText("Second téléphone (facultatif)")) as HTMLInputElement;
    fireEvent.change(second, { target: { value: "0770 00 00 01" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(client.updateProfile).toHaveBeenCalledWith({
        businessName: "Salle El Ryad",
        phone: `${PAYS.dialCode}551234567`,
        phone2: `${PAYS.dialCode}770000001`,
        notifyByEmail: true,
        notifyBySms: false
      })
    );
  });

  it("⚠ un numéro INCOMPLET est refusé AVANT l'envoi, par le schéma partagé : aucun appel", async () => {
    const client = makeClient();
    renderPage(client);
    const premier = (await screen.findByLabelText("Téléphone")) as HTMLInputElement;
    fireEvent.change(premier, { target: { value: "" } });
    for (const caractere of PAYS.leadingDigits.charAt(0) + "123") fireEvent.change(premier, { target: { value: premier.value + caractere } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText(messages.fr.auth.validation.phoneInvalid)).toBeInTheDocument();
    expect(client.updateProfile).not.toHaveBeenCalled();
  });
});
