// « Mes rendez-vous » (Lot C5b). Ce qui se joue :
//  - le PASSÉ reste listé — le faire disparaître à minuit ressemblerait à une
//    perte de données — mais sans bouton, l'API refusant (409 D62) ;
//  - l'ANNULÉ reste listé et marqué ;
//  - annuler RECHARGE au lieu de deviner l'état d'après l'API.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { AuthClient, VisitBookingsClient } from "@zwadj/api-client";
import type { VisitBookingDTO } from "@zwadj/types";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../lib/auth/auth-context";
import { VisitBookingsSection } from "./visit-bookings-section";

const FUTUR = "2099-06-14T09:00:00.000Z";
const PASSE = "2020-06-14T09:00:00.000Z";

function booking(over: Partial<VisitBookingDTO> = {}): VisitBookingDTO {
  return {
    id: "b-1",
    venueId: "v-1",
    venueSlug: "salle-el-aurassi",
    venueNameFr: "Salle El Aurassi",
    venueNameAr: "قاعة الأوراسي",
    date: "2099-06-14",
    startMinutes: 600,
    scheduledAt: FUTUR,
    status: "CONFIRMED",
    contactPhone: null,
    cancelledAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over
  };
}

function auth(): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue({ id: "u1" }),
    logout: vi.fn(),
    me: vi.fn(),
    authedRequest: vi.fn(),
    getAccessToken: () => "token"
  } as unknown as AuthClient;
}

function renderSection(client: Partial<VisitBookingsClient>) {
  const full = {
    create: vi.fn(),
    listMine: vi.fn().mockResolvedValue([]),
    cancel: vi.fn().mockResolvedValue(undefined),
    ...client
  } as VisitBookingsClient;
  render(
    <NextIntlClientProvider locale="fr" messages={messages.fr}>
      <AuthProvider client={auth()}>
        <VisitBookingsSection client={full} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
  return full;
}

describe("VisitBookingsSection — C5b", () => {
  it("liste vide : un message qui dit quoi faire, pas une section muette", async () => {
    renderSection({});
    expect(await screen.findByText(/Aucun rendez-vous/)).toBeInTheDocument();
  });

  it("un rendez-vous à venir porte le nom de la salle en LIEN et un bouton d'annulation", async () => {
    renderSection({ listMine: vi.fn().mockResolvedValue([booking()]) });

    expect(await screen.findByRole("link", { name: "Salle El Aurassi" })).toHaveAttribute(
      "href",
      "/fr/salles/salle-el-aurassi"
    );
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  it("un rendez-vous PASSÉ reste listé mais sans bouton — l'API répondrait 409 (D62)", async () => {
    renderSection({
      listMine: vi.fn().mockResolvedValue([booking({ scheduledAt: PASSE, date: "2020-06-14" })])
    });

    expect(await screen.findByText("Passé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull();
  });

  it("un rendez-vous ANNULÉ reste listé et marqué", async () => {
    renderSection({
      listMine: vi.fn().mockResolvedValue([booking({ status: "CANCELLED", cancelledAt: "2026-02-01T00:00:00.000Z" })])
    });

    expect(await screen.findByText("Annulé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull();
  });

  it("annuler appelle l'API puis RECHARGE — deviner l'état finit par diverger d'elle", async () => {
    const listMine = vi
      .fn()
      .mockResolvedValueOnce([booking()])
      .mockResolvedValueOnce([booking({ status: "CANCELLED", cancelledAt: "2026-02-01T00:00:00.000Z" })]);
    const client = renderSection({ listMine });

    fireEvent.click(await screen.findByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(client.cancel).toHaveBeenCalledWith("b-1"));
    expect(await screen.findByText("Annulé")).toBeInTheDocument();
    expect(listMine).toHaveBeenCalledTimes(2);
  });

  it("échec de chargement : un message, jamais une section vide qui ment", async () => {
    renderSection({ listMine: vi.fn().mockRejectedValue(new Error("réseau")) });
    expect(await screen.findByRole("alert")).toHaveTextContent(/n'ont pas pu être chargés/);
  });
});
