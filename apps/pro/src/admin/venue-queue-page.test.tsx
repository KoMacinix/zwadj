// ADM-2 (D350, rang 52, R-5 écran 1) — la file des salles en attente de validation : ce que l'ADMIN lit avant de décider.
//
//  · chaque salle (nom FR, nom AR en `lang="ar" dir="rtl"`, ville, professionnel, créneaux actifs) et un lien vers son détail ;
//  · une salle DÉJÀ REJETÉE est marquée, avec son motif et sa DATE, et rangée après les autres — l'ordre du serveur est celui de l'écran ;
//  · l'ERREUR n'est pas le VIDE (MD-ADM-15, D217) : une panne ne se lit jamais « aucune salle en attente » ;
//  · la pagination suit l'ÉCHO du serveur (`page`, `pageSize`, `total`), jamais ce que le client croit avoir demandé (D212).
// Les textes viennent de l'AUTORITÉ (`ADMIN_TEXTS`) et la date du formateur partagé (`formatAdminDate`), jamais recopiés (D209).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { VENUE_PENDING_PAGE_SIZE_DEFAULT } from "@zwadj/types";
import { initI18n } from "../i18n";
import { ADMIN_PATH, adminVenuePath } from "../routes";
import { AdminClientProvider } from "./admin-client-context";
import { ADMIN_TEXTS } from "./admin-texts";
import { formatAdminDate } from "./admin-format";
import { VenueQueuePage } from "./venue-queue-page";
import { NetworkError, aVenue, makeAdminServerDouble, type AdminServerDouble } from "../test-support/admin-doubles";

initI18n();
afterEach(cleanup);

function Chemin() {
  const l = useLocation();
  return <output data-testid="chemin">{l.pathname + l.search}</output>;
}

function renderQueue(server: AdminServerDouble, entry = ADMIN_PATH) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AdminClientProvider client={server.client}>
        <Chemin />
        <Routes>
          <Route path={ADMIN_PATH} element={<VenueQueuePage />} />
        </Routes>
      </AdminClientProvider>
    </MemoryRouter>
  );
}

describe("la file — ce que l'admin lit", () => {
  it("une salle : son nom français, son nom arabe en `lang=\"ar\" dir=\"rtl\"`, sa ville, son professionnel, ses créneaux, et un lien vers SON détail", async () => {
    const v = aVenue();
    renderQueue(makeAdminServerDouble({ venues: [v] }));

    const lien = await screen.findByRole("link", { name: v.nameFr });
    expect(lien).toHaveAttribute("href", adminVenuePath(v.id));
    const arabe = screen.getByText(v.nameAr);
    expect(arabe.getAttribute("lang")).toBe("ar");
    expect(arabe.getAttribute("dir")).toBe("rtl");
    const ligne = lien.closest("li");
    expect(ligne).not.toBeNull();
    const dedans = within(ligne as HTMLElement);
    expect(dedans.getByText(v.cityNameFr, { exact: false })).toBeInTheDocument();
    expect(dedans.getByText(v.ownerBusinessName, { exact: false })).toBeInTheDocument();
    expect(dedans.getByText(ADMIN_TEXTS.queue.slots(v.activeSlotCount), { exact: false })).toBeInTheDocument();
  });

  it("le titre est un `<h1>` et le total est annoncé", async () => {
    const server = makeAdminServerDouble({ venues: [aVenue(), aVenue(), aVenue()] });
    renderQueue(server);
    expect(await screen.findByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title })).toBeInTheDocument();
    expect(await screen.findByText(ADMIN_TEXTS.queue.total(3))).toBeInTheDocument();
  });

  it("une salle DÉJÀ REJETÉE porte la marque, son motif et sa date ; une salle jamais rejetée n'en porte aucune", async () => {
    const neuve = aVenue();
    const refusee = aVenue({ rejection: { reason: "Les photos sont floues.", rejectedAt: "2026-11-12T10:15:00.000Z" } });
    renderQueue(makeAdminServerDouble({ venues: [neuve, refusee] }));

    const ligneRefusee = (await screen.findByRole("link", { name: refusee.nameFr })).closest("li") as HTMLElement;
    const r = within(ligneRefusee);
    expect(r.getByText(ADMIN_TEXTS.queue.rejectedBadge)).toBeInTheDocument();
    expect(r.getByText("Les photos sont floues.")).toBeInTheDocument();
    expect(r.getByText(formatAdminDate("2026-11-12T10:15:00.000Z"), { exact: false })).toBeInTheDocument();

    const ligneNeuve = screen.getByRole("link", { name: neuve.nameFr }).closest("li") as HTMLElement;
    expect(within(ligneNeuve).queryByText(ADMIN_TEXTS.queue.rejectedBadge)).toBeNull();
  });

  it("une rejetée dont le journal n'a pas de date n'affiche PAS de date inventée", async () => {
    const refusee = aVenue({ rejection: { reason: "Motif sans date.", rejectedAt: null } });
    renderQueue(makeAdminServerDouble({ venues: [refusee] }));
    const ligne = (await screen.findByRole("link", { name: refusee.nameFr })).closest("li") as HTMLElement;
    expect(within(ligne).getByText("Motif sans date.")).toBeInTheDocument();
    expect(within(ligne).queryByText(ADMIN_TEXTS.queue.rejectedOnLabel, { exact: false })).toBeNull();
  });

  it("l'ordre du SERVEUR est celui de l'écran : les jamais rejetées d'abord, les rejetées ensuite", async () => {
    const refusee = aVenue({ rejection: { reason: "À corriger.", rejectedAt: "2026-11-12T10:15:00.000Z" } });
    const a = aVenue();
    const b = aVenue();
    // Le faux serveur est rangé « rejetée en premier » dans sa mémoire ; il rend sa file dans l'ordre du vrai serveur.
    renderQueue(makeAdminServerDouble({ venues: [refusee, a, b] }));
    await screen.findByRole("link", { name: a.nameFr });
    const noms = screen.getAllByRole("link").filter((l) => [a, b, refusee].some((v) => v.nameFr === l.textContent)).map((l) => l.textContent);
    expect(noms).toEqual([a.nameFr, b.nameFr, refusee.nameFr]);
  });
});

