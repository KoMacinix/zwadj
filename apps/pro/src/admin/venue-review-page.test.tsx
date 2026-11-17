// ADM-2 (D350, rang 52, R-5 écran 2, R-3) — le détail d'une salle : Publier, Rejeter (motif obligatoire), Corriger le motif, les taux en LECTURE SEULE.
//
//  · une action n'est JAMAIS affichée comme faite avant la réponse de l'API (MD-ADM-15) : le faux serveur est HONNÊTE, il n'enregistre qu'à la réponse, et un test la RETIENT ;
//  · un refus métier de l'API — « pas de créneau actif », « déjà rejetée avec un autre motif », « n'est plus un brouillon » — s'affiche comme un REFUS (son texte français), jamais comme une panne ni
//    comme une action faite ; une panne s'écrit « le résultat est inconnu », jamais « refusé » ;
//  · le motif est OBLIGATOIRE, vérifié par le schéma PARTAGÉ avant tout appel ; une salle déjà rejetée se CORRIGE (R-3) : le champ part du motif en vigueur ;
//  · les deux taux sont AFFICHÉS, jamais modifiables (MD-ADM-7, décision du relecteur de D320).
// Les textes viennent de l'AUTORITÉ (`ADMIN_TEXTS`), le pourcentage et la date des formateurs partagés (`formatBps`, `formatAdminDate`), jamais recopiés (D209).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { VENUE_REJECTION_REASON_MAX, VenuePublicationStatus } from "@zwadj/types";
import { initI18n } from "../i18n";
import { ADMIN_PATH, ADMIN_VENUE_PATH_PATTERN, adminVenuePath } from "../routes";
import { AdminClientProvider } from "./admin-client-context";
import { ADMIN_TEXTS, formatAdminDate, formatBps } from "./admin-texts";
import { VenueReviewPage } from "./venue-review-page";
import { ApiError, NetworkError, aVenue, makeAdminServerDouble, type AdminServerDouble, type FakeVenue } from "../test-support/admin-doubles";

initI18n();
afterEach(cleanup);

function renderReview(server: AdminServerDouble, venue: FakeVenue | { id: string }) {
  return render(
    <MemoryRouter initialEntries={[adminVenuePath(venue.id)]}>
      <AdminClientProvider client={server.client}>
        <Routes>
          <Route path={ADMIN_VENUE_PATH_PATTERN} element={<VenueReviewPage />} />
          <Route path={ADMIN_PATH} element={<p>la file</p>} />
        </Routes>
      </AdminClientProvider>
    </MemoryRouter>
  );
}
const publish = () => screen.getByRole("button", { name: ADMIN_TEXTS.review.publish });
const reasonField = () => screen.getByLabelText(ADMIN_TEXTS.review.reasonLabel) as HTMLTextAreaElement;
const rejectCalls = (s: AdminServerDouble) => s.calls.filter((c) => c[0] === "rejectVenue");
const alerte = () => screen.findByRole("alert");

