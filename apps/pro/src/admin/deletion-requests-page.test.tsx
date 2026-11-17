// ADM-2 (D350, rang 52, R-5 écran 3) — les demandes de suppression de compte : liste, rejeter avec motif, approuver APRÈS une confirmation qui dit que c'est IRRÉVERSIBLE.
//
// L'approbation anonymise le compte et archive ses salles : rien ne la défait. Ce que l'écran doit tenir, et que ce fichier mesure :
//  · AUCUN appel d'approbation avant la confirmation ; annuler ne part pas ; la confirmation DIT l'irréversible et le nombre de salles archivées ;
//  · une action n'est jamais affichée comme faite avant la réponse (MD-ADM-15) — le faux serveur n'enregistre qu'à la réponse ;
//  · une demande que l'utilisateur a ANNULÉE entre-temps (400 DELETION_REQUEST_NOT_PENDING) est un REFUS lisible, la liste est relue, jamais un « approuvée » ;
//  · rejeter exige un motif (restriction délibérée de l'écran, écrite : l'utilisateur dont le compte reste actif reçoit ce motif par e-mail) ;
//  · une panne n'est pas la liste vide (D217).
// Les textes viennent de l'AUTORITÉ (`ADMIN_TEXTS`), la date du formateur partagé, jamais recopiés (D209).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { initI18n } from "../i18n";
import { AdminClientProvider } from "./admin-client-context";
import { ADMIN_TEXTS, formatAdminDate } from "./admin-texts";
import { DeletionRequestsPage } from "./deletion-requests-page";
import { NetworkError, aDeletion, makeAdminServerDouble, type AdminServerDouble } from "../test-support/admin-doubles";

initI18n();
afterEach(cleanup);

function renderPage(server: AdminServerDouble) {
  return render(
    <MemoryRouter>
      <AdminClientProvider client={server.client}>
        <DeletionRequestsPage />
      </AdminClientProvider>
    </MemoryRouter>
  );
}
const carteDe = (email: string) => screen.getByText(email, { exact: false }).closest("li") as HTMLElement;
const appels = (s: AdminServerDouble, nom: string) => s.calls.filter((c) => c[0] === nom);

