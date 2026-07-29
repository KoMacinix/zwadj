// Tests du CALENDRIER de disponibilité (Lot B5, D56). Les pièges :
//  - la grille suit la semaine ALGÉRIENNE (dimanche en tête, vendredi-samedi
//    en queue) même rendue en français : la locale `fr` répondrait « lundi »,
//    et CLDR pour ar-DZ répondrait « samedi » — on suit l'usage réel ;
//  - le prix affiché est le minimum des créneaux RÉELLEMENT libres — afficher
//    le minimum tous statuts confondus annoncerait un prix inaccessible ;
//  - les quatre états sont NOMMÉS, y compris REQUESTED : une demande ne
//    verrouille rien, mais la taire produirait la pire surprise au devis ;
//  - les jours passés restent dans la grille (sinon les colonnes sautent) mais
//    ne sont pas cliquables ;
//  - la navigation est bornée : pas de mois avant le mois courant.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import messages from "@zwadj/i18n/messages/fr.json";
import type { VenueAvailabilityResponse } from "@zwadj/types";
import { AvailabilityCalendar } from "./availability-calendar";

const getVenueAvailability = vi.fn<(...a: unknown[]) => Promise<VenueAvailabilityResponse | null>>();
vi.mock("../../lib/api", () => ({ getVenueAvailability: (...a: unknown[]) => getVenueAvailability(...a) }));

const SOIREE = { id: "s1", nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 };
const MATIN = { id: "s2", nameFr: "Matinée", nameAr: "صباحية", startMinutes: 600, endMinutes: 900 };

function response(days: VenueAvailabilityResponse["days"]): VenueAvailabilityResponse {
  return {
    venueId: "v1",
    slug: "salle-el-ryad",
    bookingMode: "MULTI_SLOT",
    from: days[0]?.date ?? "2027-08-01",
    to: days.at(-1)?.date ?? "2027-08-31",
    slots: [MATIN, SOIREE],
    days
  };
}

const day = (date: string, slots: VenueAvailabilityResponse["days"][number]["slots"], isHoliday = false) => ({
  date,
  isHoliday,
  slots
});

function renderCalendar() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AvailabilityCalendar slug="salle-el-ryad" />
    </NextIntlClientProvider>
  );
}

// ⚠ PAS de `vi.useFakeTimers()` ici : `waitFor` de testing-library s'appuie
// sur de vrais timers et se bloquerait jusqu'au délai d'expiration. Le
// composant ne lit l'horloge QU'UNE fois (`useRef(Date.now())`), donc un espion
// sur `Date.now` suffit — et il fige « aujourd'hui » au 14 août 2027, pour que
// les tests ne dépendent pas du jour où ils tournent.
const NOW = Date.parse("2027-08-14T09:00:00Z");

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  getVenueAvailability.mockReset();
  getVenueAvailability.mockResolvedValue(response([]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const grid = () => screen.getByRole("table");

describe("Calendrier — la semaine algérienne (D56)", () => {
  it("la première colonne est DIMANCHE, même en français", async () => {
    renderCalendar();
    await waitFor(() => expect(getVenueAvailability).toHaveBeenCalled());
    const headers = within(grid()).getAllByRole("columnheader").map((th) => th.textContent);
    // Dimanche ouvre (1er jour ouvré), samedi ferme : le repos hebdomadaire
    // clôt la ligne. La locale `fr` seule aurait mis lundi en tête.
    expect(headers[0]).toBe("dim.");
    expect(headers.at(-1)).toBe("sam.");
  });

  it("la fenêtre demandée couvre le mois courant à Alger", async () => {
    renderCalendar();
    await waitFor(() => expect(getVenueAvailability).toHaveBeenCalled());
    expect(getVenueAvailability).toHaveBeenCalledWith("salle-el-ryad", "2027-08-01", "2027-08-31");
  });
});

describe("Calendrier — prix affiché", () => {
  it("montre le minimum des créneaux RÉELLEMENT libres, pas tous statuts confondus", async () => {
    getVenueAvailability.mockResolvedValue(
      response([
        day("2027-08-20", [
          { slotTemplateId: "s2", status: "BOOKED", priceCents: 12_000_000 },
          { slotTemplateId: "s1", status: "AVAILABLE", priceCents: 20_000_000 }
        ])
      ])
    );
    renderCalendar();
    // 120 000 DA est réservé : annoncer ce prix serait annoncer l'inaccessible.
    await waitFor(() => expect(grid().textContent).toContain("200"));
    expect(grid().textContent).not.toContain("120 000");
  });

  it("un jour sans créneau libre n'est pas cliquable", async () => {
    getVenueAvailability.mockResolvedValue(
      response([day("2027-08-20", [{ slotTemplateId: "s1", status: "BLOCKED", priceCents: 20_000_000 }])])
    );
    renderCalendar();
    await waitFor(() => expect(getVenueAvailability).toHaveBeenCalled());
    const cell = within(grid()).getByRole("button", { name: /^20/ });
    expect(cell).toBeDisabled();
  });
});

describe("Calendrier — jours passés", () => {
  it("restent dans la grille mais sont désactivés : les retirer ferait sauter les colonnes", async () => {
    getVenueAvailability.mockResolvedValue(response([]));
    renderCalendar();
    await waitFor(() => expect(getVenueAvailability).toHaveBeenCalled());
    // Le 13 août 2027 est la veille de « aujourd'hui » figé au 14.
    const past = within(grid()).getByRole("button", { name: /^13/ });
    expect(past).toBeDisabled();
    expect(past).toBeInTheDocument();
  });
});

describe("Calendrier — sélection et états", () => {
  it("les QUATRE états sont nommés, REQUESTED compris", async () => {
    getVenueAvailability.mockResolvedValue(
      response([
        day("2027-08-20", [
          { slotTemplateId: "s2", status: "REQUESTED", priceCents: 12_000_000 },
          { slotTemplateId: "s1", status: "AVAILABLE", priceCents: 20_000_000 }
        ])
      ])
    );
    renderCalendar();
    await waitFor(() => expect(getVenueAvailability).toHaveBeenCalled());
    fireEvent.click(within(grid()).getByRole("button", { name: /^20/ }));

    const panel = await screen.findByRole("list");
    expect(panel.textContent).toContain("Demande en cours");
    expect(panel.textContent).toContain("Disponible");
    expect(panel.textContent).toContain("Soirée");
  });
});

describe("Calendrier — navigation bornée", () => {
  it("on ne peut pas remonter avant le mois courant", async () => {
    renderCalendar();
    await waitFor(() => expect(getVenueAvailability).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Mois précédent" })).toBeDisabled();
  });

  it("avancer d'un mois redemande la bonne fenêtre", async () => {
    renderCalendar();
    await waitFor(() => expect(getVenueAvailability).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Mois suivant" }));
    await waitFor(() =>
      expect(getVenueAvailability).toHaveBeenLastCalledWith("salle-el-ryad", "2027-09-01", "2027-09-30")
    );
  });
});

describe("Calendrier — API injoignable", () => {
  it("affiche une erreur au lieu de casser la fiche", async () => {
    getVenueAvailability.mockResolvedValue(null);
    renderCalendar();
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
