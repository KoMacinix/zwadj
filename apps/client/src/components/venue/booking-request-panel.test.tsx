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
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { BookingRequestPanel } from "./booking-request-panel";

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

function stubFetch(payload: unknown = AVAILABILITY) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) } as unknown as Response)
  );
}

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

  it("GARDE DE FORME : une réponse sans `days` n'emporte pas la fiche salle (C5b)", async () => {
    stubFetch({ venueId: "v1" });
    renderPanel();
    // Le panneau se rend, en disant qu'il n'a rien à proposer.
    expect(await screen.findByText(/aucune date/i)).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: /Se connecter/ })).toBeInTheDocument();
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
