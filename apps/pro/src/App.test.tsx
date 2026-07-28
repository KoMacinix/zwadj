// Tests de la coquille Pro (fr) : garde D24, refus de rôle D23, accueil,
// 403 EMAIL_NOT_VERIFIED avec renvoi (D22), inscription → « vérifiez votre
// email » sans auto-login (D21). Client API injecté, MemoryRouter en jsdom.
//
// Lot A5 — deux mises à jour de CONTRAT (arbitrage 2) : l'interface AuthClient
// gagne `authedRequest`, et `/` ne rend plus le tableau de bord placeholder
// mais la liste des salles.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import type { ReferentialsClient, VenueProClient } from "@zwadj/api-client";
import { ApiError, type AuthClient } from "./lib/auth-client";
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
  return {
    listMine: vi.fn().mockResolvedValue([]),
    getMine: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    updateVirtualTour: vi.fn(),
    // A6a-P — les 4 méthodes photos du contrat VenueProClient.
    addPhoto: vi.fn(),
    reorderPhotos: vi.fn(),
    updatePhotoAlt: vi.fn(),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function makeReferentials(overrides: Partial<ReferentialsClient> = {}): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue([]),
    listAmenities: vi.fn().mockResolvedValue([]),
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
  it("session PRO sur / : la coquille rend la LISTE des salles (état vide) + le nom de l'établissement", async () => {
    const venues = makeVenues({ listMine: vi.fn().mockResolvedValue([]) });
    renderAt("/", makeClient({ bootstrap: vi.fn().mockResolvedValue(PRO_USER) }), venues, makeReferentials());

    expect(await screen.findByRole("heading", { name: "Mes salles" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Aucune salle pour le moment" })).toBeInTheDocument();
    expect(venues.listMine).toHaveBeenCalled();
    // L'en-tête extrait (pro-header) reste au-dessus de la liste. A11a : le nom
    // en clair a cédé la place au rond à initiales — on assert le déclencheur du
    // menu et les initiales dérivées du businessName, pas le nom affiché.
    expect(screen.getByRole("button", { name: "Mon compte" })).toBeInTheDocument();
    expect(screen.getByText("SE")).toBeInTheDocument();
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
