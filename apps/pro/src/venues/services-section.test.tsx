// Catalogue de prestations côté PRO — Lot E2c.
//
// Ce qui se prouve ici : que le corps envoyé DÉPEND du type (l'union est
// discriminée, un champ étranger fait échouer la requête), et que
// l'avertissement PER_GUEST est bien à l'écran — c'est lui qui évite l'erreur la
// plus chère de la page.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ServicesClient } from "@zwadj/api-client";
import type { ServiceDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeVenueClientDouble, makeServicesDouble } from "../test-support/client-doubles";
import { ServicesSection } from "./services-section";

initI18n();

const FIXED: ServiceDTO = {
  id: "s1",
  venueId: "v1",
  nameFr: "Décoration florale",
  nameAr: "زينة",
  descriptionFr: null,
  descriptionAr: null,
  pricingType: "FIXED",
  isActive: true,
  sortOrder: 0,
  fixedPriceCents: 5_000_000,
  perGuestPriceCents: null,
  perUnitPriceCents: null,
  unitNameFr: null,
  unitNameAr: null,
  minUnits: null,
  maxUnits: null,
  tiers: []
};

function setup(rows: ServiceDTO[], overrides: Partial<ServicesClient> = {}) {
  const client = makeServicesDouble({ listForVenue: vi.fn().mockResolvedValue(rows), ...overrides });
  render(
    <MemoryRouter>
      <AppProviders client={makeAuthDouble()} venues={makeVenueClientDouble()} servicesClient={client}>
        <ServicesSection venueId="v1" />
      </AppProviders>
    </MemoryRouter>
  );
  return client;
}

