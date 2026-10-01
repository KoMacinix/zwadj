// Panneau de demande de réservation, fiche salle — Lot E1b.
//
// Deux choses se prouvent ici et nulle part ailleurs :
//   - l'ACOMPTE est annoncé AVANT l'envoi, calculé depuis la politique de la
//     salle (D81), écrêtage compris ;
//   - un 409 `BOOKING_PRICE_CHANGED` RECHARGE le calendrier au lieu d'inviter à
//     rejouer le même échec contre un prix périmé (D75).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { formatDZD, messages } from "@zwadj/i18n";
import type { BookingsClient } from "@zwadj/api-client";
import { availabilityWindowQuerySchema } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { longDate } from "../../lib/booking-calendar";
import { monthLabel, weekdayHeaders } from "../../lib/calendar";
import { LOGIN_PATH } from "../../lib/routes";
import { BookingRequestPanel, WINDOW_DAYS } from "./booking-request-panel";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));

const AVAILABILITY = {
  venueId: "v1",
  slug: "salle-el-ryad",
  bookingMode: "MULTI_SLOT",
  from: "2027-08-01",
  to: "2027-08-31",
  slots: [{ id: "s1", nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 }],
  days: [
    { date: "2027-08-15", isHoliday: false, slots: [{ slotTemplateId: "s1", status: "AVAILABLE", priceCents: 20_000_000 }] },
    { date: "2027-08-16", isHoliday: false, slots: [{ slotTemplateId: "s1", status: "BOOKED", priceCents: 20_000_000 }] }
  ]
};

/**
 * ⚠ RANG 25 (D316, MD1-g) — LE DOUBLE APPLIQUE LE CONTRAT.
 *
 * L'ancien double répondait `ok` QUELLE QUE SOIT L'URL : le panneau demandait
 * 182 jours, l'API en refuse plus de 92, et ce test restait vert pendant que
 * l'écran réel affichait « aucune date » (D315). Celui-ci valide la requête par
 * le schéma que l'API applique (`availabilityWindowQuerySchema`) et répond 400
 * comme elle ; il ne rend que les jours de la fenêtre DEMANDÉE.
 * `echoue` rend une fenêtre en 500, pour mesurer le tout-ou-rien.
 */
function stubFetch(payload: unknown = AVAILABILITY, echoue: (from: string) => boolean = () => false) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const fenetre = { from: url.searchParams.get("from") ?? "", to: url.searchParams.get("to") ?? "" };
    if (!availabilityWindowQuerySchema.safeParse(fenetre).success) {
      return { ok: false, status: 400, json: () => Promise.resolve({ statusCode: 400 }) } as unknown as Response;
    }
    if (echoue(fenetre.from)) {
      return { ok: false, status: 500, json: () => Promise.resolve({ statusCode: 500 }) } as unknown as Response;
    }
    const corps = payload as { days?: Array<{ date: string }> };
    const rendu = Array.isArray(corps.days)
      ? { ...corps, ...fenetre, days: corps.days.filter((d) => d.date >= fenetre.from && d.date <= fenetre.to) }
      : payload;
    return { ok: true, status: 200, json: () => Promise.resolve(rendu) } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// ⚠ L'horloge est FIGÉE (espion sur `Date.now`, idiome du calendrier voisin :
// pas de faux timers, `waitFor` en a besoin de vrais). Le 1er août 2027, la
// fenêtre de six mois commence le 2 août : les dates des fixtures y tombent.
// Jamais une date « dans le futur » : elle cesse de l'être (D213, D227).
const NOW = Date.parse("2027-08-01T09:00:00Z");

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const CLIENT_CONNECTE = { id: "u9", email: "client@example.dz", role: "CLIENT", emailVerified: true };

const MSG = messages.fr.venueDetail.booking;
/** Rang 29 (D321) — le nom d'un JOUR du calendrier, dérivé du MESSAGE et du FORMATEUR (D209 n° 5 : le nom accessible
 *  d'un jour porte son état — il ne se tape pas à la main). */
