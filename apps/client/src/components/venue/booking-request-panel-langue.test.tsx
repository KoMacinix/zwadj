// FC-3 (session `front-client`) — LE PANNEAU DE DEMANDE PARLE LA LANGUE DE LA PAGE.
//
// ⚠ LE DÉFAUT QU'ELLE FERME. Le panneau lisait `nameFr`, `labelFr`, `unitNameFr` (et le nom du créneau, `nameFr`) quelle que soit
// la langue : en arabe, « Soirée », « Traiteur », « Formule or », « par table » au milieu d'une page RTL. Les DTO portent l'arabe.
//
// ⚠ CE QU'ELLE MESURE : en arabe, CHAQUE nom vient de son champ arabe (créneau, prestation, unité, palier) ; le repli sur le
// français n'a lieu que si l'arabe est VIDE, et il se DIT (`lang="fr"` et `dir="ltr"` sur le texte) ; en français, rien ne
// change. Fichier NEUF : la garde des sorties de console (`test-setup.ts`) n'y tolère AUCUN avertissement — chaque attente porte
// sur la donnée rendue, jamais sur un délai.
// ⚠ AFFICHAGE SEUL : aucun montant n'est calculé ni comparé ici (décision du relecteur pour FC-3).
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { BookingsClient } from "@zwadj/api-client";
import { ServicePricingType, type ServiceDTO } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { longDate } from "../../lib/booking-calendar";
import { BookingRequestPanel } from "./booking-request-panel";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));

const DISPONIBILITES = {
  venueId: "v1",
  slug: "salle-el-ryad",
  bookingMode: "MULTI_SLOT",
  from: "2027-08-02",
  to: "2027-08-31",
  slots: [
    { id: "s1", nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 },
    // Un créneau dont l'arabe est VIDE (donnée héritée) : le repli se mesure ici.
    { id: "s2", nameFr: "Après-midi", nameAr: "  ", startMinutes: 840, endMinutes: 1080 }
  ],
  days: [
    {
      date: "2027-08-15",
      isHoliday: false,
      slots: [
        { slotTemplateId: "s1", status: "AVAILABLE", priceCents: 20_000_000 },
        { slotTemplateId: "s2", status: "AVAILABLE", priceCents: 10_000_000 }
      ]
    }
  ]
};

function fetchDouble() {
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
}

/** Le tronc commun d'une prestation, TYPÉ par le contrat (`ServiceDTO`) : un `as const` rendait `tiers` en lecture seule, et le
 *  fichier ne compilait pas — vitest transpile sans typer (AGENTS.md). */
const base: Omit<ServiceDTO, "id" | "sortOrder" | "nameFr" | "nameAr" | "pricingType"> = { venueId: "v1", descriptionFr: null,
  descriptionAr: null, isActive: true, fixedPriceCents: null, perGuestPriceCents: null, perUnitPriceCents: null, unitNameFr: null,
  unitNameAr: null, minUnits: null, maxUnits: null, tiers: [] };
const PRESTATIONS: ServiceDTO[] = [
  { ...base, id: "p1", sortOrder: 0, nameFr: "Traiteur", nameAr: "ممون الحفلات", pricingType: ServicePricingType.FIXED, fixedPriceCents: 5_000_000 },
  { ...base, id: "p2", sortOrder: 1, nameFr: "Tables rondes", nameAr: "طاولات مستديرة", pricingType: ServicePricingType.PER_UNIT,
    perUnitPriceCents: 200_000, unitNameFr: "par table", unitNameAr: "للطاولة", minUnits: 1, maxUnits: 50 },
  { ...base, id: "p3", sortOrder: 2, nameFr: "Décoration", nameAr: "تزيين", pricingType: ServicePricingType.TIERED,
    tiers: [{ id: "t1", labelFr: "Formule or", labelAr: "الباقة الذهبية", priceCents: 9_000_000, sortOrder: 0, isActive: true }] },
  // Arabe VIDE : le repli se mesure aussi sur une prestation.
  { ...base, id: "p4", sortOrder: 3, nameFr: "Photographe", nameAr: "", pricingType: ServicePricingType.FIXED, fixedPriceCents: 3_000_000 }
];

const NOW = Date.parse("2027-08-01T09:00:00Z");
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  fetchDouble();
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

/** Ouvrir le 15 août, comme un visiteur : le jour dans le calendrier (son nom vient du MESSAGE et du FORMATEUR, D209 n° 5). */
async function ouvrirLeJour(locale: "fr" | "ar"): Promise<HTMLElement> {
  const nom = messages[locale].venueDetail.booking.dayFree.replace("{date}", longDate("2027-08-15", locale));
  const jour = await screen.findByRole("button", { name: nom });
  fireEvent.click(jour);
  const groupe = messages[locale].venueDetail.calendar.slotsFor.replace("{date}", longDate("2027-08-15", locale));
  return screen.findByRole("group", { name: groupe });
}