const type = (label: RegExp | string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

/** La prestation, telle que l'API la rend APRÈS retrait. */
const RETIRE: ServiceDTO = { ...FIXED, isActive: false };

/** ⚠ UN DOUBLE QUI NE BOUGE JAMAIS REND L'ÉCRAN INOBSERVABLE. `run()` et
 *  `submit()` rechargent la liste après l'action ; si le double rend deux fois
 *  la même chose, l'écran ne change pas et il ne reste plus rien à attendre —
 *  c'est exactement ce qui poussait ces tests à assertir sur le mock, et donc à
 *  finir AVANT la fin des mises à jour. On rend au rechargement ce qu'une vraie
 *  API rendrait. */
const rechargeVers = (avant: ServiceDTO[], apres: ServiceDTO[]) =>
  vi.fn().mockResolvedValueOnce(avant).mockResolvedValue(apres);

/** L'écran a fini de retomber : la ligne rechargée est là, ET ses boutons sont
 *  réactivés — or ils portent `disabled={busy}`, et `setBusy(false)` est la
 *  DERNIÈRE mise à jour de la chaîne. Attendre la ligne seule ne suffirait
 *  pas : `setRows` la fait paraître un tour AVANT. */
async function attendreEcranRetombe(nomLigne: string): Promise<void> {
  await screen.findByText(nomLigne);
  await waitFor(() => expect(screen.getByRole("button", { name: "Retirer de la vente" })).toBeEnabled());
}

describe("Catalogue pro — l'avertissement qui évite l'erreur la plus chère", () => {
  it("PER_GUEST affiche que le montant sera MULTIPLIÉ par les invités", async () => {
    setup([]);
    await screen.findByText(/Aucune prestation/);
    fireEvent.change(screen.getByLabelText(/Tarification/), { target: { value: "PER_GUEST" } });
    // ⚠ `findByText` et non `getByText` : l'attente rend la main à React avant
    // la fin du test. Une assertion synchrone termine à l'instant où elle
    // passe, et laisse retomber après coup ce qui traîne — d'où un `act(…)`
    // tantôt présent, tantôt absent, sur un fichier NON exempté.
    expect(await screen.findByText(/MULTIPLIÉ par le nombre d'invités/)).toBeInTheDocument();
  });

  it("l'avertissement n'apparaît PAS sur un forfait", async () => {
    setup([]);
    await screen.findByText(/Aucune prestation/);
    expect(screen.queryByText(/MULTIPLIÉ/)).toBeNull();
  });
});

describe("Catalogue pro — le corps dépend du TYPE", () => {
  it("FIXED n'envoie que `fixedPriceCents`", async () => {
    const client = setup([], { listForVenue: rechargeVers([], [{ ...FIXED, nameFr: "Déco" }]) });
    await screen.findByText(/Aucune prestation/);
    type(/Nom \(français\)/, "Déco");
    type(/Nom \(arabe\)/, "زينة");
    type(/^Prix/, "50000");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter la prestation" }));
    await attendreEcranRetombe("Déco");
    expect(client.create).toHaveBeenCalledWith("v1", {
      pricingType: "FIXED",
      nameFr: "Déco",
      nameAr: "زينة",
      fixedPriceCents: 5_000_000
    });
  });

  it("PER_UNIT exige l'unité dans les DEUX langues avant d'être envoyable", async () => {
    setup([]);
    await screen.findByText(/Aucune prestation/);
    fireEvent.change(screen.getByLabelText(/Tarification/), { target: { value: "PER_UNIT" } });
    type(/Nom \(français\)/, "Tables");
    type(/Nom \(arabe\)/, "طاولات");
    type(/^Prix/, "3000");
    // Sans unité, le bouton reste inerte : la base l'exige, l'écran le dit avant.
    expect(screen.getByRole("button", { name: "Ajouter la prestation" })).toBeDisabled();
    type(/Unité \(français\)/, "table");
    type(/Unité \(arabe\)/, "طاولة");
    expect(screen.getByRole("button", { name: "Ajouter la prestation" })).toBeEnabled();
  });

  it("TIERED envoie un premier palier : un TIERED sans palier est inchoisissable", async () => {
    const client = setup([], { listForVenue: rechargeVers([], [{ ...FIXED, nameFr: "Menu" }]) });
    await screen.findByText(/Aucune prestation/);
    fireEvent.change(screen.getByLabelText(/Tarification/), { target: { value: "TIERED" } });
    type(/Nom \(français\)/, "Menu");
    type(/Nom \(arabe\)/, "قائمة");
    type(/^Prix/, "80000");
    type(/Première formule \(français\)/, "Standard");
    type(/Première formule \(arabe\)/, "عادي");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter la prestation" }));
    await attendreEcranRetombe("Menu");
    expect(client.create).toHaveBeenCalledWith("v1", {
      pricingType: "TIERED",
      nameFr: "Menu",
      nameAr: "قائمة",
      tiers: [{ labelFr: "Standard", labelAr: "عادي", priceCents: 8_000_000 }]
    });
  });
});

describe("Catalogue pro — retirer n'est pas supprimer", () => {
  it("le retrait de la vente est proposé en PREMIER, et il est réversible", async () => {
    const client = setup([FIXED], { listForVenue: rechargeVers([FIXED], [RETIRE]) });
    fireEvent.click(await screen.findByRole("button", { name: "Retirer de la vente" }));
    // ⚠ ON ATTEND L'ÉCRAN, PAS L'APPEL. `run()` enchaîne `update` → `load`
    // → `setBusy(false)` ; s'arrêter à l'appel laissait trois états tomber
    // APRÈS la fin du test. Le bouton redétenu prouve la première moitié,
    // sa réactivation prouve la DERNIÈRE mise à jour de la chaîne.
    const remettre = await screen.findByRole("button", { name: "Remettre en vente" });
    await waitFor(() => expect(remettre).toBeEnabled());
    // Le contrat reste mesuré — on ne l'a pas échangé contre l'apparence.
    expect(client.update).toHaveBeenCalledWith("s1", { isActive: false });
  });

  it("une prestation retirée propose de la REMETTRE en vente", async () => {
    setup([{ ...FIXED, isActive: false }]);
    expect(await screen.findByRole("button", { name: "Remettre en vente" })).toBeInTheDocument();
    expect(screen.getByText(/Retirée de la vente/)).toBeInTheDocument();
  });

  // ⚠ CE TEST-CI N'A PAS BESOIN DE LA MÊME CORRECTION, et la raison mérite
  // d'être écrite plutôt que devinée au prochain passage. Sur le chemin
  // d'ERREUR, `run()` ne recharge pas : `catch { setError(…) }` puis
  // `finally { setBusy(false) }` sont dans la MÊME continuation synchrone,
  // donc groupés en un seul rendu. Quand l'alerte paraît, `busy` est déjà
  // retombé — il n'y a pas de queue qui dépasse.
  it("un refus de suppression s'affiche au lieu de disparaître", async () => {
    setup([FIXED], {
      remove: vi.fn().mockRejectedValue({ code: "SERVICE_IN_USE", message: "service.errors.inUse" })
    });
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
