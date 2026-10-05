// Rang 32 (D325), point 14 — « Enregistrer » à l'étape 7 de l'assistant de salle.
//
// ⚠ LE DÉFAUT (relevé par Ko le 02/10/2026, esquissé dans un correctif mis de côté, D323 : « étape 7 : « Enregistrer » ne faisait RIEN, sans requête ni
// message »). Deux façons de ne rien dire :
//   U-a · le dernier bouton, sans rien de modifié, ne partait nulle part et n'affichait rien — le pro ne savait pas si la salle était à jour ;
//   U-b · un champ d'une AUTRE étape que celle affichée est fautif : l'erreur s'inscrivait sous ce champ, invisible depuis l'étape 7.
// ⚠ ET UN TROISIÈME MODE, écrit pour ne pas le fabriquer en corrigeant : U-c · dire « Modifications enregistrées » alors qu'AUCUNE requête n'est partie
// — l'écran supposerait une écriture (« l'écran dit ce que le serveur a écrit, il ne le suppose pas »). Le message d'un diff vide ne dit donc pas « enregistré ».
//
// ⚠ RÈGLE DES MONTANTS (décision 2 du relecteur, D325) : ce parcours SAISIT un montant (le prix de base). Le test prouve donc que la valeur enregistrée est celle
// saisie — sur le chemin « Suivant » ET sur le chemin « Enregistrer » de la dernière étape. Il ne touche pas la conversion dinars → centimes : il la LIT.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { VenueProDTO } from "@zwadj/types";
import { AppProviders, AppRoutes } from "../App";
import { initI18n } from "../i18n";
import {
  makeAuthDouble,
  makeBookingsProDouble,
  makeQuotesDouble,
  makeReferentialsDouble,
  makeServicesDouble,
  makeVenueClientDouble
} from "../test-support/client-doubles";

initI18n();

const FORM = messages.fr.venue.ui.form;
const WIZARD = messages.fr.venue.ui.wizard;
const STATUT = messages.fr.venue.ui.status;

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
  scrollTo.mockClear();
  // jsdom n'implémente pas `scrollTo` : il l'écrit en erreur de console, que le plafond de console prendrait pour une faute.
  Object.defineProperty(window, "scrollTo", { value: scrollTo, configurable: true, writable: true });
});

/** Rend l'assistant d'édition à l'adresse donnée, le serveur renvoyant `salle` ; `update` rend ce qu'on lui a envoyé, appliqué à la salle. */
async function rendreA(chemin: string, salle: VenueProDTO = SALLE()) {
  const update = vi.fn().mockImplementation(async (_id: string, donnees: Partial<VenueProDTO>) => ({ ...salle, ...donnees }));
  const venues = makeVenueClientDouble(salle, { update });
  render(
    <MemoryRouter initialEntries={[chemin]}>
      <AppProviders
        client={makeAuthDouble()}
        venues={venues}
        referentials={makeReferentialsDouble()}
        bookingsPro={makeBookingsProDouble()}
        servicesClient={makeServicesDouble()}
        quotesClient={makeQuotesDouble()}
      >
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>
  );
  // L'assistant s'affiche une fois la salle lue ET les référentiels chargés : on attend son titre d'étape.
  await screen.findByRole("heading", { name: chemin.includes("etape=7") ? WIZARD.step7 : WIZARD.step1 });
  return { update };
}
const enregistrer = () => screen.getByRole("button", { name: FORM.save });

describe("Point 14 — « Enregistrer » à la dernière étape dit TOUJOURS ce qu'il a fait", () => {
  it("U-a : sans rien de modifié, aucune requête ne part — et l'écran le DIT, au lieu de se taire", async () => {
    const { update } = await rendreA("/salles/v1?etape=7");
    fireEvent.click(enregistrer());
    const message = await screen.findByRole("status");
    expect(message).toHaveTextContent(FORM.nothingToSave);
    expect(update).not.toHaveBeenCalled();
    // Elle remonte en haut de page, où le message se lit (le bouton est au pied d'une page longue).
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("⚠ U-c : le message d'un diff vide ne dit PAS « enregistré » — rien n'a été écrit, l'écran ne le suppose pas", async () => {
    await rendreA("/salles/v1?etape=7");
    fireEvent.click(enregistrer());
    const message = await screen.findByRole("status");
    expect(message.textContent).not.toBe(FORM.saved);
    expect(FORM.nothingToSave).not.toBe(FORM.saved);
    expect(message.textContent).not.toMatch(/enregistrées/);
  });

  it("U-b : un champ fautif d'une AUTRE étape (ici le prix, à l'étape 1) — l'étape 7 le DIT, rien n'est envoyé", async () => {
    // 12 345 centimes = 123,45 DA : pas un dinar entier. Le contrat de l'interface refuse (`parseIntegerPrice`), l'étape 7 n'a aucun champ de prix.
    const { update } = await rendreA("/salles/v1?etape=7", SALLE({ basePriceCents: 12_345 }));
    fireEvent.click(enregistrer());
    // Verdict en assertion NATIVE dans un `waitFor` : `findByRole` lève une erreur de REQUÊTE quand l'alerte n'arrive jamais, pas une assertion (D304, D316).
    await waitFor(() => expect(screen.queryAllByRole("alert").some((e) => (e.textContent ?? "").includes(WIZARD.step1Invalid))).toBe(true));
    expect(update).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("⚠ RÈGLE DES MONTANTS (point 14, étape 7) : une modification faite À l'étape 7 part, telle que saisie, et le message dit « enregistré »", async () => {
    const { update } = await rendreA("/salles/v1?etape=7");
    fireEvent.change(screen.getByLabelText(STATUT.label), { target: { value: "HIDDEN" } });
    fireEvent.click(enregistrer());
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("v1", { status: "HIDDEN" });
    expect(await screen.findByRole("status")).toHaveTextContent(FORM.saved);
  });

  it("⚠ RÈGLE DES MONTANTS (saisie du prix) : le prix tapé en dinars part en centimes, EXACTEMENT — « Suivant » enregistre ce qui est saisi", async () => {
    const { update } = await rendreA("/salles/v1?etape=1");
    const prix = screen.getByLabelText(FORM.basePrice) as HTMLInputElement;
    fireEvent.change(prix, { target: { value: "1500000" } });
    fireEvent.click(screen.getByRole("button", { name: WIZARD.next }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    // 1 500 000 DA = 150 000 000 centimes (1 DA = 100 centimes, `roundToDinar` / D195) — la seule clé envoyée est celle qui a changé.
    expect(update).toHaveBeenCalledWith("v1", { basePriceCents: 1_500_000 * 100 });
  });

  it("⚠ un prix décimal est REFUSÉ, jamais tronqué : rien ne part (rejet décimal strict)", async () => {
    const { update } = await rendreA("/salles/v1?etape=1");
    fireEvent.change(screen.getByLabelText(FORM.basePrice), { target: { value: "150000.5" } });
    fireEvent.click(screen.getByRole("button", { name: WIZARD.next }));
    await screen.findByText(messages.fr.venue.validation.basePriceInteger);
    expect(update).not.toHaveBeenCalled();
  });
});
