// Section « Mes réservations » du compte client — Lot E1b.
//
// Ce qui se prouve ici : une demande qui n'a pas abouti reste AFFICHÉE et
// marquée, et la section porte sa propre garde de forme — c'est la leçon de C5b,
// une section qui lève emportait toute la page compte.
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { BookingsClient } from "@zwadj/api-client";
import type { BookingDTO } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { BookingsSection } from "./bookings-section";

const CLIENT_USER = {
  id: "u1",
  email: "amina@example.dz",
  role: "CLIENT" as const,
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false
};

const PENDING: BookingDTO = {
  id: "b1",
  venueId: "v1",
  venueSlug: "salle-el-ryad",
  venueNameFr: "Salle El Ryad",
  venueNameAr: "قاعة الرياض",
  status: "PENDING",
  paymentMethod: "CASH",
  eventDate: "2027-08-15",
  startsAt: "2027-08-15T19:00:00.000Z",
  endsAt: "2027-08-16T01:00:00.000Z",
  slotNameFr: "Soirée",
  slotNameAr: "سهرة",
  guests: 250,
  basePriceCents: 20_000_000,
  servicesTotalCents: 0,
  totalCents: 20_000_000,
  depositCents: 6_000_000,
  services: [],
  clientMessage: null,
  declineReason: null,
  cancellationReason: null,
  expiresAt: null,
  paymentDueAt: null,
  createdAt: "2026-08-02T10:00:00.000Z"
};

const DECLINED: BookingDTO = {
  ...PENDING,
  id: "b2",
  status: "DECLINED",
  declineReason: "Déjà réservée pour un autre mariage"
};

function renderSection(client: Partial<BookingsClient>) {
  const auth = {
    bootstrap: vi.fn().mockResolvedValue(CLIENT_USER),
    login: vi.fn(),
    logout: vi.fn(),
    raw: vi.fn()
  } as unknown as AuthClient;

  const bookings: BookingsClient = {
    create: vi.fn(),
    listMine: vi.fn().mockResolvedValue([]),
    cancel: vi.fn(),
    ...client
  };

  return render(
    <NextIntlClientProvider locale="fr" messages={messages.fr}>
      <AuthProvider client={auth}>
        <BookingsSection client={bookings} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("Mes réservations — ce que le client doit voir", () => {
  it("une demande REFUSÉE reste affichée, marquée, avec le motif de la salle", async () => {
    renderSection({ listMine: vi.fn().mockResolvedValue([DECLINED]) });
    expect(await screen.findByText("Refusée par la salle")).toBeInTheDocument();
    // Le motif est ce qui permet de chercher utilement ailleurs.
    expect(screen.getByText(/Déjà réservée pour un autre mariage/)).toBeInTheDocument();
    // Et aucune action : il n'y a plus rien à annuler.
    expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull();
  });

  it("une demande EN ATTENTE dit qu'on attend la salle, et propose l'annulation", async () => {
    renderSection({ listMine: vi.fn().mockResolvedValue([PENDING]) });
    expect(await screen.findByText(/En attente de réponse/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  it("l'ACOMPTE est affiché : c'est l'information qui déclenche l'action suivante", async () => {
    renderSection({ listMine: vi.fn().mockResolvedValue([{ ...PENDING, status: "ACCEPTED" }]) });
    await screen.findByText(/Acceptée/);
    // Le MONTANT, pas seulement le mot. `formatDZD` insère des séparateurs de
    // groupe insécables selon la locale : on cherche donc les chiffres, sans
    // figer la ponctuation qu'`Intl` choisit.
    expect(screen.getByText((text) => /acompte/.test(text) && /60.?000/.test(text))).toBeInTheDocument();
  });

  it("liste vide : dite explicitement, avec le geste suivant", async () => {
    renderSection({});
    expect(await screen.findByText(/Aucune demande de réservation/)).toBeInTheDocument();
  });

  it("GARDE DE FORME : une réponse inattendue n'emporte pas la page compte (C5b)", async () => {
    // `null` au lieu d'un tableau — exactement ce qui faisait lever `.map`.
    renderSection({ listMine: vi.fn().mockResolvedValue(null as unknown as BookingDTO[]) });
    expect(await screen.findByText(/Aucune demande de réservation/)).toBeInTheDocument();
  });

  it("une erreur de chargement s'annonce, sans faire tomber la section", async () => {
    renderSection({ listMine: vi.fn().mockRejectedValue(new Error("réseau")) });
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 2, name: "Mes réservations" })).toBeInTheDocument();
  });
});
