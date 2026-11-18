// Tests de la LISTE des salles (Lot A5). Points sensibles couverts :
//  - D33 : trois états rendus, PATCH { status } déclenché, AUCUNE confirmation ;
//  - suppression : elle, exige le ConfirmDialog, puis recharge la liste ;
//  - états vide / chargement / erreur + retry.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import i18next from "i18next";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { ReferentialsClient, VenueProClient, VenuePublicationClient } from "@zwadj/api-client";
import type { VenuePublicationReviewDTO, VenueProDTO, WilayaDTO } from "@zwadj/types";
import { ApiError, NetworkError, type AuthClient } from "../lib/auth-client";
import { makeVenueClientDouble } from "../test-support/client-doubles";
import { initI18n } from "../i18n";
import { AppProviders } from "../App";
import { formatReviewDate } from "./publication-review";
import { VenueListPage } from "./venue-list-page";

initI18n();

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

const VENUE: VenueProDTO = {
  slotTemplates: [],
  id: "v1",
  slug: "salle-el-ryad",
  cityId: "city-bab-ezzouar",
  nameFr: "Salle El Ryad",
  nameAr: "قاعة الرياض",
  taglineFr: null,
  taglineAr: null,
  descriptionFr: null,
  descriptionAr: null,
  districtFr: null,
  districtAr: null,
  address: null,
  lat: null,
  lng: null,
  capacityMax: 400,
  basePriceCents: 15_000_000,
  bookingMode: "SINGLE_SLOT",
  depositRateBps: 3000,
  depositAmountCents: null,
  publicationStatus: "DRAFT",
  status: "ACTIVE",
  amenityIds: [],
  styleIds: [],
  ceremonyType: null,
  photos: [],
  matterportModelId: null,
  createdAt: "2026-01-05T10:00:00.000Z",
  updatedAt: "2026-01-06T10:00:00.000Z"
};

const WILAYAS: WilayaDTO[] = [
  {
    id: "w16",
    code: 16,
    nameFr: "Alger",
    nameAr: "الجزائر",
    cities: [{ id: "city-bab-ezzouar", nameFr: "Bab Ezzouar", nameAr: "باب الزوار", lat: null, lng: null }]
  }
];

function makeAuth(): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(PRO_USER),
    login: vi.fn(),
    googleAuth: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    authedRequest: vi.fn(),
    getAccessToken: () => "jwt"
  };
}

function makeVenues(overrides: Partial<VenueProClient> = {}): VenueProClient {
  return makeVenueClientDouble(VENUE, {
    update: vi
      .fn()
      .mockImplementation((_id: string, patch: Record<string, unknown>) =>
        Promise.resolve({ ...VENUE, ...patch })
      ),
    ...overrides
  });
}

function makeReferentials(overrides: Partial<ReferentialsClient> = {}): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue(WILAYAS),
    listAmenities: vi.fn().mockResolvedValue([]),
    listVenueStyles: vi.fn().mockResolvedValue([]),
    ...overrides
  };
}

// ══ RANG 54 (D352), R-1 — la carte lit le refus de chaque salle NON publiée (`GET pro/venues/:id/publication`, D349). Par défaut, le double répond « jamais refusée » : ce qui n'est pas l'objet d'un test ne reçoit pas un client réel
// construit sur `authedRequest` (un `vi.fn()` qui rend `undefined`, c'est-à-dire une panne de lecture). ⚠ La lecture est ASYNCHRONE : un test qui lit l'état de publication d'une carte l'ATTEND (`waitFor`, `findBy…`).
const MOTIF = "Les photos sont floues. Merci de les remplacer.";
const DATE_ISO = "2026-11-12T10:15:00.000Z";
const JAMAIS: VenuePublicationReviewDTO = { publicationStatus: "DRAFT", rejection: null } as VenuePublicationReviewDTO;
const REFUSEE: VenuePublicationReviewDTO = { publicationStatus: "DRAFT", rejection: { reason: MOTIF, rejectedAt: DATE_ISO } } as VenuePublicationReviewDTO;

function publicationDouble(review: unknown = JAMAIS): VenuePublicationClient & { getPublicationReview: ReturnType<typeof vi.fn> } {
  return { getPublicationReview: vi.fn((_venueId: string) => (review instanceof Error ? Promise.reject(review) : Promise.resolve(review as VenuePublicationReviewDTO))) };
}

