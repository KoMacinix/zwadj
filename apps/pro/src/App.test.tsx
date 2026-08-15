// Tests de la coquille Pro (fr) : garde D24, refus de rôle D23, accueil,
// 403 EMAIL_NOT_VERIFIED avec renvoi (D22), inscription → « vérifiez votre
// email » sans auto-login (D21). Client API injecté, MemoryRouter en jsdom.
//
// Lot A5 — deux mises à jour de CONTRAT (arbitrage 2) : l'interface AuthClient
// gagne `authedRequest`, et `/` ne rend plus le tableau de bord placeholder
// mais la liste des salles.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import type { ReferentialsClient, VenueProClient } from "@zwadj/api-client";
import { ApiError, type AuthClient } from "./lib/auth-client";
import { makeVenueClientDouble } from "./test-support/client-doubles";
import { initI18n } from "./i18n";
import { AppProviders, AppRoutes } from "./App";

initI18n();

function makeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(null),
    login: vi.fn(),
    googleAuth: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn().mockResolvedValue({ status: "ok" }),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    // Lot A5 : primitive authentifiée générique (le client venue est bâti
    // dessus — c'est ce qui lui fait partager le mutex de refresh).
    authedRequest: vi.fn(),
    getAccessToken: () => null,
    ...overrides
  };
}

function makeVenues(overrides: Partial<VenueProClient> = {}): VenueProClient {
  return makeVenueClientDouble(null, overrides);
}

function makeReferentials(overrides: Partial<ReferentialsClient> = {}): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue([]),
    listAmenities: vi.fn().mockResolvedValue([]),
    listVenueStyles: vi.fn().mockResolvedValue([]),
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
  // A10 : les 4 champs D42 du contrat AuthUserDTO.
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null }
};

function renderAt(path: string, client: AuthClient, venues?: VenueProClient, referentials?: ReferentialsClient) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders client={client} venues={venues} referentials={referentials}>
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

  it("UI-D2 — la bascule de thème est présente sur l'écran de CONNEXION, pas seulement après login", async () => {
    renderAt("/", makeClient());
    expect(await screen.findByRole("button", { name: "Changer de thème" })).toBeInTheDocument();
  });

  it("session CLIENT sur / : refus explicite « espace réservé aux professionnels »", async () => {
    const client = makeClient({
      bootstrap: vi.fn().mockResolvedValue({ ...PRO_USER, role: "CLIENT", proProfile: null })
    });
    renderAt("/", client);
    expect(await screen.findByRole("heading", { name: "Espace réservé aux professionnels" })).toBeInTheDocument();
  });

  // Lot A5 : `/` EST la liste des salles. On ne se contente pas de retirer
  // l'assertion périmée — on prouve que la coquille rend bien la liste pour un
  // PRO (client venue injecté → aucune salle → état vide attendu).
  it("session PRO sur / : l'écran « Nouvelle réservation », plus la liste des salles", async () => {
    const venues = makeVenues({ listMine: vi.fn().mockResolvedValue([]) });
    renderAt("/", makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) }), venues, makeReferentials());

    // ⚠ Le titre a changé avec la refonte : « Tableau de bord » reste le nom de
    // l'ONGLET, mais le `<h1>` de la page annonce la tâche, pas la rubrique.
    expect(await screen.findByRole("heading", { level: 1, name: "Nouvelle réservation" })).toBeInTheDocument();
    // Sans salle, le tableau de bord ne prétend rien : il demande d'en créer une.
    expect(await screen.findByRole("link", { name: "Créer une salle" })).toBeInTheDocument();
    // L'en-tête extrait (pro-header) reste au-dessus. A11a : le nom en clair a
    // cédé la place au rond à initiales — on assert le déclencheur du menu et
    // les initiales dérivées du businessName, pas le nom affiché.
    expect(screen.getByRole("button", { name: "Mon compte" })).toBeInTheDocument();
    expect(screen.getByText("SE")).toBeInTheDocument();
  });

  it("session PRO sur /salles : la LISTE, sur une route enfin DÉCLARÉE (dette fermée)", async () => {
    const venues = makeVenues({ listMine: vi.fn().mockResolvedValue([]) });
    renderAt("/salles", makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) }), venues, makeReferentials());

    expect(await screen.findByRole("heading", { name: "Mes salles" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Aucune salle pour le moment" })).toBeInTheDocument();
    expect(venues.listMine).toHaveBeenCalled();
  });

  it("le TOP PANEL porte les cinq entrées, et une seule pour les salles", async () => {
    renderAt("/", makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) }), makeVenues(), makeReferentials());

    const nav = await screen.findByRole("navigation", { name: "Navigation de l'espace professionnel" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual(["Tableau de bord", "Ma salle", "Demandes", "Calendrier", "Réservations"]);
  });

  it("l'entrée active est annoncée par aria-current, jamais par la seule couleur", async () => {
    renderAt("/demandes", makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) }), makeVenues(), makeReferentials());

    const nav = await screen.findByRole("navigation", { name: "Navigation de l'espace professionnel" });
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent);
    // UNE seule entrée active. ⚠ Ce test fige un COMPORTEMENT OBSERVABLE, il ne
    // prouve pas une garde : sur react-router 7, la racine ne se marque pas
    // active sur une sous-route même sans `end` (mesuré). Il vaut donc comme
    // sentinelle si la bibliothèque change d'avis, pas comme preuve du `end`.
    expect(current).toEqual(["Demandes"]);
  });
});