describe("la liste — ce que l'admin lit avant de décider", () => {
  it("une demande : l'adresse du compte, son rôle, la date de la demande, le motif de l'utilisateur (ou son absence), le nombre de salles qui seraient archivées", async () => {
    const pro = aDeletion({ userEmail: "pro@exemple.dz", userRole: "PRO", reason: "Je ferme ma salle.", venueCount: 3 });
    const client = aDeletion({ userEmail: "client@exemple.dz", userRole: "CLIENT", reason: null, venueCount: 0 });
    renderPage(makeAdminServerDouble({ deletions: [pro, client] }));

    const cartePro = within(await screen.findByText("pro@exemple.dz", { exact: false }).then((n) => n.closest("li") as HTMLElement));
    expect(cartePro.getByText(ADMIN_TEXTS.deletions.role.PRO)).toBeInTheDocument();
    expect(cartePro.getByText("Je ferme ma salle.")).toBeInTheDocument();
    expect(cartePro.getByText(formatAdminDate(pro.requestedAt), { exact: false })).toBeInTheDocument();
    expect(cartePro.getByText(ADMIN_TEXTS.deletions.venueCount(3), { exact: false })).toBeInTheDocument();

    const carteClient = within(carteDe("client@exemple.dz"));
    expect(carteClient.getByText(ADMIN_TEXTS.deletions.role.CLIENT)).toBeInTheDocument();
    expect(carteClient.getByText(ADMIN_TEXTS.deletions.noReason)).toBeInTheDocument();
    expect(carteClient.queryByText(ADMIN_TEXTS.deletions.venueCount(0), { exact: false })).toBeNull();
  });

  it("aucune demande : le message vide — et PAS d'alerte ; le titre est un `<h1>`", async () => {
    renderPage(makeAdminServerDouble());
    expect(await screen.findByRole("heading", { level: 1, name: ADMIN_TEXTS.deletions.title })).toBeInTheDocument();
    expect(await screen.findByText(ADMIN_TEXTS.deletions.empty)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("une PANNE n'est pas le vide : l'alerte, la relecture, jamais « aucune demande »", async () => {
    const server = makeAdminServerDouble({ deletions: [aDeletion({ userEmail: "pro@exemple.dz" })] });
    server.failNext("listDeletionRequests", new NetworkError());
    renderPage(server);
    expect(await screen.findByRole("alert")).toHaveTextContent(ADMIN_TEXTS.deletions.loadError);
    expect(screen.queryByText(ADMIN_TEXTS.deletions.empty)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.common.retry }));
    expect(await screen.findByText("pro@exemple.dz", { exact: false })).toBeInTheDocument();
  });
});

describe("approuver — IRRÉVERSIBLE : la confirmation d'abord", () => {
  it("cliquer « Approuver » ouvre la confirmation, qui DIT l'irréversible et le nombre de salles archivées ; AUCUN appel n'est parti", async () => {
    const d = aDeletion({ userEmail: "pro@exemple.dz", venueCount: 3 });
    const server = makeAdminServerDouble({ deletions: [d] });
    renderPage(server);
    await screen.findByText("pro@exemple.dz", { exact: false });

    fireEvent.click(within(carteDe("pro@exemple.dz")).getByRole("button", { name: ADMIN_TEXTS.deletions.approve }));
    const boite = await screen.findByRole("dialog");
    expect(within(boite).getByText(ADMIN_TEXTS.deletions.approveDialog.title)).toBeInTheDocument();
    expect(within(boite).getByText(ADMIN_TEXTS.deletions.approveDialog.description(3))).toBeInTheDocument();
    expect(appels(server, "approveDeletion")).toHaveLength(0);
  });

  it("ANNULER ferme la confirmation : aucun appel, la demande est toujours là", async () => {
    const server = makeAdminServerDouble({ deletions: [aDeletion({ userEmail: "pro@exemple.dz" })] });
    renderPage(server);
    await screen.findByText("pro@exemple.dz", { exact: false });

    fireEvent.click(within(carteDe("pro@exemple.dz")).getByRole("button", { name: ADMIN_TEXTS.deletions.approve }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: ADMIN_TEXTS.deletions.approveDialog.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(appels(server, "approveDeletion")).toHaveLength(0);
    expect(screen.getByText("pro@exemple.dz", { exact: false })).toBeInTheDocument();
  });

  it("CONFIRMER : un seul appel ; tant que la réponse est RETENUE la demande est là et aucun « approuvée » ; à la réponse : l'avis, et la demande quitte la file", async () => {
    const d = aDeletion({ userEmail: "pro@exemple.dz", venueCount: 1 });
    const server = makeAdminServerDouble({ deletions: [d] });
    renderPage(server);
    await screen.findByText("pro@exemple.dz", { exact: false });

    fireEvent.click(within(carteDe("pro@exemple.dz")).getByRole("button", { name: ADMIN_TEXTS.deletions.approve }));
    const liberer = server.hold();
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: ADMIN_TEXTS.deletions.approveDialog.confirm }));
    await waitFor(() => expect(appels(server, "approveDeletion")).toHaveLength(1));
    expect(screen.queryByText(ADMIN_TEXTS.deletions.approved("pro@exemple.dz"))).toBeNull();
    expect(screen.getByText("pro@exemple.dz", { exact: false })).toBeInTheDocument();

    await act(async () => liberer());
    expect(await screen.findByText(ADMIN_TEXTS.deletions.approved("pro@exemple.dz"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ADMIN_TEXTS.deletions.approve })).toBeNull();
    expect(appels(server, "approveDeletion")).toEqual([["approveDeletion", d.id, undefined]]);
  });

  it("MD-ADM-15 — l'utilisateur a ANNULÉ sa demande entre-temps (400 DELETION_REQUEST_NOT_PENDING) : un REFUS lisible, la liste est relue, la demande disparaît, AUCUN « approuvée »", async () => {
    const d = aDeletion({ userEmail: "pro@exemple.dz" });
    const server = makeAdminServerDouble({ deletions: [d] });
    renderPage(server);
    await screen.findByText("pro@exemple.dz", { exact: false });

    fireEvent.click(within(carteDe("pro@exemple.dz")).getByRole("button", { name: ADMIN_TEXTS.deletions.approve }));
    server.actElsewhere((s) => {
      const demande = s.deletions.find((x) => x.id === d.id);
      if (demande) demande.status = "CANCELLED";
    });
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: ADMIN_TEXTS.deletions.approveDialog.confirm }));

    const a = await screen.findByRole("alert");
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.codes.DELETION_REQUEST_NOT_PENDING);
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.refusedPrefix);
    expect(screen.queryByText(ADMIN_TEXTS.deletions.approved("pro@exemple.dz"))).toBeNull();
    await waitFor(() => expect(screen.queryByText("pro@exemple.dz", { exact: false })).toBeNull());
  });

  it("une PANNE pendant l'approbation : « le résultat est inconnu » (ni refusé ni approuvé), et la liste est RELUE pour dire la vérité", async () => {
    const d = aDeletion({ userEmail: "pro@exemple.dz" });
    const server = makeAdminServerDouble({ deletions: [d] });
    renderPage(server);
    await screen.findByText("pro@exemple.dz", { exact: false });

    server.failNext("approveDeletion", new NetworkError());
    fireEvent.click(within(carteDe("pro@exemple.dz")).getByRole("button", { name: ADMIN_TEXTS.deletions.approve }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: ADMIN_TEXTS.deletions.approveDialog.confirm }));

    const a = await screen.findByRole("alert");
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.unknownOutcome);
    expect(a).not.toHaveTextContent(ADMIN_TEXTS.errors.refusedPrefix);
    expect(screen.queryByText(ADMIN_TEXTS.deletions.approved("pro@exemple.dz"))).toBeNull();
    await waitFor(() => expect(appels(server, "listDeletionRequests")).toHaveLength(2));
  });
});

