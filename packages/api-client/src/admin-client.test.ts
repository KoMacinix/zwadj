// Le client ADMIN — ADM-1 (D349, rang 51, R-7) : méthode, adresse et corps de chaque contrat `admin/`.
//
// ⚠ Le double est un `AuthedRequest` qui ENREGISTRE ses appels : c'est la frontière du client (il ne fait que choisir la méthode, l'adresse et le corps). Les chemins sont aussi
// relevés dans les SOURCES par `contract-api-client.int-spec.ts` (D182), qui les confronte au routeur Nest : chaque littéral vit DANS l'appel à `request(...)`.
// ⛔ MD-ADM-7 : AUCUNE méthode de ce client n'appelle `…/commission-rate` — le taux reste en lecture seule (R-1). La garde de SOURCE plus bas le mesure.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAdminClient } from "./admin-client";
import type { AuthedRequest } from "./venue-client";

interface Appel {
  readonly path: string;
  readonly init: { method?: string; body?: unknown; responseType?: "json" | "blob" } | undefined;
}

function double(reponse: unknown = {}): { request: AuthedRequest; appels: Appel[] } {
  const appels: Appel[] = [];
  const request = (async (path: string, init?: Appel["init"]) => {
    appels.push({ path, init });
    return reponse;
  }) as AuthedRequest;
  return { request, appels };
}

const ID = "11111111-1111-4111-8111-111111111111";

describe("le client admin — la file et le détail des salles", () => {
  it("`listPendingVenues` LIT `/admin/venues/pending-publication`, avec la page et la taille en querystring", async () => {
    const { request, appels } = double({ items: [], total: 0, page: 2, pageSize: 5 });
    await createAdminClient(request).listPendingVenues({ page: 2, pageSize: 5 });
    expect(appels).toHaveLength(1);
    expect(appels[0]?.path.split("?")[0]).toBe("/admin/venues/pending-publication");
    expect(new URLSearchParams(appels[0]!.path.split("?")[1]).get("page")).toBe("2");
    expect(new URLSearchParams(appels[0]!.path.split("?")[1]).get("pageSize")).toBe("5");
    expect(appels[0]?.init?.method ?? "GET").toBe("GET");
  });

  it("`listPendingVenues` sans argument : aucune clé inventée dans la querystring (le serveur applique ses défauts)", async () => {
    const { request, appels } = double();
    await createAdminClient(request).listPendingVenues();
    expect(appels[0]?.path.split("?")[1] ?? "").toBe("");
  });

  it("`getVenue` LIT `/admin/venues/:id`, l'identifiant encodé", async () => {
    const { request, appels } = double();
    await createAdminClient(request).getVenue(ID);
    expect(appels).toEqual([{ path: `/admin/venues/${ID}`, init: undefined }]);
  });

  it("`getVenue` encode un identifiant qui contiendrait un `/` : il ne sort pas de son segment", async () => {
    const { request, appels } = double();
    await createAdminClient(request).getVenue("a/b");
    expect(appels[0]?.path).toBe("/admin/venues/a%2Fb");
  });
});

describe("le client admin — publier et rejeter", () => {
  it("`publishVenue` POSTE `/admin/venues/:id/publish`, corps vide", async () => {
    const { request, appels } = double();
    await createAdminClient(request).publishVenue(ID);
    expect(appels).toEqual([{ path: `/admin/venues/${ID}/publish`, init: { method: "POST", body: {} } }]);
  });

  it("`rejectVenue` POSTE `/admin/venues/:id/reject` avec le motif, tel quel (le rognage est celui du serveur)", async () => {
    const { request, appels } = double();
    await createAdminClient(request).rejectVenue(ID, "Photos floues");
    expect(appels).toEqual([{ path: `/admin/venues/${ID}/reject`, init: { method: "POST", body: { reason: "Photos floues" } } }]);
  });
});

describe("le client admin — la file des suppressions de compte (routes qui existaient, sans client)", () => {
  it("`listDeletionRequests` LIT `/admin/deletion-requests` avec le statut demandé, et SANS statut laisse le défaut du serveur (PENDING)", async () => {
    const un = double([]);
    await createAdminClient(un.request).listDeletionRequests("APPROVED");
    expect(un.appels[0]?.path.split("?")[0]).toBe("/admin/deletion-requests");
    expect(new URLSearchParams(un.appels[0]!.path.split("?")[1]).get("status")).toBe("APPROVED");

    const deux = double([]);
    await createAdminClient(deux.request).listDeletionRequests();
    expect(deux.appels[0]?.path.split("?")[1] ?? "").toBe("");
  });

  it("`approveDeletion` et `rejectDeletion` POSTENT `/admin/deletion-requests/:id/approve|reject` avec la note quand elle existe", async () => {
    const { request, appels } = double();
    const client = createAdminClient(request);
    await client.approveDeletion(ID, "Vérifié avec la personne");
    await client.rejectDeletion(ID);
    expect(appels).toEqual([
      { path: `/admin/deletion-requests/${ID}/approve`, init: { method: "POST", body: { decisionNote: "Vérifié avec la personne" } } },
      { path: `/admin/deletion-requests/${ID}/reject`, init: { method: "POST", body: {} } }
    ]);
  });
});

describe("MD-ADM-7 (R-1) — aucune méthode du client n'écrit un taux", () => {
  it("la SOURCE du client admin ne nomme ni `commission-rate`, ni `commissionRateBps`, ni `cashbackRateBps`", () => {
    const src = readFileSync(join(__dirname, "admin-client.ts"), "utf8")
      .split(/\r?\n/)
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)) // les commentaires peuvent expliquer l'interdit ; les DÉCLARATIONS, jamais
      .join("\n");
    expect(src).not.toMatch(/commission-rate/);
    expect(src).not.toMatch(/commissionRateBps|cashbackRateBps/);
  });
});