describe("⚠ Portes d'entrée fermées à une session ouverte", () => {
  // ⚠ LE DÉFAUT QUE CES TESTS FIGENT. `RequireProSession` empêchait d'entrer sans
  // session ; rien n'empêchait d'en sortir vers `/auth/connexion` AVEC une session
  // valide. Un pro connecté qui tapait cette adresse voyait le formulaire, et
  // pouvait se reconnecter par-dessus lui-même — voire avec un autre compte, en
  // échangeant le jeton sous une application déjà montée.

  it("un PRO connecté sur /auth/connexion est renvoyé au tableau de bord", async () => {
    const client = makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) });
    renderAt("/auth/connexion", client, makeVenues(), makeReferentials());

    expect(await screen.findByRole("heading", { level: 1, name: "Nouvelle réservation" })).toBeInTheDocument();
    // L'écart mesuré : le formulaire a DISPARU. Sans le garde, il s'afficherait
    // par-dessus une session parfaitement valide.
    expect(screen.queryByLabelText("Mot de passe")).not.toBeInTheDocument();
  });

  it("un CLIENT connecté y est renvoyé aussi, et lit le refus EXPLICITE", async () => {
    const client = makeClient({
      bootstrap: vi.fn().mockResolvedValue({ ...PRO_USER, role: "CLIENT", proProfile: null })
    });
    renderAt("/auth/connexion", client, makeVenues(), makeReferentials());

    // Un formulaire de connexion lui aurait laissé croire qu'il n'était pas
    // connecté du tout. La carte « mauvais rôle » porte, elle, un bouton de
    // déconnexion : le seul geste utile.
    expect(await screen.findByRole("heading", { name: "Espace réservé aux professionnels" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Mot de passe")).not.toBeInTheDocument();
  });

  it("l'inscription est fermée elle aussi : on ne crée pas un compte par-dessus le sien", async () => {
    const client = makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) });
    renderAt("/auth/inscription", client, makeVenues(), makeReferentials());
    expect(await screen.findByRole("heading", { level: 1, name: "Nouvelle réservation" })).toBeInTheDocument();
  });

  it("⚠ la VÉRIFICATION D'E-MAIL reste ouverte — c'est son cas nominal", async () => {
    // Elle est atteinte APRÈS un changement d'adresse, donc forcément connecté :
    // la fermer casserait précisément le parcours qu'elle sert. Même raison pour
    // `/auth/reinitialisation`, qui consomme un jeton reçu par e-mail.
    const client = makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) });
    renderAt("/auth/verification-email", client, makeVenues(), makeReferentials());

    expect(await screen.findByRole("heading", { level: 1 })).not.toHaveTextContent("Nouvelle réservation");
  });

  it("un ANONYME voit toujours le formulaire — aucune régression", async () => {
    const client = makeClient({ bootstrap: vi.fn().mockResolvedValue(null) });
    renderAt("/auth/connexion", client);
    expect(await screen.findByLabelText("Mot de passe")).toBeInTheDocument();
  });
});

describe("Connexion PRO — D22 (403 EMAIL_NOT_VERIFIED)", () => {
  it("montre l'action de renvoi, qui déclenche resend-verification avec l'email saisi", async () => {
    const client = makeClient({
      login: vi.fn().mockRejectedValue(new ApiError(403, "EMAIL_NOT_VERIFIED", "auth.errors.emailNotVerified"))
    });
    renderAt("/auth/connexion", client);

    const emailInput = await screen.findByLabelText("Email");
    // Verrou D32 (correctif 7.1) : l'astérisque visuel est aria-hidden — c'est
    // l'attribut natif `required` sur l'input réel qui informe le lecteur d'écran.
    expect(emailInput).toBeRequired();
    fireEvent.change(emailInput, { target: { value: "contact@salle.dz" } });
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

  it("téléphone non joignable : erreur de validation partagée, AUCUN appel API", async () => {
    const client = makeClient();
    renderAt("/auth/inscription", client);

    fireEvent.change(await screen.findByLabelText("Nom de l'établissement"), { target: { value: "Salle El Ryad" } });
    // ⚠ `0551223344` N'EST PLUS UNE ERREUR (R3) : c'est la saisie locale, que le
    // schéma normalise. Le fixe, lui, reste refusé — décision « mobile
    // uniquement », parce que ce numéro est la destination WhatsApp du pro.
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "021223344" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "contact@salle.dz" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), { target: { value: "Motdepasse1" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    // Le message ne dit plus « format attendu : +213XXXXXXXXX » — il ne faut
    // justement plus demander à l'utilisateur de composer l'indicatif.
    expect(await screen.findByText(/mobile invalide/i)).toBeInTheDocument();
    expect(client.register).not.toHaveBeenCalled();
  });
});
