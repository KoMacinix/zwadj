/**
 * T2 / B10 — RBAC GÉNÉRALISÉ À TOUTES LES ROUTES (D119).
 *
 * ⚠ CE QUE `rbac.int-spec.ts` NE FAISAIT PAS.
 * Il monte un contrôleur-SONDE, écrit pour le test, et vérifie que le guard le
 * protège. Il prouve que `RolesGuard` fonctionne — il ne prouve rien sur les
 * 38 routes pro réelles. Une route livrée sans `@Roles`, ou avec le mauvais
 * rôle, passait les six portes sans un bruit.
 *
 * ⚠ LA TABLE EST DÉRIVÉE DU ROUTEUR, JAMAIS ÉCRITE À LA MAIN.
 * Une liste de 38 chemins recopiée dans un test est une liste qui dérive : la
 * route ajoutée demain n'y serait pas, et son absence ne ferait échouer aucun
 * test. On lit donc les métadonnées `@Roles` là où le guard les lit lui-même —
 * sur les handlers, via le `Reflector`. Ajouter une route pro la met sous test
 * le jour même, sans toucher à ce fichier.
 */
import { MetadataScanner, Reflector } from "@nestjs/core";
import { ModulesContainer } from "@nestjs/core/injector/modules-container";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IS_PUBLIC_KEY, ROLES_KEY } from "../../src/auth/auth.decorators";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;
let clientToken: string;
let proToken: string;
let adminToken: string;

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "B" };
const PRO = {
  role: "PRO",
  email: "pro@example.dz",
  password: "Motdepasse1",
  businessName: "Salles Pro",
  phone: "+213550000009"
};
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };

interface RouteEntry {
  method: "get" | "post" | "patch" | "put" | "delete";
  path: string;
  roles: string[];
  /** ⚠ `@Public()` doit être lu ICI aussi. Une route publique n'a évidemment
   *  pas de rôle ; l'oublier ferait crier la liste blanche sur les dix routes
   *  d'auth anonymes, et on prendrait l'habitude d'ignorer ce test. */
  isPublic: boolean;
}

/**
 * Parcourt les contrôleurs enregistrés et rend, pour chaque handler, le chemin
 * complet et les rôles exigés — exactement la source de vérité du guard.
 */
function collectRoutes(app: TestContext["app"]): RouteEntry[] {
  const reflector = app.get(Reflector);
  const scanner = new MetadataScanner();
  const modules = app.get(ModulesContainer);
  const out: RouteEntry[] = [];

  for (const module of modules.values()) {
    for (const wrapper of module.controllers.values()) {
      const instance = wrapper.instance as object | undefined;
      const metatype = wrapper.metatype as (new (...args: never[]) => unknown) | undefined;
      if (!instance || !metatype) continue;

      const basePath: string = Reflect.getMetadata("path", metatype) ?? "";
      const prototype = Object.getPrototypeOf(instance) as object;

      for (const name of scanner.getAllMethodNames(prototype)) {
        const handler = (prototype as Record<string, unknown>)[name] as ((...a: never[]) => unknown) | undefined;
        if (typeof handler !== "function") continue;
        const subPath: string | undefined = Reflect.getMetadata("path", handler);
        const methodIndex: number | undefined = Reflect.getMetadata("method", handler);
        if (subPath === undefined || methodIndex === undefined) continue;

        const roles =
          reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [handler, metatype]) ?? [];
        const isPublic = reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [handler, metatype]) === true;
        const verbs = ["get", "post", "put", "delete", "patch"] as const;
        const method = verbs[methodIndex];
        if (!method) continue;

        const path = ["/api/v1", basePath, subPath]
          .map((s) => s.replace(/^\/+|\/+$/g, ""))
          .filter(Boolean)
          .join("/");
        out.push({ method, path: `/${path}`, roles, isPublic });
      }
    }
  }
  return out;
}

/** Remplace `:param` par un UUID valide : on veut être arrêté par le GUARD,
 *  pas par le pipe de validation (400) ni par un 404 de ressource. */
const withIds = (path: string): string => path.replace(/:[A-Za-z]+/g, "00000000-0000-7000-8000-00000000000a");

