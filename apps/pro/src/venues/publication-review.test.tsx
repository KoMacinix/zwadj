// ADM-2 (D350, rang 52, R-6, D-5, MD-ADM-5) — le PRO lit son refus. Mesuré sur l'assistant d'édition RÉEL (`EditVenuePage`), pas sur un composant isolé : ce qui compte est ce que le pro VOIT.
//
// Le défaut que ce lot corrige : une salle rejetée affichait « En attente de publication par Zwadj » — le pro croyait attendre alors qu'il avait été refusé. Ce fichier mesure que :
//  · le refus (motif, date) s'affiche à l'étape « Publication », et que l'en-tête de l'assistant ne dit PLUS « en attente » pour une salle refusée (deux messages contradictoires sur une page) ;
//  · une salle jamais refusée garde son badge d'avant ; une salle PUBLIÉE n'appelle même pas la route ;
//  · une PANNE de lecture n'est pas un « pas refusée » (D133, D142) : l'étape le dit et propose de réessayer ;
//  · le texte est celui du CATALOGUE, en français ET en arabe (parité) ; le motif, écrit par l'admin, est rendu tel quel avec `dir="auto"`.
// ⚠ `venue-form.tsx` n'est pas modifié (R-6) : `PublicationBadge` reste ce qu'il est, c'est la page qui choisit de ne plus le montrer pour une salle refusée.
// ⛔ (D352, rang 54, R-1 : `par-carte` est intégrée, `venue-form.tsx` n'est plus interdit — la phrase qui précède est PÉRIMÉE sur « n'est PAS modifié » : `PublicationBadge` accepte désormais `status={null}` (« l'état n'est pas connu » : le libellé « Publication » seul) et `busy` (`aria-busy`), pour la carte de « Mes salles » — `PublicationListBadge` (`publication-review.tsx`), testé par `venue-list.test.tsx`. Annoté, pas réécrit.)
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { VenuePublicationClient } from "@zwadj/api-client";
import { VenuePublicationStatus, type VenuePublicationReviewDTO, type VenueProDTO } from "@zwadj/types";
import { AppProviders, AppRoutes } from "../App";
import { initI18n } from "../i18n";
import { NetworkError } from "../lib/auth-client";
import { makeAuthDouble, makeBookingsProDouble, makeQuotesDouble, makeReferentialsDouble, makeServicesDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { elementAttendu, elementPresent } from "../test-support/native-presence";
import { formatReviewDate } from "./publication-review";

initI18n();

const FR = messages.fr.publicationReview;
const AR = messages.ar.publicationReview;
const BADGE = messages.fr.venue.ui.publication;
const WIZARD = messages.fr.venue.ui.wizard;
const MOTIF = "Les photos sont floues. Merci de les remplacer.";
const DATE_ISO = "2026-11-12T10:15:00.000Z";

const SALLE = (over: Partial<VenueProDTO> = {}): VenueProDTO =>
  ({
    id: "v1",
    slug: "salle-v1",
    cityId: "11111111-1111-4111-8111-111111111111",
    nameFr: "Salle Une",
    nameAr: "قاعة",
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
    status: "ACTIVE",
    publicationStatus: "DRAFT",
    amenityIds: [],
    styleIds: [],
    ceremonyType: null,
    photos: [],
    slotTemplates: [],
    matterportModelId: null,
    ...over
  }) as unknown as VenueProDTO;

const scrollTo = vi.fn();
beforeEach(() => {
  Object.defineProperty(window, "scrollTo", { value: scrollTo, configurable: true, writable: true });
});
afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18next.changeLanguage("fr");
  });
});

function publicationDouble(review: VenuePublicationReviewDTO | Error): VenuePublicationClient {
  return { getPublicationReview: vi.fn(() => (review instanceof Error ? Promise.reject(review) : Promise.resolve(review))) };
}