function renderList(venues: VenueProClient, referentials: ReferentialsClient = makeReferentials(), publication: VenuePublicationClient = publicationDouble()) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AppProviders client={makeAuth()} venues={venues} referentials={referentials} publicationClient={publication}>
        <VenueListPage />
      </AppProviders>
    </MemoryRouter>
  );
}

describe("Liste des salles — rendu des cartes", () => {
  it("affiche nom, commune (data), capacité et prix formaté depuis les CENTIMES", async () => {
    renderList(makeVenues());

    expect(await screen.findByRole("heading", { name: "Salle El Ryad" })).toBeInTheDocument();
    expect(screen.getByText("Bab Ezzouar")).toBeInTheDocument();
    expect(screen.getByText("Jusqu'à 400 invités")).toBeInTheDocument();
    // formatDZD prend des centimes : 15 000 000 centimes = 150 000 DA.
    expect(screen.getByText(/150\s*000/)).toBeInTheDocument();
    // Sans photo : le bloc placeholder, et AUCUNE gestion de média.
    expect(screen.getByText("Aucune photo")).toBeInTheDocument();
    // Publication : badge LECTURE SEULE, aucun bouton « publier/soumettre ».
    // Rang 54 : l'état de publication d'une salle non publiée se lit à la RÉPONSE de la route du refus — on l'attend.
    expect(await screen.findByText("En attente de publication par Zwadj")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publier|soumettre/i })).not.toBeInTheDocument();
  });

  it("état VIDE : titre, explication et appel à l'action", async () => {
    renderList(makeVenues({ listMine: vi.fn().mockResolvedValue([]) }));
    expect(await screen.findByRole("heading", { name: "Aucune salle pour le moment" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer une salle" })).toBeInTheDocument();
  });

  it("état ERREUR : message + « Réessayer » qui relance réellement l'appel", async () => {
    const listMine = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, "INTERNAL", undefined))
      .mockResolvedValueOnce([VENUE]);
    renderList(makeVenues({ listMine }));

    expect(await screen.findByText("Impossible de charger vos salles.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByRole("heading", { name: "Salle El Ryad" })).toBeInTheDocument();
    expect(listMine).toHaveBeenCalledTimes(2);
  });
});

describe("Liste — statut D33 (3 entrées, sans confirmation)", () => {
  it("rend les TROIS états et envoie PATCH { status } sans ouvrir de dialogue", async () => {
    const venues = makeVenues();
    renderList(venues);

    const select = await screen.findByLabelText("Visibilité");
    // Trois entrées, donc un select — jamais un toggle (D33/§3.4).
    expect(Array.from(select.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Visible",
      "Masquée",
      "Temporairement indisponible"
    ]);

    fireEvent.change(select, { target: { value: "HIDDEN" } });

    await waitFor(() => expect(venues.update).toHaveBeenCalledWith("v1", { status: "HIDDEN" }));
    // Réversible, sans re-modération ⇒ AUCUNE confirmation ne doit apparaître.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(select).toHaveValue("HIDDEN"); // mise à jour optimiste
  });

  it("échec du PATCH : REVERT de la valeur + message d'erreur", async () => {
    const venues = makeVenues({ update: vi.fn().mockRejectedValue(new ApiError(500, "INTERNAL", undefined)) });
    renderList(venues);

    const select = await screen.findByLabelText("Visibilité");
    fireEvent.change(select, { target: { value: "TEMPORARILY_UNAVAILABLE" } });

    expect(await screen.findByText("Le changement de visibilité a échoué. Réessayez.")).toBeInTheDocument();
    // La valeur revient à l'état serveur : le pro ne doit pas croire sa salle
    // masquée alors qu'elle est toujours en ligne.
    await waitFor(() => expect(select).toHaveValue("ACTIVE"));
  });
});

describe("Liste — suppression (soft delete)", () => {
  it("« Supprimer » ouvre le ConfirmDialog ; confirmer appelle softDelete puis recharge", async () => {
    const venues = makeVenues();
    renderList(venues);

    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Supprimer cette salle ?");
    expect(venues.softDelete).not.toHaveBeenCalled(); // rien avant confirmation

    // Deux boutons « Supprimer » coexistent (carte + dialogue) : on cible
    // explicitement celui DU DIALOGUE.
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(venues.softDelete).toHaveBeenCalledWith("v1"));
    await waitFor(() => expect(venues.listMine).toHaveBeenCalledTimes(2)); // rechargement
  });

  it("annuler ferme le dialogue SANS rien supprimer", async () => {
    const venues = makeVenues();
    renderList(venues);

    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(venues.softDelete).not.toHaveBeenCalled();
  });
});