describe("le détail — ce que l'admin lit", () => {
  it("le nom français en `<h1>`, le nom arabe en `lang=\"ar\" dir=\"rtl\"`, le numéro, la ville, le professionnel, les créneaux actifs, l'état « brouillon »", async () => {
    const v = aVenue();
    renderReview(makeAdminServerDouble({ venues: [v] }), v);

    expect(await screen.findByRole("heading", { level: 1, name: v.nameFr })).toBeInTheDocument();
    const arabe = screen.getByText(v.nameAr);
    expect(arabe).toHaveAttribute("lang", "ar");
    expect(arabe).toHaveAttribute("dir", "rtl");
    expect(screen.getByText(ADMIN_TEXTS.review.number(v.number), { exact: false })).toBeInTheDocument();
    expect(screen.getByText(v.cityNameFr, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(v.ownerBusinessName, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TEXTS.queue.slots(v.activeSlotCount), { exact: false })).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TEXTS.review.status[VenuePublicationStatus.DRAFT])).toBeInTheDocument();
  });

  it("MD-ADM-7 — les DEUX taux sont affichés (valeurs du serveur, formateur partagé) et NE SONT PAS modifiables : aucun champ de saisie de nombre, un seul champ de texte (le motif)", async () => {
    const v = aVenue({ commissionRateBps: 250, cashbackRateBps: 125 });
    renderReview(makeAdminServerDouble({ venues: [v] }), v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    // L'espace avant « % » est INSÉCABLE : Testing Library normalise le DOM d'un seul côté (D209 n° 6) — on compare donc APRÈS normalisation des deux.
    const texteDuTaux = (bps: number) => (contenu: string) => contenu.replace(/\s+/g, " ") === formatBps(bps).replace(/\s+/g, " ");
    expect(screen.getByText(texteDuTaux(250))).toBeInTheDocument();
    expect(screen.getByText(texteDuTaux(125))).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TEXTS.review.ratesReadOnly, { exact: false })).toBeInTheDocument();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("un brouillon jamais rejeté : pas de bloc « déjà rejetée » ; le bouton est « Rejeter », le champ est vide", async () => {
    const v = aVenue();
    renderReview(makeAdminServerDouble({ venues: [v] }), v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });
    expect(screen.queryByText(ADMIN_TEXTS.review.rejectedTitle)).toBeNull();
    expect(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.review.correct })).toBeNull();
    expect(reasonField().value).toBe("");
  });

  it("R-3 — une salle DÉJÀ rejetée : son motif et sa date, le bouton « Corriger le motif », et le champ part du motif EN VIGUEUR", async () => {
    const v = aVenue({ rejection: { reason: "Les photos sont floues.", rejectedAt: "2026-11-12T10:15:00.000Z" } });
    renderReview(makeAdminServerDouble({ venues: [v] }), v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    const bloc = screen.getByText(ADMIN_TEXTS.review.rejectedTitle).closest("section") as HTMLElement;
    expect(within(bloc).getByText("Les photos sont floues.")).toBeInTheDocument();
    expect(within(bloc).getByText(formatAdminDate("2026-11-12T10:15:00.000Z"), { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ADMIN_TEXTS.review.correct })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.review.reject })).toBeNull();
    expect(reasonField().value).toBe("Les photos sont floues.");
  });

  it("une salle PUBLIÉE : ni « Publier » ni « Rejeter » (le sens unique, A3-④) ; son état se lit", async () => {
    const v = aVenue({ publicationStatus: VenuePublicationStatus.PUBLISHED });
    renderReview(makeAdminServerDouble({ venues: [v] }), v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });
    expect(screen.getByText(ADMIN_TEXTS.review.status[VenuePublicationStatus.PUBLISHED])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.review.publish })).toBeNull();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.review.reject })).toBeNull();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.review.correct })).toBeNull();
  });

  it("une salle inconnue (404 indistinct) : « introuvable » et le retour à la file — pas une panne", async () => {
    const server = makeAdminServerDouble();
    renderReview(server, { id: "00000000-0000-4000-8000-0000000000aa" });
    expect(await screen.findByText(ADMIN_TEXTS.review.notFound)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ADMIN_TEXTS.review.backToQueue })).toHaveAttribute("href", ADMIN_PATH);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("une PANNE de lecture : l'alerte et un bouton de relecture ; jamais « introuvable »", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    server.failNext("getVenue", new NetworkError());
    renderReview(server, v);
    expect(await alerte()).toHaveTextContent(ADMIN_TEXTS.review.loadError);
    expect(screen.queryByText(ADMIN_TEXTS.review.notFound)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.common.retry }));
    expect(await screen.findByRole("heading", { level: 1, name: v.nameFr })).toBeInTheDocument();
  });
});

