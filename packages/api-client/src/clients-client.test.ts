// Le client des FICHES CLIENT d'un pro — rang 41 (D336, L35-4 amendé) : K-1, K-2, K-3, K-3b.
//
// ⚠ Le double est un `AuthedRequest` qui ENREGISTRE ses appels : c'est la frontière du client (il ne fait que choisir la méthode, l'adresse et le corps).
// Les chemins sont aussi relevés dans les SOURCES par `contract-api-client.int-spec.ts` (D182) : chaque littéral vit DANS l'appel à `request(...)`.
import { describe, expect, it } from "vitest";
import { createProClientsClient } from "./clients-client";
import type { AuthedRequest } from "./venue-client";

interface Appel {
  readonly path: string;
  readonly init: { method?: string; body?: unknown; responseType?: "json" | "blob" } | undefined;
}

function double(reponse: unknown = { found: false }): { request: AuthedRequest; appels: Appel[] } {
  const appels: Appel[] = [];
  const request = (async (path: string, init?: Appel["init"]) => {
    appels.push({ path, init });
    return reponse;
  }) as AuthedRequest;
  return { request, appels };
}

const ID = "11111111-1111-4111-8111-111111111111";

describe("le client des fiches — méthode, adresse et corps de chaque contrat", () => {
  it("K-1 : `lookup` POSTE l'identifiant tel quel sur `/pro/clients/lookup` — un numéro, ou un e-mail", async () => {
    const { request, appels } = double();
    const client = createProClientsClient(request);
    await client.lookup({ phone: "+213555123456" });
    await client.lookup({ email: "amina@example.dz" });
    expect(appels).toEqual([
      { path: "/pro/clients/lookup", init: { method: "POST", body: { phone: "+213555123456" } } },
      { path: "/pro/clients/lookup", init: { method: "POST", body: { email: "amina@example.dz" } } }
    ]);
  });

  it("K-2 : `create` POSTE la fiche sur `/pro/clients`", async () => {
    const { request, appels } = double({ created: true, record: { id: ID } });
    await createProClientsClient(request).create({ phone: "+213555123456", nameLatin: "Amina Bensalem" });
    expect(appels).toEqual([{ path: "/pro/clients", init: { method: "POST", body: { phone: "+213555123456", nameLatin: "Amina Bensalem" } } }]);
  });

  it("K-3 : `completeNames` PATCHE `/pro/clients/:id/names` — K-3b : `update` PATCHE `/pro/clients/:id` ; deux routes distinctes", async () => {
    const { request, appels } = double({ id: ID });
    const client = createProClientsClient(request);
    await client.completeNames(ID, { nameAr: "آمنة" });
    await client.update(ID, { nameLatin: "Amina Bensalem" });
    expect(appels).toEqual([
      { path: `/pro/clients/${ID}/names`, init: { method: "PATCH", body: { nameAr: "آمنة" } } },
      { path: `/pro/clients/${ID}`, init: { method: "PATCH", body: { nameLatin: "Amina Bensalem" } } }
    ]);
  });

  it("l'identifiant est ENCODÉ : un identifiant qui porte « / » ou « ? » ne peut pas changer la route appelée", async () => {
    const { request, appels } = double({ id: ID });
    const client = createProClientsClient(request);
    await client.completeNames("a/b?c=d", { nameAr: "آمنة" });
    await client.update("a/b?c=d", { nameAr: "آمنة" });
    expect(appels.map((a) => a.path)).toEqual(["/pro/clients/a%2Fb%3Fc%3Dd/names", "/pro/clients/a%2Fb%3Fc%3Dd"]);
  });

  it("rend la réponse telle que la primitive l'a lue : le MÊME objet", async () => {
    const reponse = { found: true, record: { id: ID } };
    const { request } = double(reponse);
    expect(await createProClientsClient(request).lookup({ phone: "+213555123456" })).toBe(reponse);
  });
});