describe("la file — vide, panne, rechargement (MD-ADM-15)", () => {
  it("aucune salle : le message « aucune salle en attente » — et PAS d'alerte", async () => {
    renderQueue(makeAdminServerDouble());
    expect(await screen.findByText(ADMIN_TEXTS.queue.empty)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("une PANNE n'est pas le vide : l'alerte, un bouton de relecture, et jamais « aucune salle en attente »", async () => {
    const server = makeAdminServerDouble({ venues: [aVenue()] });
    server.failNext("listPendingVenues", new NetworkError());
    renderQueue(server);

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(ADMIN_TEXTS.queue.loadError);
    expect(screen.queryByText(ADMIN_TEXTS.queue.empty)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.common.retry }));
    expect(await screen.findByRole("link", { name: server.venues[0]?.nameFr ?? "" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("la file — la pagination suit ce que le serveur a APPLIQUÉ", () => {
  const treize = () => Array.from({ length: VENUE_PENDING_PAGE_SIZE_DEFAULT + 2 }, () => aVenue());

  it("deux pages : « page 1 sur 2 », « précédente » inactive, « suivante » demande la page 2 et l'adresse la porte", async () => {
    const server = makeAdminServerDouble({ venues: treize() });
    renderQueue(server);
    expect(await screen.findByText(ADMIN_TEXTS.queue.pagination.page(1, 2))).toBeInTheDocument();
    expect(screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("/admin/salles/"))).toHaveLength(VENUE_PENDING_PAGE_SIZE_DEFAULT);
    expect((screen.getByRole("button", { name: ADMIN_TEXTS.queue.pagination.previous }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: ADMIN_TEXTS.queue.pagination.next }));
    expect(await screen.findByText(ADMIN_TEXTS.queue.pagination.page(2, 2))).toBeInTheDocument();
    expect(screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("/admin/salles/"))).toHaveLength(2);
    expect((screen.getByRole("button", { name: ADMIN_TEXTS.queue.pagination.next }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("chemin").textContent).toBe(`${ADMIN_PATH}?page=2`);
    expect(server.calls.filter((c) => c[0] === "listPendingVenues").map((c) => (c[1] as { page?: number } | undefined)?.page)).toEqual([1, 2]);
  });

  it("une adresse `?page=2` ouvre la page 2 (la page est dans l'adresse, pas dans un état caché)", async () => {
    renderQueue(makeAdminServerDouble({ venues: treize() }), `${ADMIN_PATH}?page=2`);
    expect(await screen.findByText(ADMIN_TEXTS.queue.pagination.page(2, 2))).toBeInTheDocument();
  });

  it("une page qui n'existe plus (la file a rétréci) n'est pas un écran vide : le message « aucune salle » et un retour à la page 1", async () => {
    renderQueue(makeAdminServerDouble({ venues: [aVenue()] }), `${ADMIN_PATH}?page=5`);
    await waitFor(() => expect(screen.queryByText(ADMIN_TEXTS.common.loading)).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(await screen.findByRole("link", { name: ADMIN_TEXTS.queue.pagination.backToFirst })).toBeInTheDocument();
  });

  it("une seule page : aucune pagination", async () => {
    renderQueue(makeAdminServerDouble({ venues: [aVenue()] }));
    await screen.findByRole("heading", { level: 1, name: ADMIN_TEXTS.queue.title });
    await screen.findByText(ADMIN_TEXTS.queue.total(1));
    expect(screen.queryByRole("navigation", { name: ADMIN_TEXTS.queue.pagination.label })).toBeNull();
  });
});