describe("Publier — jamais affiché comme fait avant la réponse (MD-ADM-15)", () => {
  it("pendant que la réponse est RETENUE : le bouton est inactif, aucun « publiée » ; à la réponse : l'avis de réussite et l'état « publiée », les actions disparaissent", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    const liberer = server.hold();
    fireEvent.click(publish());
    await waitFor(() => expect(server.calls.some((c) => c[0] === "publishVenue")).toBe(true));
    expect(publish()).toBeDisabled();
    expect(screen.queryByText(ADMIN_TEXTS.review.published)).toBeNull();
    expect(screen.getByText(ADMIN_TEXTS.review.status[VenuePublicationStatus.DRAFT])).toBeInTheDocument();

    await act(async () => liberer());
    expect(await screen.findByText(ADMIN_TEXTS.review.published)).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TEXTS.review.status[VenuePublicationStatus.PUBLISHED])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.review.publish })).toBeNull();
    expect(server.calls.filter((c) => c[0] === "publishVenue")).toEqual([["publishVenue", v.id]]);
  });

  it("« pas de créneau actif » (409 SLOT_TEMPLATE_REQUIRED) : un REFUS, son texte français — la salle reste un brouillon, aucun avis de réussite", async () => {
    const v = aVenue({ activeSlotCount: 0 });
    renderReview(makeAdminServerDouble({ venues: [v] }), v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    fireEvent.click(publish());
    const a = await alerte();
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.codes.SLOT_TEMPLATE_REQUIRED);
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.refusedPrefix);
    expect(a).not.toHaveTextContent(ADMIN_TEXTS.errors.unknownOutcome);
    expect(screen.queryByText(ADMIN_TEXTS.review.published)).toBeNull();
    expect(screen.getByText(ADMIN_TEXTS.review.status[VenuePublicationStatus.DRAFT])).toBeInTheDocument();
  });

  it("une PANNE pendant l'action : « le résultat est inconnu » (jamais « refusé », jamais « publiée »), et la salle est RELUE pour dire la vérité", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    server.failNext("publishVenue", new NetworkError());
    fireEvent.click(publish());
    const a = await alerte();
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.unknownOutcome);
    expect(a).not.toHaveTextContent(ADMIN_TEXTS.errors.refusedPrefix);
    expect(screen.queryByText(ADMIN_TEXTS.review.published)).toBeNull();
    // La relecture : deux lectures du détail (au chargement, puis après l'issue inconnue).
    await waitFor(() => expect(server.calls.filter((c) => c[0] === "getVenue")).toHaveLength(2));
  });

  it("un double clic ne part qu'UNE fois (le bouton est inactif dès le premier)", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });
    const liberer = server.hold();
    fireEvent.click(publish());
    fireEvent.click(publish());
    await act(async () => liberer());
    await screen.findByText(ADMIN_TEXTS.review.published);
    expect(server.calls.filter((c) => c[0] === "publishVenue")).toHaveLength(1);
  });
});