const nomJour = (date: string, libre = true, locale: "fr" | "ar" = "fr"): string =>
  (libre ? messages[locale].venueDetail.booking.dayFree : messages[locale].venueDetail.booking.dayFull).replace(
    "{date}",
    longDate(date, locale)
  );
/** Choisir une date, comme un visiteur : le JOUR dans le calendrier, puis son créneau. */
async function choisir(date: string, creneau = /^Soirée · /): Promise<void> {
  fireEvent.click(await screen.findByRole("button", { name: nomJour(date) }));
  fireEvent.click(await screen.findByRole("button", { name: creneau }));
}

function renderPanel(
  props: Partial<React.ComponentProps<typeof BookingRequestPanel>> = {},
  session: unknown = null,
  locale: "fr" | "ar" = "fr"
) {
  const auth = {
    bootstrap: vi.fn().mockResolvedValue(session),
    login: vi.fn(),
    logout: vi.fn(),
    raw: vi.fn()
  } as unknown as AuthClient;

  const client: BookingsClient = {
    create: vi.fn(),
    listMine: vi.fn().mockResolvedValue([]),
    cancel: vi.fn(),
    ...(props.client ?? {})
  };

  render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <AuthProvider client={auth}>
        <BookingRequestPanel
          slug="salle-el-ryad"
          depositRateBps={3000}
          depositAmountCents={null}
          {...props}
          client={client}
        />
      </AuthProvider>
    </NextIntlClientProvider>
  );
  return client;
}

describe("Demande de réservation — les dates", () => {
  it("une date PRISE reste affichée, désactivée : ça aide à en choisir une autre", async () => {
    stubFetch();
    renderPanel();
    // Rang 29 (D321) : le jour pris est une CASE du calendrier, inactive, et son nom le DIT.
    const taken = await screen.findByRole("button", { name: nomJour("2027-08-16", false) });
    // Assertions NATIVES : sous neutralisation, un matcher jest-dom échoue en `Error`, pas en `AssertionError` (D316).
    expect(taken.hasAttribute("disabled")).toBe(true);
    expect(taken.textContent).toBe("16");
  });

  it("une date libre est cliquable", async () => {
    stubFetch();
    renderPanel();
    expect(await screen.findByRole("button", { name: nomJour("2027-08-15") })).toBeEnabled();
  });

  it("GARDE DE FORME : une réponse sans `days` n'emporte pas la fiche salle (C5b) — et elle se dit ÉCHEC", async () => {
    stubFetch({ venueId: "v1" });
    renderPanel();
    // ⚠ INVERSION ÉCRITE (rang 25, D316) : ce test exigeait « aucune date ».
    // La section échoue toujours SEULE — le panneau se rend, son titre aussi —
    // mais elle dit ce qui est arrivé : un échec, pas une salle sans dates.
    // ⚠ `waitFor` + `expect`, pas `findByRole` : sous neutralisation, l'échec
    // doit se lire comme une ASSERTION, pas comme une erreur de requête (D304).
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeNull());
    expect(screen.getByRole("alert")).toHaveTextContent(messages.fr.venueDetail.booking.loadFailed);
    expect(screen.getByRole("heading", { name: messages.fr.venueDetail.booking.title })).toBeInTheDocument();
    expect(screen.queryByText(messages.fr.venueDetail.booking.none)).toBeNull();
  });
});

/** Rang 29 (D321) — une salle LIBRE tous les jours de la fenêtre : 182 jours d'un créneau chacun, à partir du lendemain de
 *  l'horloge figée. C'est la forme qui rendait 182 boutons d'affilée (MD C-j). */
function sixMoisLibres(): typeof AVAILABILITY {
  const debut = Date.parse("2027-08-02T00:00:00Z");
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => ({
    date: new Date(debut + i * 86_400_000).toISOString().slice(0, 10),
    isHoliday: false,
    slots: [{ slotTemplateId: "s1", status: "AVAILABLE", priceCents: 20_000_000 }]
  }));
  return { ...AVAILABILITY, days };
}

