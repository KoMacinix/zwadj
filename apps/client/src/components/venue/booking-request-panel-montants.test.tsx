// FC-6 (session `front-client`) — DANS UNE PAGE ARABE, LE PANNEAU DE DEMANDE MET SES MONTANTS EN FORME EN `ar-DZ`.
//
// ⚠ LE DÉFAUT QU'ELLE FERME. Le panneau appelait `formatDZD(cents)` SANS langue : le prix d'un créneau, d'une prestation, d'un
// palier, le total et l'acompte s'affichaient en format français (« 200 000 DA ») au milieu d'une page arabe. Arbitrage de Ko du
// 04/10/2026 : « Les dates et les nombres en arabe se formatent en ar-DZ. »
// ⚠ CE QU'ELLE MESURE — la règle des montants en plus (D325) : le montant affiché est CELUI DU SERVEUR (le prix du créneau, rendu
// par le double de `fetch` ; celui d'une prestation, venu de son DTO), dans la langue de la page. L'attendu vient de `formatDZD`
// (D209 n° 6), jamais d'une chaîne tapée. ⚠ L'ACOMPTE n'est pas comparé : c'est l'aperçu recalculé dans le navigateur
// (`previewDeposit`, hors de cette session) — FC-6 n'en change que la langue d'affichage.
// Fichier NEUF : la garde des sorties de console (`test-setup.ts`) n'y tolère AUCUN avertissement.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { formatDZD, messages } from "@zwadj/i18n";
import type { BookingsClient } from "@zwadj/api-client";
import { ServicePricingType, type ServiceDTO } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { longDate } from "../../lib/booking-calendar";
import { BookingRequestPanel } from "./booking-request-panel";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));

/** Le prix du créneau, tel que le SERVEUR le rend (`/availability`). */
const PRIX_DU_CRENEAU = 20_000_000;
/** Le prix de la prestation, tel que son DTO le porte. */
const PRIX_DE_LA_PRESTATION = 5_000_000;

const DISPONIBILITES = {
  venueId: "v1",
  slug: "salle-el-ryad",
  bookingMode: "MULTI_SLOT",
  from: "2027-08-02",
  to: "2027-08-31",
  slots: [{ id: "s1", nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 }],
  days: [{ date: "2027-08-15", isHoliday: false, slots: [{ slotTemplateId: "s1", status: "AVAILABLE", priceCents: PRIX_DU_CRENEAU }] }]
};

const PRESTATIONS: ServiceDTO[] = [
  {
    venueId: "v1",
    id: "p1",
    sortOrder: 0,
    nameFr: "Traiteur",
    nameAr: "ممون الحفلات",
    descriptionFr: null,
    descriptionAr: null,
    isActive: true,
    pricingType: ServicePricingType.FIXED,
    fixedPriceCents: PRIX_DE_LA_PRESTATION,
    perGuestPriceCents: null,
    perUnitPriceCents: null,
    unitNameFr: null,
    unitNameAr: null,
    minUnits: null,
    maxUnits: null,
    tiers: []
  }
];

const NOW = Date.parse("2027-08-01T09:00:00Z");
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
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

function rendre(locale: "fr" | "ar") {
  const auth = { bootstrap: vi.fn().mockResolvedValue(null), login: vi.fn(), logout: vi.fn(), raw: vi.fn() } as unknown as AuthClient;
  const client: BookingsClient = { create: vi.fn(), listMine: vi.fn().mockResolvedValue([]), cancel: vi.fn() };
  render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <AuthProvider client={auth}>
        <BookingRequestPanel slug="salle-el-ryad" depositRateBps={3000} depositAmountCents={null} services={PRESTATIONS} client={client} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

/** Le 15 août ouvert, son créneau CHOISI, comme un visiteur ; rend le texte du créneau. */
async function choisirLeCreneau(locale: "fr" | "ar"): Promise<string> {
  const jour = await screen.findByRole("button", { name: messages[locale].venueDetail.booking.dayFree.replace("{date}", longDate("2027-08-15", locale)) });
  fireEvent.click(jour);
  const groupe = await screen.findByRole("group", { name: messages[locale].venueDetail.calendar.slotsFor.replace("{date}", longDate("2027-08-15", locale)) });
  const creneau = within(groupe).getAllByRole("button")[0]!;
  fireEvent.click(creneau);
  return creneau.textContent ?? "";
}

/** Le texte de la ligne « total — acompte », une fois le créneau choisi. */
function ligneDuTotal(locale: "fr" | "ar"): string {
  const debut = messages[locale].venueDetail.booking.total.split("{amount}")[0]!;
  const ligne = screen.getAllByText((_, el) => el?.tagName === "P" && (el.textContent ?? "").startsWith(debut));
  return ligne[0]?.textContent ?? "";
}

describe("FC-6 — page ARABE : les montants du serveur, en ar-DZ", () => {
  it("calibration : la forme arabe et la forme française du même montant diffèrent (sinon rien ici ne mesure)", () => {
    expect(formatDZD(PRIX_DU_CRENEAU, "ar")).not.toBe(formatDZD(PRIX_DU_CRENEAU, "fr"));
  });

  it("le prix du créneau", async () => {
    rendre("ar");
    const texte = await choisirLeCreneau("ar");
    expect(texte.includes(formatDZD(PRIX_DU_CRENEAU, "ar"))).toBe(true);
    expect(texte.includes(formatDZD(PRIX_DU_CRENEAU, "fr"))).toBe(false);
  });

  it("le prix d'une prestation, à côté de sa case", async () => {
    rendre("ar");
    await choisirLeCreneau("ar");
    const libelle = screen.getAllByRole("checkbox").map((c) => c.closest("label")?.textContent ?? "").find((l) => l.includes("ممون الحفلات")) ?? "";
    expect(libelle.includes(formatDZD(PRIX_DE_LA_PRESTATION, "ar"))).toBe(true);
    expect(libelle.includes(formatDZD(PRIX_DE_LA_PRESTATION, "fr"))).toBe(false);
  });

  it("le total, sans prestation choisie : le prix du créneau du serveur", async () => {
    rendre("ar");
    await choisirLeCreneau("ar");
    const ligne = ligneDuTotal("ar");
    expect(ligne.includes(formatDZD(PRIX_DU_CRENEAU, "ar"))).toBe(true);
    expect(ligne.includes(formatDZD(PRIX_DU_CRENEAU, "fr"))).toBe(false);
  });
});

describe("FC-6 — page FRANÇAISE : rien ne change", () => {
  it("le prix du créneau et le total, en format français", async () => {
    rendre("fr");
    const texte = await choisirLeCreneau("fr");
    expect(texte.includes(formatDZD(PRIX_DU_CRENEAU, "fr"))).toBe(true);
    expect(ligneDuTotal("fr").includes(formatDZD(PRIX_DU_CRENEAU, "fr"))).toBe(true);
  });
});
