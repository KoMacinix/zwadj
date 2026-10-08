// Le client des devis — la route du DOCUMENT (PDF). Rang 33 (D326), extension 4 de la table.
//
// ⛔ POURQUOI CE FICHIER EXISTE : `quotes.document` n'avait AUCUN test. Trois erreurs y passaient sans qu'aucune porte ne rougisse — le type de réponse (« blob » oublié :
// le PDF serait lu comme du JSON et planterait à la première lecture), la langue de repli (absente de l'adresse), l'identifiant non encodé. La spec e2e attend l'événement
// `download`, dont le DÉLAI n'est pas une morsure (D323) ; `contract-api-client.int-spec.ts` ne lit que les chemins (D182).
//
// ⚠ Le double est un `AuthedRequest` qui ENREGISTRE ses appels : c'est la frontière du client (il ne fait que choisir l'adresse et le type de réponse). L'authentification, le
// mutex et le rejeu après 401 sont mesurés dans `auth-client.test.ts` (« réponse binaire »), pas ici.
import { describe, expect, it } from "vitest";
import { createQuotesClient } from "./quotes-client";
import type { AuthedRequest } from "./venue-client";

interface Appel {
  readonly path: string;
  readonly init: { method?: string; body?: unknown; responseType?: "json" | "blob" } | undefined;
}

function double(reponse: unknown = new Blob(["%PDF-"], { type: "application/pdf" })): { request: AuthedRequest; appels: Appel[] } {
  const appels: Appel[] = [];
  const request = (async (path: string, init?: Appel["init"]) => {
    appels.push({ path, init });
    return reponse;
  }) as AuthedRequest;
  return { request, appels };
}

describe("quotes.document — la route du PDF", () => {
  it("⛔ lit la réponse en FICHIER (`responseType: \"blob\"`) : un PDF lu comme du JSON planterait à la première lecture", async () => {
    const { request, appels } = double();
    await createQuotesClient(request).document("11111111-1111-4111-8111-111111111111", "fr");
    expect(appels).toHaveLength(1);
    expect(appels[0]?.init?.responseType).toBe("blob");
  });

  it("GET : ni méthode ni corps — une lecture, rien d'écrit", async () => {
    const { request, appels } = double();
    await createQuotesClient(request).document("11111111-1111-4111-8111-111111111111", "ar");
    expect(appels[0]?.init?.method).toBeUndefined();
    expect(appels[0]?.init?.body).toBeUndefined();
  });

  it("la langue de repli voyage dans l'adresse, pour les DEUX langues : `?locale=fr` et `?locale=ar`", async () => {
    const { request, appels } = double();
    const client = createQuotesClient(request);
    await client.document("22222222-2222-4222-8222-222222222222", "fr");
    await client.document("22222222-2222-4222-8222-222222222222", "ar");
    expect(appels.map((a) => a.path)).toEqual([
      "/quotes/22222222-2222-4222-8222-222222222222/document?locale=fr",
      "/quotes/22222222-2222-4222-8222-222222222222/document?locale=ar"
    ]);
  });

  it("l'identifiant est ENCODÉ : un identifiant qui porte « / » ou « ? » ne peut pas changer la route appelée", async () => {
    const { request, appels } = double();
    await createQuotesClient(request).document("a/b?c=d", "fr");
    expect(appels[0]?.path).toBe("/quotes/a%2Fb%3Fc%3Dd/document?locale=fr");
  });

  it("rend le fichier tel que la primitive l'a lu : le MÊME Blob, sans le copier ni le retoucher", async () => {
    const fichier = new Blob(["%PDF-1.7"], { type: "application/pdf" });
    const { request } = double(fichier);
    const rendu = await createQuotesClient(request).document("33333333-3333-4333-8333-333333333333", "fr");
    expect(rendu).toBe(fichier);
  });
});