describe("Rejeter — le motif est OBLIGATOIRE, et le refus se lit comme un refus", () => {
  it("un motif VIDE ou fait d'espaces : le message du schéma partagé, en français, et AUCUN appel", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject }));
    expect(await screen.findByText(ADMIN_TEXTS.errors.validation["admin.validation.rejectionReasonRequired"])).toBeInTheDocument();
    fireEvent.change(reasonField(), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject }));
    expect(screen.getByText(ADMIN_TEXTS.errors.validation["admin.validation.rejectionReasonRequired"])).toBeInTheDocument();
    expect(rejectCalls(server)).toHaveLength(0);
    // D32 : le champ est obligatoire (natif) et décrit son erreur.
    expect(reasonField()).toBeRequired();
    expect(reasonField()).toHaveAttribute("aria-invalid", "true");
  });

  it("un motif trop long : le message de borne, AUCUN appel ; un motif de la longueur EXACTE de la borne passe", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    fireEvent.change(reasonField(), { target: { value: "x".repeat(VENUE_REJECTION_REASON_MAX + 1) } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject }));
    expect(await screen.findByText(ADMIN_TEXTS.errors.validation["admin.validation.rejectionReasonTooLong"])).toBeInTheDocument();
    expect(rejectCalls(server)).toHaveLength(0);

    fireEvent.change(reasonField(), { target: { value: "x".repeat(VENUE_REJECTION_REASON_MAX) } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject }));
    await waitFor(() => expect(rejectCalls(server)).toHaveLength(1));
  });

  it("un motif valide part ROGNÉ ; à la réponse seulement l'avis « rejetée » apparaît, avec le motif et la date de la RÉPONSE ; le bouton devient « Corriger le motif »", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    fireEvent.change(reasonField(), { target: { value: "  Les photos sont floues.  " } });
    const liberer = server.hold();
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject }));
    await waitFor(() => expect(rejectCalls(server)).toHaveLength(1));
    expect(screen.queryByText(ADMIN_TEXTS.review.rejectedTitle)).toBeNull();
    expect(screen.queryByText(ADMIN_TEXTS.review.rejectSaved)).toBeNull();

    await act(async () => liberer());
    expect(await screen.findByText(ADMIN_TEXTS.review.rejectSaved)).toBeInTheDocument();
    const bloc = screen.getByText(ADMIN_TEXTS.review.rejectedTitle).closest("section") as HTMLElement;
    expect(within(bloc).getByText("Les photos sont floues.")).toBeInTheDocument();
    expect(within(bloc).getByText(formatAdminDate("2026-11-17T12:00:00.000Z"), { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ADMIN_TEXTS.review.correct })).toBeInTheDocument();
    expect(rejectCalls(server)[0]).toEqual(["rejectVenue", v.id, "Les photos sont floues."]);
  });

  it("la salle reste un brouillon après un rejet : « Publier » reste proposé", async () => {
    const v = aVenue();
    renderReview(makeAdminServerDouble({ venues: [v] }), v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });
    fireEvent.change(reasonField(), { target: { value: "À revoir." } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject }));
    await screen.findByText(ADMIN_TEXTS.review.rejectSaved);
    expect(screen.getByText(ADMIN_TEXTS.review.status[VenuePublicationStatus.DRAFT])).toBeInTheDocument();
    expect(publish()).toBeEnabled();
  });

  it("R-3 — CORRIGER le motif : le nouveau motif part, l'avis montre le NOUVEAU motif (plus l'ancien)", async () => {
    const v = aVenue({ rejection: { reason: "Photos floues.", rejectedAt: "2026-11-12T10:15:00.000Z" } });
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    fireEvent.change(reasonField(), { target: { value: "Photos floues et capacité fausse." } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.correct }));
    expect(await screen.findByText(ADMIN_TEXTS.review.rejectSaved)).toBeInTheDocument();
    const bloc = screen.getByText(ADMIN_TEXTS.review.rejectedTitle).closest("section") as HTMLElement;
    expect(within(bloc).getByText("Photos floues et capacité fausse.")).toBeInTheDocument();
    expect(within(bloc).queryByText("Photos floues.")).toBeNull();
    expect(rejectCalls(server)[0]).toEqual(["rejectVenue", v.id, "Photos floues et capacité fausse."]);
  });

  it("MD-ADM-4 — la salle a été PUBLIÉE ailleurs entre-temps : « n'est plus un brouillon » en REFUS, la salle est relue (état « publiée », actions disparues) — aucun avis de rejet", async () => {
    const v = aVenue();
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    server.actElsewhere((s) => {
      const salle = s.venues.find((x) => x.id === v.id);
      if (salle) salle.publicationStatus = VenuePublicationStatus.PUBLISHED;
    });
    fireEvent.change(reasonField(), { target: { value: "Trop tard." } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.reject }));

    const a = await alerte();
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.codes.VENUE_NOT_DRAFT);
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.refusedPrefix);
    expect(screen.queryByText(ADMIN_TEXTS.review.rejectSaved)).toBeNull();
    expect(await screen.findByText(ADMIN_TEXTS.review.status[VenuePublicationStatus.PUBLISHED])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.review.reject })).toBeNull();
  });

  it("MD-ADM-4 — une AUTRE correction est passée entre-temps (409 VENUE_ALREADY_REJECTED) : un REFUS lisible, la salle est relue et montre le motif de l'autre", async () => {
    const v = aVenue({ rejection: { reason: "Premier motif.", rejectedAt: "2026-11-12T10:15:00.000Z" } });
    const server = makeAdminServerDouble({ venues: [v] });
    renderReview(server, v);
    await screen.findByRole("heading", { level: 1, name: v.nameFr });

    server.failNext("rejectVenue", new ApiError(409, "VENUE_ALREADY_REJECTED", "admin.errors.venueAlreadyRejected"));
    server.actElsewhere((s) => {
      const salle = s.venues.find((x) => x.id === v.id);
      if (salle) salle.rejection = { reason: "Motif de l'autre admin.", rejectedAt: "2026-11-17T11:00:00.000Z" };
    });
    fireEvent.change(reasonField(), { target: { value: "Mon motif." } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.review.correct }));

    const a = await alerte();
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.codes.VENUE_ALREADY_REJECTED);
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.refusedPrefix);
    const bloc = (await screen.findByText("Motif de l'autre admin.")).closest("section") as HTMLElement;
    expect(within(bloc).queryByText("Mon motif.")).toBeNull();
  });
});
