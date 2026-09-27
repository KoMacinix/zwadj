// Panneau de demande de réservation, fiche salle — Lot E1b.
//
// Deux choses se prouvent ici et nulle part ailleurs :
//   - l'ACOMPTE est annoncé AVANT l'envoi, calculé depuis la politique de la
//     salle (D81), écrêtage compris ;
//   - un 409 `BOOKING_PRICE_CHANGED` RECHARGE le calendrier au lieu d'inviter à
//     rejouer le même échec contre un prix périmé (D75).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { BookingsClient } from "@zwadj/api-client";
import { availabilityWindowQuerySchema } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
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

function renderPanel(
  props: Partial<React.ComponentProps<typeof BookingRequestPanel>> = {},
  session: unknown = null
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
    <NextIntlClientProvider locale="fr" messages={messages.fr}>
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
    const taken = await screen.findByRole("button", { name: /2027-08-16/ });
    expect(taken).toBeDisabled();
    expect(taken).toHaveTextContent(/prise/);
  });

  it("une date libre est cliquable", async () => {
    stubFetch();
    renderPanel();
    expect(await screen.findByRole("button", { name: /2027-08-15/ })).toBeEnabled();
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
    expect(await screen.findByRole("button", { name: /2027-08-15/ })).toBeEnabled();
  });

  it("une ERREUR d'API n'est JAMAIS « aucune date » — et une fenêtre en échec suffit (tout ou rien)", async () => {
    // La SECONDE fenêtre échoue ; la première a ses dates. Afficher la première
    // seule présenterait un calendrier partiel comme complet.
    stubFetch(AVAILABILITY, (from) => from > "2027-10-01");
    renderPanel();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeNull());
    expect(screen.getByRole("alert")).toHaveTextContent(messages.fr.venueDetail.booking.loadFailed);
    expect(screen.queryByText(messages.fr.venueDetail.booking.none)).toBeNull();
    expect(screen.queryByRole("button", { name: /2027-08-15/ })).toBeNull();
  });
});

describe("Demande de réservation — l'acompte annoncé AVANT l'envoi (D81)", () => {
  it("30 % de 200 000 DA = 60 000 DA", async () => {
    stubFetch();
    renderPanel();
    (await screen.findByRole("button", { name: /2027-08-15/ })).click();
    await waitFor(() =>
      expect(screen.getByText((text) => /Acompte/.test(text) && /60.?000/.test(text))).toBeInTheDocument()
    );
  });

  it("un acompte FIXE supérieur au prix est ÉCRÊTÉ au prix — miroir du serveur", async () => {
    stubFetch();
    // 500 000 DA d'acompte fixe sur une date à 200 000 DA.
    renderPanel({ depositRateBps: null, depositAmountCents: 50_000_000 });
    (await screen.findByRole("button", { name: /2027-08-15/ })).click();
    await waitFor(() =>
      expect(screen.getByText((text) => /Acompte/.test(text) && /200.?000/.test(text))).toBeInTheDocument()
    );
  });
});

describe("Demande de réservation — sans compte", () => {
  it("les dates et les PRIX s'affichent sans session ; seul l'envoi demande de se connecter", async () => {
    stubFetch();
    renderPanel();
    expect(await screen.findByRole("button", { name: /2027-08-15/ })).toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: /2027-08-15/ }));
    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "200" } });
    fireEvent.change(screen.getByPlaceholderText("Prénom"), { target: { value: "Amina" } });
    fireEvent.change(screen.getByPlaceholderText("Nom"), { target: { value: "Bensalem" } });
  }

  it("⚠ sans e-mail, la demande PART et la clé est ABSENTE du corps", async () => {
    stubFetch();
    const client = renderPanel({}, CLIENT_CONNECTE);
    await remplir();

    // Le bouton est encore inerte : il manque le TÉLÉPHONE, pas l'e-mail.
    expect(screen.getByRole("button", { name: "Envoyer ma demande" })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Téléphone"), { target: { value: "+213550000001" } });
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
    fireEvent.change(screen.getByPlaceholderText("Téléphone"), { target: { value: "+213550000001" } });
    fireEvent.change(screen.getByPlaceholderText("E-mail (facultatif)"), { target: { value: "amina@example.dz" } });

    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    const corps = vi.mocked(client.create).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(corps.contactEmail).toBe("amina@example.dz");
  });
});

describe("Prestations — E2d", () => {
  it("une salle SANS catalogue n'affiche aucun bloc vide", async () => {
    stubFetch();
    renderPanel();
    await screen.findByRole("button", { name: /2027-08-15/ });
    expect(screen.queryByText("Prestations en plus")).toBeNull();
  });

  it("PER_GUEST : le total suit le nombre d'INVITÉS, pas une quantité saisie", async () => {
    stubFetch();
    renderPanel({ services: [TRAITEUR] });
    (await screen.findByRole("button", { name: /2027-08-15/ })).click();
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
    (await screen.findByRole("button", { name: /2027-08-15/ })).click();
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
    (await screen.findByRole("button", { name: /2027-08-15/ })).click();
    fireEvent.change(screen.getByLabelText("Nombre d'invités"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(screen.getByText((text) => /Prix/.test(text) && /200.?000/.test(text))).toBeInTheDocument()
    );
  });
});
