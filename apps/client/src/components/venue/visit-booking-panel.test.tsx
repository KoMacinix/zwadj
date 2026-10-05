// Panneau de rendez-vous de visite — rang 32 (D325) : son téléphone (FACULTATIF, D61) est le champ PARTAGÉ.
//
// Ce panneau n'avait AUCUN test. La garde de l'intégration du champ partagé doit exister DANS ce consommateur : un rouge d'un seul côté,
// sous neutralisation de `@zwadj/ui`, dirait que l'autre ne mesure rien.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { VisitBookingsClient } from "@zwadj/api-client";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, formatSlotRange, VISIT_DURATION_MINUTES } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { VisitBookingPanel } from "./visit-booking-panel";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));

const getVisitSlots = vi.fn();
vi.mock("../../lib/api", () => ({ getVisitSlots: (...a: unknown[]) => getVisitSlots(...a) }));

const PAYS = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];
const FR_PHONE = messages.fr.common.phone;
const VISIT = messages.fr.venueDetail.visit;
const CRENEAU = { date: "2027-08-15", startMinutes: 600, taken: false };
const LIBELLE_CRENEAU = formatSlotRange(CRENEAU.startMinutes, CRENEAU.startMinutes + VISIT_DURATION_MINUTES);

async function renderPanel() {
  const auth = {
    bootstrap: vi.fn().mockResolvedValue({ id: "u9", email: "client@example.dz", role: "CLIENT", emailVerified: true }),
    login: vi.fn(),
    logout: vi.fn(),
    raw: vi.fn()
  } as unknown as AuthClient;
  const client = { create: vi.fn().mockResolvedValue({}), listMine: vi.fn(), cancel: vi.fn() } as unknown as VisitBookingsClient;
  getVisitSlots.mockResolvedValue({ slots: [CRENEAU] });
  await act(async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages.fr}>
        <AuthProvider client={auth}>
          <VisitBookingPanel slug="salle-el-ryad" client={client} />
        </AuthProvider>
      </NextIntlClientProvider>
    );
  });
  fireEvent.click(await screen.findByRole("button", { name: LIBELLE_CRENEAU }));
  return client;
}
const champ = () => screen.getByLabelText(VISIT.phoneLabel) as HTMLInputElement;
const confirmer = () => screen.getByRole("button", { name: VISIT.submit });

describe("VisitBookingPanel — le téléphone (facultatif) est le champ partagé (rang 32)", () => {
  it("l'indicatif et le drapeau sont devant ; le gabarit d'exemple n'est pas un numéro ; plus de « +213… » écrit dans le composant", async () => {
    await renderPanel();
    expect(screen.getByRole("img", { name: `${FR_PHONE.country[DEFAULT_PHONE_COUNTRY]}, ${PAYS.dialCode}` })).toBeInTheDocument();
    expect(champ().placeholder).toBe(FR_PHONE.placeholder[DEFAULT_PHONE_COUNTRY]);
    expect(champ().placeholder).not.toContain(PAYS.dialCode);
  });

  it("⚠ facultatif (D61) : sans numéro, le rendez-vous part et la clé `phone` est ABSENTE", async () => {
    const client = await renderPanel();
    expect(confirmer()).toBeEnabled();
    fireEvent.click(confirmer());
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    const corps = vi.mocked(client.create).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect("phone" in corps).toBe(false);
  });

  it("⚠ LE FORMAT ENVOYÉ N'A PAS CHANGÉ : un numéro collé à la locale part en forme canonique", async () => {
    const client = await renderPanel();
    fireEvent.change(champ(), { target: { value: "0550 00 00 01" } });
    fireEvent.click(confirmer());
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    const corps = vi.mocked(client.create).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(corps.phone).toBe(`${PAYS.dialCode}550000001`);
  });

  it("⚠ un numéro COMMENCÉ doit être complet : incomplet, « Confirmer » est inerte et le dit ; complet, il s'active", async () => {
    await renderPanel();
    for (const caractere of PAYS.leadingDigits.charAt(0) + "1".repeat(PAYS.nationalLength - 2)) {
      fireEvent.change(champ(), { target: { value: champ().value + caractere } });
    }
    // Verdicts en assertions NATIVES (`.disabled`) : un matcher jest-dom lève `Error`, pas `AssertionError` (D304, D316) — c'est ce que mesure la cible Q-3.
    expect((confirmer() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent(FR_PHONE.incomplete.replace("{length}", String(PAYS.nationalLength)));
    fireEvent.change(champ(), { target: { value: champ().value + "1" } });
    expect((confirmer() as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("⚠ un fixe ne se tape pas : le premier chiffre refusé reste seul, avec son message", async () => {
    await renderPanel();
    for (const caractere of "0212") fireEvent.change(champ(), { target: { value: champ().value + caractere } });
    expect(champ().value).toBe("0");
    expect(screen.getByText(FR_PHONE.leadingDigit[DEFAULT_PHONE_COUNTRY])).toBeInTheDocument();
  });
});
