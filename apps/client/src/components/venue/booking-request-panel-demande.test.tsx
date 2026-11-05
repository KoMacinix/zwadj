// FC-4 (session `front-client`) — LE JOUR ET LE CRÉNEAU DÉJÀ DEMANDÉS (REQUESTED) SE CHOISISSENT, AVEC UN AVIS.
//
// ⚠ L'ARBITRAGE (Ko, 04/10/2026, mot pour mot) : « Le jour déjà demandé (`REQUESTED`) devient sélectionnable, avec un avis
// indiquant que d'autres demandes sont en attente. Motif : l'API accepte plusieurs demandes sur une même date, et le pro voit le
// conflit. Bloquer la date sur une simple demande fait perdre des demandes. » Décision du relecteur : le créneau suit le jour.
//
// ⚠ CE QUE REQUESTED VEUT DIRE, RELEVÉ DANS LE MOTEUR (`apps/api/src/venues/availability-engine.ts`) : au moins une demande
// PENDING dont la plage HORAIRE recouvre le créneau ; « elle ne verrouille RIEN ». BOOKED (verrou dur) et BLOCKED (fermé par le
// pro) restent fermés. L'avis dit donc ce que la donnée porte — d'AUTRES demandes que celle qu'on s'apprête à envoyer.
//
// ⚠ LE PRIX : celui que le SERVEUR rend pour ce créneau à cette date (`priceCents` de la disponibilité) — l'écran ne le calcule
// pas, il l'affiche (règle des montants, D325) ; le test l'exige égal au formateur appliqué à la valeur du serveur.
// Fichier NEUF : la garde des sorties de console n'y tolère aucun avertissement — chaque attente porte sur la donnée rendue.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { formatDZD, messages } from "@zwadj/i18n";
import type { BookingsClient } from "@zwadj/api-client";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { longDate } from "../../lib/booking-calendar";
import { BookingRequestPanel } from "./booking-request-panel";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));

const M = messages.fr.venueDetail.booking;
const C = messages.fr.venueDetail.calendar;
const PRIX_DEMANDE = 23_500_000;