async function rendreA(chemin: string, publication: VenuePublicationClient, salle: VenueProDTO = SALLE(), langue: "fr" | "ar" = "fr") {
  render(
    <MemoryRouter initialEntries={[chemin]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={makeVenueClientDouble(salle)}
        referentials={makeReferentialsDouble()}
        bookingsPro={makeBookingsProDouble()}
        servicesClient={makeServicesDouble()}
        quotesClient={makeQuotesDouble()}
        publicationClient={publication}
      >
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>
  );
  const titres = messages[langue].venue.ui.wizard;
  await elementAttendu(() => screen.queryByRole("heading", { name: chemin.includes("etape=7") ? titres.step7 : titres.step1 }));
}

const REFUSEE: VenuePublicationReviewDTO = { publicationStatus: VenuePublicationStatus.DRAFT, rejection: { reason: MOTIF, rejectedAt: DATE_ISO } };
const JAMAIS: VenuePublicationReviewDTO = { publicationStatus: VenuePublicationStatus.DRAFT, rejection: null };

describe("une salle REFUSÉE : le pro lit le refus", () => {
  it("à l'étape « Publication » : le titre, le motif de l'admin tel quel (`dir=\"auto\"`), la date, et ce que le pro peut faire", async () => {
    const pub = publicationDouble(REFUSEE);
    await rendreA("/salles/v1?etape=7", pub);

    await elementAttendu(() => screen.queryByText(FR.noticeTitle));
    const motif = elementPresent(() => screen.queryByText(MOTIF));
    expect(motif.getAttribute("dir")).toBe("auto");
    elementPresent(() => screen.queryByText(FR.noticeDate.replace("{date}", formatReviewDate(DATE_ISO, "fr")), { exact: false }));
    elementPresent(() => screen.queryByText(FR.noticeHelp));
    expect(pub.getPublicationReview).toHaveBeenCalledWith("v1");
  });

  it("MD-ADM-5 — l'en-tête de l'assistant NE DIT PLUS « En attente de publication par Zwadj » pour une salle refusée : il dit qu'elle est refusée", async () => {
    await rendreA("/salles/v1?etape=7", publicationDouble(REFUSEE));
    await elementAttendu(() => screen.queryByText(FR.noticeTitle));
    expect(screen.queryByText(BADGE.draft)).toBeNull();
    elementPresent(() => screen.queryByText(FR.refusedBadge));
  });

  it("l'en-tête dit « refusée » sur CHAQUE étape, mais le motif complet n'est que dans l'étape « Publication »", async () => {
    await rendreA("/salles/v1?etape=1", publicationDouble(REFUSEE));
    await elementAttendu(() => screen.queryByText(FR.refusedBadge));
    expect(screen.queryByText(BADGE.draft)).toBeNull();
    expect(screen.queryByText(MOTIF)).toBeNull();
  });

  it("la lecture du refus part UNE fois par ouverture de la salle (pas à chaque changement d'étape)", async () => {
    const pub = publicationDouble(REFUSEE);
    await rendreA("/salles/v1?etape=7", pub);
    await elementAttendu(() => screen.queryByText(FR.noticeTitle));
    fireEvent.click(elementPresent(() => screen.queryByRole("button", { name: WIZARD.previous })));
    await elementAttendu(() => screen.queryByRole("heading", { name: WIZARD.step6 }));
    expect(pub.getPublicationReview).toHaveBeenCalledTimes(1);
  });
});

describe("une salle PAS refusée", () => {
  it("brouillon jamais refusé : le badge d'AVANT (« en attente »), aucun avis de refus", async () => {
    await rendreA("/salles/v1?etape=7", publicationDouble(JAMAIS));
    await elementAttendu(() => screen.queryByText(BADGE.draft));
    expect(screen.queryByText(FR.noticeTitle)).toBeNull();
    expect(screen.queryByText(FR.refusedBadge)).toBeNull();
  });

  it("une salle PUBLIÉE : le badge « Publiée », et la route du refus n'est PAS appelée (publier efface le motif)", async () => {
    const pub = publicationDouble(JAMAIS);
    await rendreA("/salles/v1?etape=7", pub, SALLE({ publicationStatus: VenuePublicationStatus.PUBLISHED }));
    await elementAttendu(() => screen.queryByText(BADGE.published));
    expect(pub.getPublicationReview).not.toHaveBeenCalled();
    expect(screen.queryByText(FR.noticeTitle)).toBeNull();
  });
});

describe("une PANNE de lecture n'est pas « pas refusée » (D133, D142)", () => {
  it("l'étape « Publication » le dit et propose de réessayer ; l'en-tête garde le badge d'avant (on ne SAIT pas) ; « réessayer » relit", async () => {
    const lire = vi.fn().mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce(REFUSEE);
    await rendreA("/salles/v1?etape=7", { getPublicationReview: lire });

    await elementAttendu(() => screen.queryByText(FR.loadError));
    expect(screen.queryByText(FR.noticeTitle)).toBeNull();
    elementPresent(() => screen.queryByText(BADGE.draft));

    fireEvent.click(elementPresent(() => screen.queryByRole("button", { name: FR.retry })));
    await elementAttendu(() => screen.queryByText(FR.noticeTitle));
    expect(screen.queryByText(FR.loadError)).toBeNull();
    expect(lire).toHaveBeenCalledTimes(2);
  });

  it("une réponse MALFORMÉE (ni objet ni état de publication) est une panne, jamais un « pas refusée »", async () => {
    const lire = vi.fn().mockResolvedValue(undefined);
    await rendreA("/salles/v1?etape=7", { getPublicationReview: lire });
    await elementAttendu(() => screen.queryByText(FR.loadError));
    expect(screen.queryByText(FR.noticeTitle)).toBeNull();
  });

  it("l'avis d'erreur n'est ni une alerte ni un statut : il ne prend pas la place du message d'enregistrement de l'étape", async () => {
    await rendreA("/salles/v1?etape=7", { getPublicationReview: vi.fn().mockRejectedValue(new NetworkError()) });
    const avis = await elementAttendu(() => screen.queryByText(FR.loadError));
    expect(avis.closest("[role='alert'], [role='status']")).toBeNull();
  });
});

describe("l'arabe — la parité, et le sens de l'écriture", () => {
  it("en arabe : le titre, la marque de l'en-tête et l'aide viennent du catalogue ARABE ; le motif reste tel quel", async () => {
    await act(async () => {
      await i18next.changeLanguage("ar");
    });
    await rendreA("/salles/v1?etape=7", publicationDouble(REFUSEE), SALLE(), "ar");
    await elementAttendu(() => screen.queryByText(AR.noticeTitle));
    elementPresent(() => screen.queryByText(AR.refusedBadge));
    elementPresent(() => screen.queryByText(AR.noticeHelp));
    elementPresent(() => screen.queryByText(AR.noticeDate.replace("{date}", formatReviewDate(DATE_ISO, "ar")), { exact: false }));
    expect(elementPresent(() => screen.queryByText(MOTIF)).getAttribute("dir")).toBe("auto");
    expect(screen.queryByText(FR.noticeTitle)).toBeNull();
  });

  it("les deux catalogues portent EXACTEMENT les mêmes clés du bloc `publicationReview`, et aucune n'est vide ni identique au français (« à relire par un humain »)", () => {
    expect(Object.keys(AR).sort()).toEqual(Object.keys(FR).sort());
    for (const cle of Object.keys(FR) as (keyof typeof FR)[]) {
      expect(AR[cle].trim().length, cle).toBeGreaterThan(0);
      expect(AR[cle], `${cle} : un texte arabe identique au français n'est pas traduit`).not.toBe(FR[cle]);
    }
  });
});

describe("le composant reste dans l'étape — il ne déplace rien d'autre", () => {
  it("l'étape « Publication » garde son sélecteur de visibilité et son aide, avec un refus", async () => {
    await rendreA("/salles/v1?etape=7", publicationDouble(REFUSEE));
    await elementAttendu(() => screen.queryByText(FR.noticeTitle));
    elementPresent(() => screen.queryByText(WIZARD.publishHint));
    elementPresent(() => screen.queryByLabelText(messages.fr.venue.ui.status.label));
  });
});
