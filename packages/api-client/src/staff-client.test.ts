// Le client du PERSONNEL — rang 44, L36-3a-1 (D341) : K-14 (activer), K-15 (se connecter), K-16 (se déconnecter), K-17 (l'état), K-18 (changer son mot de passe).
//
// ⚠ Le double est un `AuthedRequest` qui ENREGISTRE ses appels : c'est la frontière du client (il ne fait que choisir la méthode, l'adresse et le corps). Les chemins sont aussi relevés dans les
// SOURCES par `contract-api-client.int-spec.ts` (D182) : chaque littéral vit DANS l'appel à `request(...)`, sans intermédiaire.
// ⚠ Aucune règle ici : le nom de compte et le mot de passe sont validés par le contrat (`@zwadj/types`) à l'écran et au serveur. Aucun écran ne consomme ce client avant L36-4.
import { describe, expect, it } from "vitest";
import { createStaffClient } from "./staff-client";
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

describe("le client du personnel — méthode, adresse et corps de chaque contrat", () => {
  it("K-14 : `activate` POSTE le nom de compte et le mot de passe sur `/pro/staff/activate`", async () => {
    const { request, appels } = double({ member: { id: "m1" } });
    await createStaffClient(request).activate({ accountName: "Amine", password: "Motdepasse1" });
    expect(appels).toEqual([{ path: "/pro/staff/activate", init: { method: "POST", body: { accountName: "Amine", password: "Motdepasse1" } } }]);
  });

  it("K-15 : `login` POSTE sur `/pro/staff/login`", async () => {
    const { request, appels } = double({ member: { id: "m1" } });
    await createStaffClient(request).login({ accountName: "Amine", password: "Motdepasse1" });
    expect(appels).toEqual([{ path: "/pro/staff/login", init: { method: "POST", body: { accountName: "Amine", password: "Motdepasse1" } } }]);
  });

  it("K-16 : `logout` POSTE sur `/pro/staff/logout`, sans corps", async () => {
    const { request, appels } = double({ status: "ok" });
    await createStaffClient(request).logout();
    expect(appels).toEqual([{ path: "/pro/staff/logout", init: { method: "POST" } }]);
  });

  it("K-17 : `session` LIT `/pro/staff/session` (GET par défaut : aucune méthode ni corps)", async () => {
    const { request, appels } = double({ enabled: false, member: null, knownMembers: [] });
    const etat = await createStaffClient(request).session();
    expect(appels).toEqual([{ path: "/pro/staff/session", init: undefined }]);
    expect(etat).toEqual({ enabled: false, member: null, knownMembers: [] });
  });

  it("K-18 : `changePassword` POSTE l'actuel et le nouveau sur `/pro/staff/password`", async () => {
    const { request, appels } = double({ member: { id: "m1" } });
    await createStaffClient(request).changePassword({ currentPassword: "Ancien1motdepasse", newPassword: "Nouveau1motdepasse" });
    expect(appels).toEqual([{ path: "/pro/staff/password", init: { method: "POST", body: { currentPassword: "Ancien1motdepasse", newPassword: "Nouveau1motdepasse" } } }]);
  });

  it("le client rend EXACTEMENT ce que la requête rend (aucune transformation, aucune règle)", async () => {
    const corps = { member: { id: "m1", accountName: "Amine", role: "MANAGER", mustChangePassword: false } };
    const { request } = double(corps);
    expect(await createStaffClient(request).activate({ accountName: "Amine", password: "Motdepasse1" })).toBe(corps);
  });

  it("le client n'expose que les cinq contrats du lot (rien de la gestion du personnel ni du PIN : lots suivants)", () => {
    const { request } = double();
    expect(Object.keys(createStaffClient(request)).sort()).toEqual(["activate", "changePassword", "login", "logout", "session"]);
  });
});