const DISPONIBILITES = {
  venueId: "v1",
  slug: "salle-el-ryad",
  bookingMode: "MULTI_SLOT",
  from: "2027-08-02",
  to: "2027-08-31",
  slots: [
    { id: "s1", nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 },
    { id: "s2", nameFr: "Après-midi", nameAr: "بعد الظهر", startMinutes: 840, endMinutes: 1080 }
  ],
  days: [
    { date: "2027-08-15", isHoliday: false, slots: [
      { slotTemplateId: "s1", status: "AVAILABLE", priceCents: 20_000_000 }, { slotTemplateId: "s2", status: "BOOKED", priceCents: 9_000_000 }] },
    // Seulement DEMANDÉ : aucun créneau libre, un créneau déjà demandé — le cas que l'arbitrage ouvre.
    { date: "2027-08-16", isHoliday: false, slots: [
      { slotTemplateId: "s1", status: "REQUESTED", priceCents: PRIX_DEMANDE }, { slotTemplateId: "s2", status: "BLOCKED", priceCents: 9_000_000 }] },
    // RÉSERVÉ et FERMÉ : rien ne s'ouvre.
    { date: "2027-08-17", isHoliday: false, slots: [
      { slotTemplateId: "s1", status: "BOOKED", priceCents: 20_000_000 }, { slotTemplateId: "s2", status: "BLOCKED", priceCents: 9_000_000 }] }
  ]
};

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2027-08-01T09:00:00Z"));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const from = url.searchParams.get("from") ?? "";
      const to = url.searchParams.get("to") ?? "";
      const days = DISPONIBILITES.days.filter((d) => d.date >= from && d.date <= to);
      return { ok: true, status: 200, json: () => Promise.resolve({ ...DISPONIBILITES, from, to, days }) } as unknown as Response;
    })
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function rendre() {
  const auth = { bootstrap: vi.fn().mockResolvedValue(null), login: vi.fn(), logout: vi.fn(), raw: vi.fn() } as unknown as AuthClient;
  const client: BookingsClient = { create: vi.fn(), listMine: vi.fn().mockResolvedValue([]), cancel: vi.fn() };
  render(
    <NextIntlClientProvider locale="fr" messages={messages.fr}>
      <AuthProvider client={auth}>
        <BookingRequestPanel slug="salle-el-ryad" depositRateBps={3000} depositAmountCents={null} client={client} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

// ⚠ Les clés neuves (`dayRequested`, `requested`, `requestedNotice`) n'existent pas AVANT le code : lues avec un repli, pour que
// le rouge de l'état d'avant se lise comme une ASSERTION (D304, D316), jamais comme une erreur de requête ou un plantage.
const CLE = (valeur: string | undefined) => valeur ?? "§ clé absente du catalogue §";
const nom = (message: string | undefined, date: string) => CLE(message).replace("{date}", longDate(date, "fr"));

/** Le bouton d'un JOUR, trouvé par son NUMÉRO dans la grille — pas par son nom, qui est précisément ce qui change. */
async function jourNumero(numero: string): Promise<HTMLElement> {
  const grille = await screen.findByRole("grid");
  const bouton = within(grille).getAllByRole("button").find((b) => b.textContent === numero);
  expect(bouton).toBeDefined();
  return bouton!;
}

/** Ouvrir un jour comme un visiteur ; l'attente porte sur le groupe de ses créneaux, en assertion NATIVE. */
async function ouvrir(numero: string, date: string): Promise<HTMLElement> {
  fireEvent.click(await jourNumero(numero));
  await waitFor(() => expect(screen.queryByRole("group", { name: nom(C.slotsFor, date) })).not.toBeNull());
  return screen.getByRole("group", { name: nom(C.slotsFor, date) });
}

describe("FC-4 — le JOUR seulement demandé se choisit, et son nom le dit", () => {
  it("le 16 (un créneau demandé, un fermé) : choisissable, nommé « demandes en attente »", async () => {
    rendre();
    const jour = await jourNumero("16");
    expect(jour.hasAttribute("disabled")).toBe(false);
    expect(jour.getAttribute("aria-label")).toBe(nom(M.dayRequested, "2027-08-16"));
  });

  it("le 17 (réservé et fermé) : reste inactif, nommé « indisponible »", async () => {
    rendre();
    const jour = await jourNumero("17");
    expect(jour.hasAttribute("disabled")).toBe(true);
    expect(jour.getAttribute("aria-label")).toBe(nom(M.dayFull, "2027-08-17"));
  });
});

describe("FC-4 — le CRÉNEAU demandé se choisit (il suit le jour), avec un avis", () => {
  it("le créneau demandé est actif, et son libellé dit « demandes en attente »", async () => {
    rendre();
    const groupe = await ouvrir("16", "2027-08-16");
    const soiree = within(groupe).getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Soirée"));
    expect(soiree?.hasAttribute("disabled")).toBe(false);
    expect((soiree?.textContent ?? "").includes(CLE(M.requested))).toBe(true);
  });

  it("le créneau FERMÉ du même jour reste inactif", async () => {
    rendre();
    const groupe = await ouvrir("16", "2027-08-16");
    const apresMidi = within(groupe).getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Après-midi"));
    expect(apresMidi?.hasAttribute("disabled")).toBe(true);
  });

  it("le choisir fait paraître l'AVIS : d'autres demandes sont en attente", async () => {
    rendre();
    const groupe = await ouvrir("16", "2027-08-16");
    fireEvent.click(within(groupe).getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Soirée"))!);
    await waitFor(() => expect(screen.queryByText(CLE(M.requestedNotice))).not.toBeNull());
    expect(screen.getByText(CLE(M.requestedNotice)).getAttribute("role")).toBe("status");
  });

  it("le prix affiché du créneau demandé est celui du SERVEUR (formaté, jamais recalculé)", async () => {
    rendre();
    const groupe = await ouvrir("16", "2027-08-16");
    const soiree = within(groupe).getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Soirée"));
    expect((soiree?.textContent ?? "").includes(formatDZD(PRIX_DEMANDE))).toBe(true);
  });

  it("un créneau LIBRE choisi n'affiche PAS l'avis", async () => {
    rendre();
    const groupe = await ouvrir("15", "2027-08-15");
    fireEvent.click(within(groupe).getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Soirée"))!);
    await waitFor(() => expect(screen.queryByText(new RegExp(`^${M.chosen.split("{date}")[0]}`))).not.toBeNull());
    expect(screen.queryByText(CLE(M.requestedNotice))).toBeNull();
  });
});