describe("Demande de réservation — un calendrier, pas une liste (rang 29, D321)", () => {
  it("C-j : UN mois à la fois — jamais les 182 jours d'un coup", async () => {
    stubFetch(sixMoisLibres());
    renderPanel();
    const panneau = await screen.findByRole("region", { name: messages.fr.venueDetail.booking.title });
    await waitFor(() => expect(panneau.querySelectorAll("button").length).toBeGreaterThan(0));
    // Un mois a au plus 31 jours, plus les deux boutons de navigation. Avant ce lot : 182 boutons de date d'affilée.
    expect(panneau.querySelectorAll("button").length).toBeLessThanOrEqual(31 + 2);
  });

  it("C-c : la navigation parcourt la fenêtre de six mois, et n'en sort pas", async () => {
    const charge = sixMoisLibres();
    stubFetch(charge);
    renderPanel();
    const precedent = await screen.findByRole("button", { name: messages.fr.venueDetail.calendar.previous });
    const suivant = screen.getByRole("button", { name: messages.fr.venueDetail.calendar.next });
    expect(precedent).toBeDisabled();
    const dernier = charge.days[charge.days.length - 1]!.date;
    const cible = { year: Number(dernier.slice(0, 4)), month: Number(dernier.slice(5, 7)) };
    let clics = 0;
    while (!suivant.hasAttribute("disabled") && clics < 12) {
      fireEvent.click(suivant);
      clics += 1;
    }
    // Six mois de 182 jours à partir du 2 août : août → janvier, cinq clics.
    expect(clics).toBe(5);
    expect(screen.getByRole("grid", { name: monthLabel(cible, "fr") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: nomJour(dernier) })).toBeEnabled();
  });

  it("C-f et C-h : une grille nommée par le mois, la semaine commence DIMANCHE (D56)", async () => {
    stubFetch();
    renderPanel();
    const grille = await screen.findByRole("grid", { name: monthLabel({ year: 2027, month: 8 }, "fr") });
    const entetes = grille.querySelectorAll("th");
    expect(entetes).toHaveLength(7);
    expect(entetes[0]!.textContent).toContain(weekdayHeaders("fr", "long")[0]!);
    expect(new Date(Date.UTC(2026, 10, 1)).getUTCDay()).toBe(0); // l'ancre de `weekdayHeaders` est bien un dimanche
  });

  it("C-e : UN arrêt de tabulation dans la grille, et la flèche droite avance d'un jour", async () => {
    stubFetch(sixMoisLibres());
    renderPanel();
    const grille = await screen.findByRole("grid", { name: monthLabel({ year: 2027, month: 8 }, "fr") });
    const arrets = Array.from(grille.querySelectorAll("button")).filter((b) => b.tabIndex === 0);
    expect(arrets.map((b) => b.getAttribute("aria-label"))).toEqual([nomJour("2027-08-02")]);
    arrets[0]!.focus();
    fireEvent.keyDown(arrets[0]!, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(nomJour("2027-08-03"));
    fireEvent.keyDown(document.activeElement!, { key: "PageDown" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(nomJour("2027-09-01"));
    expect(screen.getByRole("grid", { name: monthLabel({ year: 2027, month: 9 }, "fr") })).toBeInTheDocument();
  });

  it("C-e : EN ARABE, la flèche GAUCHE avance d'un jour — la grille se lit de droite à gauche", async () => {
    stubFetch(sixMoisLibres());
    renderPanel({}, null, "ar");
    const grille = await screen.findByRole("grid", { name: monthLabel({ year: 2027, month: 8 }, "ar") });
    const depart = Array.from(grille.querySelectorAll("button")).find((b) => b.tabIndex === 0)!;
    expect(depart.getAttribute("aria-label")).toBe(nomJour("2027-08-02", true, "ar"));
    depart.focus();
    fireEvent.keyDown(depart, { key: "ArrowLeft" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(nomJour("2027-08-03", true, "ar"));
  });

  it("C-d : le jour REGARDÉ est celui qu'on envoie, au créneau cliqué — et un créneau pris de ce jour reste affiché, inactif", async () => {
    stubFetch({
      ...AVAILABILITY,
      slots: [...AVAILABILITY.slots, { id: "s2", nameFr: "Après-midi", nameAr: "ظهيرة", startMinutes: 780, endMinutes: 1080 }],
      days: [
        ...AVAILABILITY.days,
        {
          date: "2027-08-20",
          isHoliday: false,
          slots: [
            { slotTemplateId: "s1", status: "BOOKED", priceCents: 20_000_000 },
            { slotTemplateId: "s2", status: "AVAILABLE", priceCents: 15_000_000 }
          ]
        }
      ]
    });
    const client = renderPanel({}, CLIENT_CONNECTE);
    fireEvent.click(await screen.findByRole("button", { name: nomJour("2027-08-20") }));
    const pris = screen.getByRole("button", { name: /^Soirée · / });
    expect(pris.hasAttribute("disabled")).toBe(true);
    expect(pris.textContent).toContain(MSG.taken);
    fireEvent.click(screen.getByRole("button", { name: /^Après-midi · / }));
    fireEvent.change(screen.getByLabelText(MSG.guests), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText(MSG.firstName), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText(MSG.lastName), { target: { value: "Bensalem" } });
    fireEvent.change(screen.getByLabelText(MSG.phone), { target: { value: "+213550000001" } });
    fireEvent.click(screen.getByRole("button", { name: MSG.submit }));
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    const corps = vi.mocked(client.create).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect([corps.eventDate, corps.slotTemplateId, corps.expectedTotalCents]).toEqual(["2027-08-20", "s2", 15_000_000]);
  });
});

describe("Demande de réservation — la fenêtre de six mois, découpée pour le contrat (rang 25, D316)", () => {
  it("D147 : chaque requête passe le contrat, et les fenêtres couvrent les six mois sans trou", async () => {
    const fetchMock = stubFetch();
    renderPanel();
    // Les fenêtres partent ensemble (`Promise.all`) : dès le premier appel, toutes
    // sont émises. On juge les REQUÊTES avant le rendu — sous neutralisation,
    // l'échec se lit sur la requête fautive, pas sur un bouton absent.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const fenetres = fetchMock.mock.calls.map(([input]) => {
      const url = new URL(String(input));
      return { from: url.searchParams.get("from") ?? "", to: url.searchParams.get("to") ?? "" };
    });
    expect(fenetres.length).toBeGreaterThanOrEqual(2);
    for (const w of fenetres) expect(availabilityWindowQuerySchema.safeParse(w).success).toBe(true);
    const civil = (ms: number) => new Date(ms + 3_600_000).toISOString().slice(0, 10);
    expect(fenetres[0]!.from).toBe(civil(NOW + 86_400_000));
    expect(fenetres[fenetres.length - 1]!.to).toBe(civil(NOW + WINDOW_DAYS * 86_400_000));
    for (let i = 1; i < fenetres.length; i++) {
      const lendemain = new Date(Date.parse(`${fenetres[i - 1]!.to}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
      expect(fenetres[i]!.from).toBe(lendemain);
    }
    // Le rendu va à son terme : aucune mise à jour d'état après la fin du test.
    expect(await screen.findByRole("button", { name: nomJour("2027-08-15") })).toBeEnabled();
  });

  it("une ERREUR d'API n'est JAMAIS « aucune date » — et une fenêtre en échec suffit (tout ou rien)", async () => {
    // La SECONDE fenêtre échoue ; la première a ses dates. Afficher la première
    // seule présenterait un calendrier partiel comme complet.
    stubFetch(AVAILABILITY, (from) => from > "2027-10-01");
    renderPanel();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeNull());
    expect(screen.getByRole("alert")).toHaveTextContent(messages.fr.venueDetail.booking.loadFailed);
    expect(screen.queryByText(messages.fr.venueDetail.booking.none)).toBeNull();
    expect(screen.queryByRole("button", { name: nomJour("2027-08-15") })).toBeNull();
  });
});

describe("Demande de réservation — l'acompte annoncé AVANT l'envoi (D81)", () => {
  it("30 % de 200 000 DA = 60 000 DA", async () => {
    stubFetch();
    renderPanel();
    await choisir("2027-08-15");
    await waitFor(() =>
      expect(screen.getByText((text) => /Acompte/.test(text) && /60.?000/.test(text))).toBeInTheDocument()
    );
  });

  it("un acompte FIXE supérieur au prix est ÉCRÊTÉ au prix — miroir du serveur", async () => {
    stubFetch();
    // 500 000 DA d'acompte fixe sur une date à 200 000 DA.
    renderPanel({ depositRateBps: null, depositAmountCents: 50_000_000 });
    await choisir("2027-08-15");
    await waitFor(() =>
      expect(screen.getByText((text) => /Acompte/.test(text) && /200.?000/.test(text))).toBeInTheDocument()
    );
  });
});

describe("Demande de réservation — sans compte", () => {
  it("les dates et les PRIX s'affichent sans session ; seul l'envoi demande de se connecter", async () => {
    stubFetch();
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: nomJour("2027-08-15") }));
    // Rang 29 (D321) : le PRIX se lit au créneau du jour regardé — toujours sans session. Attendu dérivé du formateur.
    expect(screen.getByRole("button", { name: (nom) => nom.includes(formatDZD(20_000_000)) })).toBeInTheDocument();
    // Rang 25 (D316) : ce lien visait `/connexion`, une 404 (D315). Sa cible est
    // la constante vérifiée contre le fichier de la page (`lib/routes.test.ts`).
    // ⚠ Assertion NATIVE (`toBe`), pas le matcher jest-dom `toHaveAttribute` : sous neutralisation, celui-ci
    // échoue en `Error`, et le harnais du lot ne lit une morsure que sur une `AssertionError` (D304).
    expect(screen.getByRole("link", { name: /Se connecter/ }).getAttribute("href")).toBe(LOGIN_PATH);
    // Aucun formulaire tant qu'on n'est pas connecté : afficher des champs qui
    // ne partiront pas serait une promesse fausse.
    expect(screen.queryByRole("button", { name: "Envoyer ma demande" })).toBeNull();
  });
});

const TRAITEUR = {
  id: "sv1",
  venueId: "v1",
  nameFr: "Traiteur",
  nameAr: "تموين",
  descriptionFr: null,
  descriptionAr: null,
  pricingType: "PER_GUEST" as const,
  isActive: true,
  sortOrder: 0,
  fixedPriceCents: null,
  perGuestPriceCents: 200_000,
  perUnitPriceCents: null,
  unitNameFr: null,
  unitNameAr: null,
  minUnits: null,
  maxUnits: null,
  tiers: []
};

describe("Demande de réservation — D135 : l'e-mail est facultatif, le téléphone non", () => {
  async function remplir() {
    await choisir("2027-08-15");
    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Bensalem" } });
  }

  it("⚠ sans e-mail, la demande PART et la clé est ABSENTE du corps", async () => {
    stubFetch();
    const client = renderPanel({}, CLIENT_CONNECTE);
    await remplir();

    // Le bouton est encore inerte : il manque le TÉLÉPHONE, pas l'e-mail.
    expect(screen.getByRole("button", { name: "Envoyer ma demande" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000001" } });
    expect(screen.getByRole("button", { name: "Envoyer ma demande" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(client.create).toHaveBeenCalled());

    // ⚠ Clé absente, JAMAIS `""` : `.email()` refuse la chaîne vide, et le
    // client verrait une erreur de validation là où il n'a rien à déclarer.
    const corps = vi.mocked(client.create).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(corps).not.toHaveProperty("contactEmail");
    expect(corps.contactPhone).toBe("+213550000001");
  });

  it("avec un e-mail, il est transmis tel quel", async () => {
    stubFetch();
    const client = renderPanel({}, CLIENT_CONNECTE);
    await remplir();
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+213550000001" } });
    fireEvent.change(screen.getByLabelText("E-mail (facultatif)"), { target: { value: "amina@example.dz" } });

    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    const corps = vi.mocked(client.create).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(corps.contactEmail).toBe("amina@example.dz");
  });
});

const SALLE_DES_FETES = {
  ...TRAITEUR,
  id: "sv2",
  nameFr: "Décoration",
  pricingType: "TIERED" as const,
  perGuestPriceCents: null,
  tiers: [{ id: "t1", labelFr: "Simple", labelAr: "بسيط", priceCents: 5_000_000, sortOrder: 0, isActive: true }]
};
const CHAISES = {
  ...TRAITEUR,
  id: "sv3",
  nameFr: "Chaises",
  pricingType: "PER_UNIT" as const,
  perGuestPriceCents: null,
  perUnitPriceCents: 10_000,
  unitNameFr: "chaise",
  minUnits: 10
};

describe("Demande de réservation — un <label> VISIBLE par champ (rang 29, D321, D143)", () => {
  it("L-a : chaque champ du panneau a un <label> visible associé, et L-b : les obligatoires portent `required` (D32)", async () => {
    stubFetch();
    renderPanel({ services: [TRAITEUR, SALLE_DES_FETES, CHAISES] }, CLIENT_CONNECTE);
    const panneau = await screen.findByRole("region", { name: messages.fr.venueDetail.booking.title });
    await waitFor(() => expect(screen.getByRole("button", { name: messages.fr.venueDetail.booking.submit })).toBeInTheDocument());
    // Les champs qui n'apparaissent qu'une prestation cochée (palier, quantité) : on les fait apparaître.
    for (const coche of screen.getAllByRole("checkbox")) fireEvent.click(coche);
    const champs = Array.from(panneau.querySelectorAll<HTMLInputElement>("input, select, textarea"));
    expect(champs.length).toBeGreaterThanOrEqual(10); // invités, 3 cases, palier, quantité, prénom, nom, téléphone, e-mail, message
    const sansLabelVisible = champs
      .filter((champ) => {
        const labels = Array.from(champ.labels ?? []);
        return labels.length === 0 || labels.every((l) => l.closest(".sr-only") !== null || (l.textContent ?? "").trim() === "");
      })
      .map((champ) => champ.getAttribute("aria-label") ?? champ.getAttribute("placeholder") ?? champ.outerHTML.slice(0, 60));
    expect(sansLabelVisible).toEqual([]);
    const B = messages.fr.venueDetail.booking;
    // Le nom accessible est le libellé EXACT : l'astérisque vit hors du <label> (D32).
    for (const nom of [B.guests, B.firstName, B.lastName, B.phone]) expect(screen.getByLabelText(nom).hasAttribute("required")).toBe(true);
    for (const nom of [B.email, B.message]) expect(screen.getByLabelText(nom).hasAttribute("required")).toBe(false);
  });
});

describe("Prestations — E2d", () => {
  it("une salle SANS catalogue n'affiche aucun bloc vide", async () => {
    stubFetch();
    renderPanel();
    await screen.findByRole("button", { name: nomJour("2027-08-15") });
    expect(screen.queryByText("Prestations en plus")).toBeNull();
  });

  it("PER_GUEST : le total suit le nombre d'INVITÉS, pas une quantité saisie", async () => {
    stubFetch();
    renderPanel({ services: [TRAITEUR] });
    await choisir("2027-08-15");
    // 250 invités × 2 000 DA = 500 000 DA, à ajouter aux 200 000 de la salle.
    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(screen.getByText((text) => /Prix/.test(text) && /700.?000/.test(text))).toBeInTheDocument()
    );
  });

  it("l'ACOMPTE suit le total prestations comprises", async () => {
    stubFetch();
    renderPanel({ services: [TRAITEUR] });
    await choisir("2027-08-15");
    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("checkbox"));
    // 30 % de 700 000 = 210 000.
    await waitFor(() =>
      expect(screen.getByText((text) => /Acompte/.test(text) && /210.?000/.test(text))).toBeInTheDocument()
    );
  });

  it("décocher retire la prestation du total", async () => {
    stubFetch();
    renderPanel({ services: [TRAITEUR] });
    await choisir("2027-08-15");
    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(screen.getByText((text) => /Prix/.test(text) && /200.?000/.test(text))).toBeInTheDocument()
    );
  });
});