// ══ RANG 38 (D332), S-11 — LE TITRE DE LA PAGE SUIT LE MENU ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Observé par D331 sur ses captures : avec UNE salle, le menu du haut disait « Ma salle » et le `<h1>` de la page « Mes salles ». Ko (14/10/2026) : « le titre de la page suit le menu ».
// La règle (« Ma salle » jusqu'à une salle, « Mes salles » dès la seconde) vit UNE fois, dans `venuesLabelKey` ; le menu et la page l'importent. Verdicts NATIFS (`expect` sur `textContent`).
describe("Liste — rang 38 (S-11) : le titre de la page suit le menu « Ma salle / Mes salles »", () => {
  const VENUE_B: VenueProDTO = { ...VENUE, id: "v2", slug: "salle-b", nameFr: "Salle B", nameAr: "قاعة ب" };
  const titre = () => screen.queryByRole("heading", { level: 1 })?.textContent;
  const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/\s.*$/gm, "");
  const source = (f: string) => sansCommentaires(readFileSync(resolve(process.cwd(), f), "utf8"));

  /** La langue revient au français APRÈS le démontage : changer la langue d'un arbre monté mettrait à jour ses composants hors `act` (la garde de console du fichier le refuse). */
  afterEach(async () => {
    cleanup();
    await act(async () => {
      await i18next.changeLanguage("fr");
    });
  });

  it("UNE salle : « Ma salle », le mot du menu — et non « Mes salles »", async () => {
    renderList(makeVenues());
    await screen.findByRole("heading", { name: "Salle El Ryad" });
    expect(titre()).toBe(messages.fr.venue.ui.nav.myVenue);
    expect(titre()).not.toBe(messages.fr.venue.ui.nav.myVenues);
  });

  it("DEUX salles : « Mes salles » ; le menu du haut dit le même mot", async () => {
    renderList(makeVenues({ listMine: vi.fn().mockResolvedValue([VENUE, VENUE_B]) }));
    await screen.findByRole("heading", { name: "Salle B" });
    expect(titre()).toBe(messages.fr.venue.ui.nav.myVenues);
    expect(screen.queryByRole("link", { name: messages.fr.venue.ui.nav.myVenues }), "le menu dit le même mot que le titre").not.toBeNull();
  });

  it("AUCUNE salle (état vide) : « Ma salle » comme le menu — un compte de zéro est un singulier", async () => {
    renderList(makeVenues({ listMine: vi.fn().mockResolvedValue([]) }));
    await screen.findByRole("heading", { name: "Aucune salle pour le moment" });
    expect(titre()).toBe(messages.fr.venue.ui.nav.myVenue);
  });

  it("en ARABE : « قاعتي » pour une salle, « قاعاتي » pour deux", async () => {
    await act(async () => {
      await i18next.changeLanguage("ar");
    });
    renderList(makeVenues());
    await screen.findByRole("heading", { name: VENUE.nameAr });
    expect(titre()).toBe(messages.ar.venue.ui.nav.myVenue);
    cleanup();
    renderList(makeVenues({ listMine: vi.fn().mockResolvedValue([VENUE, VENUE_B]) }));
    await screen.findByRole("heading", { name: VENUE_B.nameAr });
    expect(titre()).toBe(messages.ar.venue.ui.nav.myVenues);
  });

  it("⛔ P-16 : supprimer la SECONDE salle ramène le titre à « Ma salle » SANS recharger la page (le compte vient du fournisseur, comme le menu)", async () => {
    const listMine = vi.fn().mockResolvedValueOnce([VENUE, VENUE_B]).mockResolvedValue([VENUE]);
    renderList(makeVenues({ listMine }));
    await screen.findByRole("heading", { name: "Salle B" });
    expect(titre()).toBe(messages.fr.venue.ui.nav.myVenues);

    fireEvent.click(screen.getAllByRole("button", { name: "Supprimer" })[1] as HTMLElement);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(titre()).toBe(messages.fr.venue.ui.nav.myVenue));
  });

  it("⛔ P-16 : la règle vit UNE fois — la page ET le menu importent `venuesLabelKey` et ne portent plus les clés du libellé ni l'ancien titre", () => {
    for (const f of ["src/venues/venue-list-page.tsx", "src/shell/pro-nav.tsx"]) {
      expect(source(f), f).toMatch(/\bvenuesLabelKey\b/);
      expect(source(f), f).not.toMatch(/venue\.ui\.nav\.myVenue/);
    }
    expect(source("src/venues/venue-list-page.tsx")).not.toMatch(/venue\.ui\.list\.title/);
  });
});