beforeAll(async () => {
  ctx = await createTestApp();
  await truncateAll(ctx.prisma);

  await registerUser(ctx, CLIENT);
  await verifyLastRegistered(ctx);
  clientToken = await loginAs(ctx, CLIENT.email, CLIENT.password);

  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  proToken = await loginAs(ctx, PRO.email, PRO.password);

  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  adminToken = await loginAs(ctx, ADMIN.email, ADMIN.password);
});

afterAll(async () => {
  await ctx.app.close();
});

describe("B10 — RBAC sur TOUTES les routes réelles (D119)", () => {
  const call = (r: RouteEntry, token?: string) => {
    const req = request(ctx.app.getHttpServer())[r.method](withIds(r.path));
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };

  it("l'extraction de routes trouve bien la matrice attendue (garde-fou du garde-fou)", () => {
    // ⚠ Si l'extraction casse silencieusement, tous les tests ci-dessous
    // passeraient sur une liste VIDE — verts et vides. Ce test est ce qui rend
    // les autres crédibles.
    const routes = collectRoutes(ctx.app);
    const pro = routes.filter((r) => r.roles.includes("PRO"));
    const admin = routes.filter((r) => r.roles.includes("ADMIN"));
    expect(routes.length).toBeGreaterThan(60);
    expect(pro.length).toBeGreaterThanOrEqual(38);
    expect(admin.length).toBeGreaterThanOrEqual(5);
  });

  /**
   * ⚠ LE TEST QUI RATTRAPE LE TROU DES AUTRES.
   *
   * Tous les tests ci-dessous partent des routes qui DÉCLARENT un rôle. Une
   * route à qui on retire `@Roles` sort donc de leur périmètre : elle devient
   * atteignable par n'importe qui, et plus personne ne la regarde. C'est
   * exactement le défaut qu'on cherche, et il échappait à la formulation
   * « pour chaque route pro… ».
   *
   * On renverse : on énumère les routes authentifiées SANS rôle et on les
   * confronte à une liste blanche figée. Une route neuve sans `@Roles` fait
   * échouer ce test tant que quelqu'un ne l'a pas inscrite ici — donc tant que
   * personne n'a regardé. Même doctrine que le périmètre de fichiers en
   * livraison : on autorise nommément, on n'interdit pas au cas par cas.
   */
  const SANS_ROLE_AUTORISEES = new Set([
    // Lecture publique-mais-authentifiable : le rôle n'ajoute rien.
    "GET /api/v1/health",
    "GET /api/v1/amenities",
    "GET /api/v1/venue-styles",
    "GET /api/v1/wilayas",
    "GET /api/v1/media/:key",
    "GET /api/v1/venues",
    "GET /api/v1/venues/:slug",
    "GET /api/v1/venues/:slug/availability",
    "GET /api/v1/venues/:slug/visit-slots",
    // Surface « mon compte » : ouverte à TOUS les rôles par nature (D6 — une
    // route authentifiée sans restriction de rôle est le cas nominal).
    "GET /api/v1/auth/me",
    "PATCH /api/v1/me/profile",
    "POST /api/v1/me/change-email",
    "POST /api/v1/me/change-password",
    "GET /api/v1/me/deletion-request",
    "POST /api/v1/me/deletion-request",
    "POST /api/v1/me/deletion-request/cancel"
  ]);

  it("aucune route authentifiée n'est SANS rôle par accident (liste blanche)", () => {
    const orphelines = collectRoutes(ctx.app)
      .filter((r) => r.roles.length === 0 && !r.isPublic)
      .map((r) => `${r.method.toUpperCase()} ${r.path}`)
      .filter((sig) => !SANS_ROLE_AUTORISEES.has(sig))
      .sort();

    expect(
      orphelines,
      `Ces routes n'exigent aucun rôle. Si c'est voulu, inscris-les dans\n` +
        `SANS_ROLE_AUTORISEES avec la raison. Sinon, ajoute @Roles :\n${orphelines.join("\n")}`
    ).toEqual([]);
  });

  it("un CLIENT authentifié ne franchit AUCUNE route pro", async () => {
    const pro = collectRoutes(ctx.app).filter((r) => r.roles.includes("PRO") && !r.roles.includes("CLIENT"));
    const fuites: string[] = [];

    for (const route of pro) {
      const res = await call(route, clientToken);
      // 403 attendu. On tolère 404/400 : certaines routes valident un id avant
      // d'exister — mais JAMAIS 2xx, et jamais 500 (une erreur serveur cache
      // un guard qui n'a pas tranché).
      if (res.status < 400 || res.status >= 500) fuites.push(`${route.method.toUpperCase()} ${route.path} → ${res.status}`);
    }

    expect(fuites, `routes pro atteintes par un CLIENT :\n${fuites.join("\n")}`).toEqual([]);
  });

  it("un CLIENT authentifié ne franchit AUCUNE route admin", async () => {
    const admin = collectRoutes(ctx.app).filter((r) => r.roles.includes("ADMIN"));
    const fuites: string[] = [];
    for (const route of admin) {
      const res = await call(route, clientToken);
      if (res.status < 400 || res.status >= 500) fuites.push(`${route.method.toUpperCase()} ${route.path} → ${res.status}`);
    }
    expect(fuites, `routes admin atteintes par un CLIENT :\n${fuites.join("\n")}`).toEqual([]);
  });

  it("un PRO authentifié ne franchit AUCUNE route admin", async () => {
    const admin = collectRoutes(ctx.app).filter((r) => r.roles.includes("ADMIN"));
    const fuites: string[] = [];
    for (const route of admin) {
      const res = await call(route, proToken);
      if (res.status < 400 || res.status >= 500) fuites.push(`${route.method.toUpperCase()} ${route.path} → ${res.status}`);
    }
    expect(fuites, `routes admin atteintes par un PRO :\n${fuites.join("\n")}`).toEqual([]);
  });

  it("un PRO authentifié ne franchit AUCUNE route réservée au CLIENT", async () => {
    // Le sens souvent oublié : on protège les routes pro du client, et on
    // laisse les routes client ouvertes au pro « puisqu'il est plus haut ».
    // Il n'est pas plus haut — c'est un autre rôle.
    const clientOnly = collectRoutes(ctx.app).filter((r) => r.roles.includes("CLIENT") && !r.roles.includes("PRO"));
    const fuites: string[] = [];
    for (const route of clientOnly) {
      const res = await call(route, proToken);
      if (res.status < 400 || res.status >= 500) fuites.push(`${route.method.toUpperCase()} ${route.path} → ${res.status}`);
    }
    expect(fuites, `routes client atteintes par un PRO :\n${fuites.join("\n")}`).toEqual([]);
  });

  it("SANS jeton, aucune route à rôle n'est atteignable — et c'est un 401, pas un 403", async () => {
    // La distinction compte : 403 sur une requête anonyme révélerait que la
    // route existe et que seul le rôle manque. Le guard doit exiger l'identité
    // AVANT de juger le rôle.
    const gated = collectRoutes(ctx.app).filter((r) => r.roles.length > 0);
    const fuites: string[] = [];
    for (const route of gated) {
      const res = await call(route);
      if (res.status !== 401) fuites.push(`${route.method.toUpperCase()} ${route.path} → ${res.status}`);
    }
    expect(fuites, `routes à rôle mal fermées à l'anonyme :\n${fuites.join("\n")}`).toEqual([]);
  });

  it("l'ADMIN garde bien accès à SES routes (le test ne prouve pas juste que tout est fermé)", async () => {
    const admin = collectRoutes(ctx.app).filter((r) => r.roles.includes("ADMIN"));
    expect(admin.length).toBeGreaterThan(0);
    const refus: string[] = [];
    for (const route of admin) {
      const res = await call(route, adminToken);
      // 404 sur un id inventé est normal ; 403 ne l'est pas.
      if (res.status === 403) refus.push(`${route.method.toUpperCase()} ${route.path} → 403`);
    }
    expect(refus, `routes admin refusées à un ADMIN :\n${refus.join("\n")}`).toEqual([]);
  });
});