describe("FC-3 — en arabe, les noms viennent des champs ARABES", () => {
  it("le créneau : « سهرة », jamais « Soirée »", async () => {
    rendre("ar");
    const creneaux = await ouvrirLeJour("ar");
    const libelles = within(creneaux).getAllByRole("button").map((b) => b.textContent ?? "");
    expect(libelles.some((l) => l.startsWith("سهرة"))).toBe(true);
    expect(libelles.some((l) => l.includes("Soirée"))).toBe(false);
  });

  it("la prestation : son nom ARABE à côté de la case", async () => {
    rendre("ar");
    await ouvrirLeJour("ar");
    const libelles = screen.getAllByRole("checkbox").map((c) => c.closest("label")?.textContent ?? "");
    expect(libelles.some((l) => l.includes("ممون الحفلات"))).toBe(true);
    expect(libelles.some((l) => l.includes("Traiteur"))).toBe(false);
  });

  it("l'unité d'une prestation « à l'unité » : son nom ARABE", async () => {
    rendre("ar");
    await ouvrirLeJour("ar");
    const ligne = screen.getAllByRole("checkbox").map((c) => c.closest("label")?.textContent ?? "").find((l) => l.includes("طاولات مستديرة"));
    expect(ligne?.includes("للطاولة")).toBe(true);
    expect(ligne?.includes("par table")).toBe(false);
  });

  it("le palier d'une prestation « par palier » : son nom ARABE dans la liste", async () => {
    rendre("ar");
    await ouvrirLeJour("ar");
    const caseDeco = screen.getAllByRole("checkbox").find((c) => (c.closest("label")?.textContent ?? "").includes("تزيين"));
    expect(caseDeco).toBeDefined();
    fireEvent.click(caseDeco!);
    await waitFor(() => expect(screen.queryAllByRole("option").length).toBeGreaterThan(0));
    const options = screen.getAllByRole("option").map((o) => o.textContent ?? "");
    expect(options.some((o) => o.includes("الباقة الذهبية"))).toBe(true);
    expect(options.some((o) => o.includes("Formule or"))).toBe(false);
  });
});

describe("FC-3 — le repli sur le français n'a lieu que si l'arabe est VIDE, et il se DIT", () => {
  it("un créneau sans nom arabe : son nom français, marqué `lang=\"fr\"` et `dir=\"ltr\"`", async () => {
    rendre("ar");
    const creneaux = await ouvrirLeJour("ar");
    const marque = Array.from(creneaux.querySelectorAll("[lang]")).find((el) => el.textContent === "Après-midi");
    expect(marque?.getAttribute("lang")).toBe("fr");
    expect(marque?.getAttribute("dir")).toBe("ltr");
  });

  it("une prestation sans nom arabe : son nom français, marqué `lang=\"fr\"` et `dir=\"ltr\"`", async () => {
    rendre("ar");
    await ouvrirLeJour("ar");
    const marque = Array.from(document.querySelectorAll("label [lang]")).find((el) => el.textContent === "Photographe");
    expect(marque?.getAttribute("lang")).toBe("fr");
    expect(marque?.getAttribute("dir")).toBe("ltr");
  });

  it("un nom arabe PRÉSENT n'est jamais marqué comme un repli", async () => {
    rendre("ar");
    const creneaux = await ouvrirLeJour("ar");
    const marques = Array.from(document.querySelectorAll("[lang='fr']")).map((el) => el.textContent);
    expect(marques.includes("سهرة")).toBe(false);
    expect(marques.includes("ممون الحفلات")).toBe(false);
    expect(within(creneaux).getAllByRole("button").length).toBe(2);
  });
});

describe("FC-3 — en français, rien ne change", () => {
  it("le créneau, la prestation, l'unité : les champs FRANÇAIS, sans marque de repli", async () => {
    rendre("fr");
    const creneaux = await ouvrirLeJour("fr");
    const libelles = within(creneaux).getAllByRole("button").map((b) => b.textContent ?? "");
    expect(libelles.some((l) => l.startsWith("Soirée"))).toBe(true);
    const cases = screen.getAllByRole("checkbox").map((c) => c.closest("label")?.textContent ?? "");
    expect(cases.some((l) => l.includes("Traiteur"))).toBe(true);
    expect(cases.some((l) => l.includes("par table"))).toBe(true);
    // Aucun nom du panneau n'est marqué comme un repli : en français, il n'y a rien à replier.
    const marques = Array.from(document.querySelectorAll("[lang]")).map((el) => el.textContent);
    for (const nom of ["Soirée", "Après-midi", "Traiteur", "Photographe"]) expect(marques.includes(nom)).toBe(false);
  });
});