// ══ RANG 54 (D352), R-1 — LA LISTE « MES SALLES » DIT « REFUSÉE » POUR UNE SALLE REFUSÉE ══════════════════════════════════════════════════════════════════════════════════════
// Le défaut : la carte rendait `PublicationBadge` — « En attente de publication par Zwadj » pour TOUTE salle en brouillon, refusée ou non (le refus n'était lisible que DANS la salle, D350). Le pro qui a été refusé croyait attendre.
// La voie (A), sans contrat neuf (consigne, R-1) : la carte d'une salle NON publiée lit `GET pro/venues/:id/publication` (D349) ; une salle publiée n'appelle rien. Cinq mesures (docs/preuves/D352/regle-portes.md, § 1) :
//   1. le nombre d'appels est borné ; 2. une panne de lecture n'est jamais « pas refusée » (D133, D142, D120) ; 3. l'affichage ne SAUTE pas (rien n'est affirmé avant la réponse) ; 4. l'e2e ne refuse pas la voie ; 5. le MOTIF n'entre jamais dans la liste.
// ⛔ Verdicts NATIFS (`expect` sur `null` / `toBe` / `toEqual`) : aucun verdict ne repose sur une requête qui lève ni sur un matcher jest-dom (AGENTS.md, D304, D316).
describe("Liste — rang 54 (D352, R-1) : « Refusée » pour une salle refusée", () => {
  const REFUSEE_FR = messages.fr.publicationReview.refusedBadge;
  const EN_ATTENTE_FR = messages.fr.venue.ui.publication.draft;
  const salle = (id: string, publicationStatus: "DRAFT" | "PUBLISHED"): VenueProDTO => ({ ...VENUE, id, slug: `salle-${id}`, nameFr: `Salle ${id}`, nameAr: `قاعة ${id}`, publicationStatus });

  afterEach(async () => {
    cleanup();
    await act(async () => {
      await i18next.changeLanguage("fr");
    });
  });

  it("une salle REFUSÉE : la carte dit « Refusée » et ne dit PLUS « En attente de publication par Zwadj »", async () => {
    const pub = publicationDouble(REFUSEE);
    renderList(makeVenues(), makeReferentials(), pub);
    await screen.findByRole("heading", { name: "Salle El Ryad" });
    await waitFor(() => expect(screen.queryByText(REFUSEE_FR)).not.toBeNull());
    expect(screen.queryByText(EN_ATTENTE_FR)).toBeNull();
    expect(pub.getPublicationReview).toHaveBeenCalledWith("v1");
  });

  it("en ARABE : la carte dit le mot du catalogue arabe, et plus l'attente (la parité des clés est mesurée ailleurs : `i18n-parity.spec.ts`)", async () => {
    await act(async () => {
      await i18next.changeLanguage("ar");
    });
    renderList(makeVenues(), makeReferentials(), publicationDouble(REFUSEE));
    await screen.findByRole("heading", { name: VENUE.nameAr });
    await waitFor(() => expect(screen.queryByText(messages.ar.publicationReview.refusedBadge)).not.toBeNull());
    expect(screen.queryByText(messages.ar.venue.ui.publication.draft)).toBeNull();
    expect(messages.ar.publicationReview.refusedBadge === messages.fr.publicationReview.refusedBadge, "le mot arabe n'est pas le mot français").toBe(false);
  });

  it("une salle JAMAIS refusée garde « En attente de publication par Zwadj », après la lecture de SON état", async () => {
    const pub = publicationDouble(JAMAIS);
    renderList(makeVenues(), makeReferentials(), pub);
    await screen.findByRole("heading", { name: "Salle El Ryad" });
    await waitFor(() => expect(screen.queryByText(EN_ATTENTE_FR)).not.toBeNull());
    expect(screen.queryByText(REFUSEE_FR)).toBeNull();
    expect(pub.getPublicationReview).toHaveBeenCalledWith("v1");
  });

  it("une salle PUBLIÉE : « Publiée », et AUCUNE lecture du refus (publier efface le motif : il n'y a rien à lire)", async () => {
    const pub = publicationDouble(REFUSEE);
    renderList(makeVenues({ listMine: vi.fn().mockResolvedValue([salle("p1", "PUBLISHED")]) }), makeReferentials(), pub);
    await screen.findByRole("heading", { name: "Salle p1" });
    expect(screen.queryByText(messages.fr.venue.ui.publication.published)).not.toBeNull();
    expect(screen.queryByText(REFUSEE_FR)).toBeNull();
    expect(pub.getPublicationReview).toHaveBeenCalledTimes(0);
  });

  it("⛔ l'affichage ne SAUTE pas : tant que la lecture n'a pas répondu, la carte n'affirme NI « En attente… » NI « Refusée » (elle ne connaît pas l'état) ; elle le porte `aria-busy` ; la réponse rend l'état vrai", async () => {
    let liberer: (review: VenuePublicationReviewDTO) => void = () => undefined;
    const pub = { getPublicationReview: vi.fn((_venueId: string) => new Promise<VenuePublicationReviewDTO>((resolve) => { liberer = resolve; })) };
    renderList(makeVenues(), makeReferentials(), pub);
    await screen.findByRole("heading", { name: "Salle El Ryad" });
    await waitFor(() => expect(pub.getPublicationReview).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(EN_ATTENTE_FR), "avant la réponse, la carte ne dit pas « en attente » : elle ne le sait pas").toBeNull();
    expect(screen.queryByText(REFUSEE_FR), "avant la réponse, la carte ne dit pas « refusée » non plus").toBeNull();
    expect(document.querySelector('[aria-busy="true"]'), "la carte annonce qu'elle attend").not.toBeNull();
    await act(async () => {
      liberer(REFUSEE);
    });
    await waitFor(() => expect(screen.queryByText(REFUSEE_FR)).not.toBeNull());
    expect(document.querySelector('[aria-busy="true"]'), "la réponse levée, plus rien n'attend").toBeNull();
  });

  it("⛔ D133, D142 — une PANNE de lecture n'est PAS « pas refusée » : la carte ne dit pas « En attente… », elle dit qu'elle n'a pas pu vérifier ; la salle reste listée", async () => {
    renderList(makeVenues(), makeReferentials(), publicationDouble(new NetworkError()));
    await screen.findByRole("heading", { name: "Salle El Ryad" });
    await waitFor(() => expect(screen.queryByText(messages.fr.publicationReview.loadError)).not.toBeNull());
    expect(screen.queryByText(EN_ATTENTE_FR)).toBeNull();
    expect(screen.queryByText(REFUSEE_FR)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Salle El Ryad" })).not.toBeNull();
  });

  it.each([
    ["null", null],
    ["un objet sans état de publication", {}],
    ["un refus sans motif", { publicationStatus: "DRAFT", rejection: {} }]
  ])("⛔ D120 — une réponse MALFORMÉE (%s) est une PANNE, jamais un « pas refusée »", async (_nom, mauvaise) => {
    renderList(makeVenues(), makeReferentials(), publicationDouble(mauvaise));
    await screen.findByRole("heading", { name: "Salle El Ryad" });
    await waitFor(() => expect(screen.queryByText(messages.fr.publicationReview.loadError)).not.toBeNull());
    expect(screen.queryByText(EN_ATTENTE_FR)).toBeNull();
  });

  it("le nombre d'appels est borné : UNE lecture par salle non publiée, aucune pour la publiée, et pas une de plus une fois les états rendus", async () => {
    const pub = publicationDouble(JAMAIS);
    const salles = [salle("a", "DRAFT"), salle("b", "DRAFT"), salle("c", "DRAFT"), salle("d", "PUBLISHED")];
    renderList(makeVenues({ listMine: vi.fn().mockResolvedValue(salles) }), makeReferentials(), pub);
    await screen.findByRole("heading", { name: "Salle d" });
    await waitFor(() => expect(screen.queryAllByText(EN_ATTENTE_FR).length).toBe(3));
    await act(async () => {
      await Promise.resolve();
    });
    expect(pub.getPublicationReview.mock.calls.map((appel) => appel[0]).sort()).toEqual(["a", "b", "c"]);
  });

  it("⛔ le MOTIF et la DATE du refus n'entrent JAMAIS dans la liste : la carte dit « Refusée », rien de plus (ils se lisent en OUVRANT la salle, D350)", async () => {
    renderList(makeVenues(), makeReferentials(), publicationDouble(REFUSEE));
    await screen.findByRole("heading", { name: "Salle El Ryad" });
    await waitFor(() => expect(screen.queryByText(REFUSEE_FR)).not.toBeNull());
    const texte = document.body.textContent ?? "";
    expect(texte.includes(MOTIF), "le motif écrit par l'admin n'est pas dans la liste").toBe(false);
    expect(texte.includes(formatReviewDate(DATE_ISO, "fr")), "la date du refus n'est pas dans la liste").toBe(false);
  });
});