describe("rejeter — un motif, qui part à l'utilisateur", () => {
  const ouvrir = async (server: AdminServerDouble, email: string) => {
    renderPage(server);
    await screen.findByText(email, { exact: false });
    fireEvent.click(within(carteDe(email)).getByRole("button", { name: ADMIN_TEXTS.deletions.reject }));
  };

  it("sans motif (vide ou blanc) : le message, AUCUN appel ; le champ est obligatoire (D32)", async () => {
    const server = makeAdminServerDouble({ deletions: [aDeletion({ userEmail: "pro@exemple.dz" })] });
    await ouvrir(server, "pro@exemple.dz");

    const champ = screen.getByLabelText(ADMIN_TEXTS.deletions.noteLabel);
    expect(champ).toBeRequired();
    fireEvent.change(champ, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.deletions.confirmReject }));
    expect(await screen.findByText(ADMIN_TEXTS.errors.validation["admin.validation.decisionNoteRequired"])).toBeInTheDocument();
    expect(champ).toHaveAttribute("aria-invalid", "true");
    expect(appels(server, "rejectDeletion")).toHaveLength(0);
  });

  it("un motif trop long : le message de borne (celle de l'API, importée), aucun appel", async () => {
    const server = makeAdminServerDouble({ deletions: [aDeletion({ userEmail: "pro@exemple.dz" })] });
    await ouvrir(server, "pro@exemple.dz");
    fireEvent.change(screen.getByLabelText(ADMIN_TEXTS.deletions.noteLabel), { target: { value: "x".repeat(1001) } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.deletions.confirmReject }));
    expect(await screen.findByText(ADMIN_TEXTS.errors.validation["account.validation.decisionNoteTooLong"])).toBeInTheDocument();
    expect(appels(server, "rejectDeletion")).toHaveLength(0);
  });

  it("un motif valide part ROGNÉ ; à la réponse seulement l'avis « rejetée » ; la demande quitte la file", async () => {
    const d = aDeletion({ userEmail: "pro@exemple.dz" });
    const server = makeAdminServerDouble({ deletions: [d] });
    await ouvrir(server, "pro@exemple.dz");

    fireEvent.change(screen.getByLabelText(ADMIN_TEXTS.deletions.noteLabel), { target: { value: "  Commissions en cours de règlement.  " } });
    const liberer = server.hold();
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.deletions.confirmReject }));
    await waitFor(() => expect(appels(server, "rejectDeletion")).toHaveLength(1));
    expect(screen.queryByText(ADMIN_TEXTS.deletions.rejected("pro@exemple.dz"))).toBeNull();

    await act(async () => liberer());
    expect(await screen.findByText(ADMIN_TEXTS.deletions.rejected("pro@exemple.dz"))).toBeInTheDocument();
    expect(screen.queryByText("pro@exemple.dz", { exact: false, selector: "li *" })).toBeNull();
    expect(appels(server, "rejectDeletion")).toEqual([["rejectDeletion", d.id, "Commissions en cours de règlement."]]);
  });

  it("« Annuler » referme le formulaire de rejet sans rien envoyer", async () => {
    const server = makeAdminServerDouble({ deletions: [aDeletion({ userEmail: "pro@exemple.dz" })] });
    await ouvrir(server, "pro@exemple.dz");
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.deletions.cancelReject }));
    expect(screen.queryByLabelText(ADMIN_TEXTS.deletions.noteLabel)).toBeNull();
    expect(appels(server, "rejectDeletion")).toHaveLength(0);
  });

  it("demande déjà traitée (annulée entre-temps) : un REFUS lisible, la liste relue", async () => {
    const d = aDeletion({ userEmail: "pro@exemple.dz" });
    const server = makeAdminServerDouble({ deletions: [d] });
    await ouvrir(server, "pro@exemple.dz");
    server.actElsewhere((s) => {
      const demande = s.deletions.find((x) => x.id === d.id);
      if (demande) demande.status = "CANCELLED";
    });
    fireEvent.change(screen.getByLabelText(ADMIN_TEXTS.deletions.noteLabel), { target: { value: "Motif." } });
    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.deletions.confirmReject }));
    const a = await screen.findByRole("alert");
    expect(a).toHaveTextContent(ADMIN_TEXTS.errors.codes.DELETION_REQUEST_NOT_PENDING);
    expect(screen.queryByText(ADMIN_TEXTS.deletions.rejected("pro@exemple.dz"))).toBeNull();
  });
});
