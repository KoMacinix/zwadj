/**
 * T3 / B6 — CONTRATS `apps/api` ↔ `packages/api-client` (D122).
 *
 * Le trou : rien ne relie ce que l'API EXPOSE à ce que le client CONSOMME.
 * TypeScript en couvre une partie — les deux côtés importent les mêmes DTO de
 * `@zwadj/types` — mais il ne voit ni les CHEMINS ni la forme réellement émise
 * sur le fil. Deux dérives passent donc les six portes sans un bruit :
 *
 *   1. une route renommée côté serveur pendant que le client l'appelle encore ;
 *   2. un `select` Prisma élargi, qui expédie au navigateur un champ que le DTO
 *      ne déclare pas — le type d'accident qui fait fuiter une donnée interne.
 *
 * ⚠ Ce fichier a une dette de naissance : `apps/client/src/lib/api.ts` ne passe
 * PAS par `@zwadj/api-client`. Il fait ses propres `fetch` SSR avec des `as`
 * non validés. Le test 1 ne couvre donc pas ces appels-là.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MetadataScanner } from "@nestjs/core";
import { ModulesContainer } from "@nestjs/core/injector/modules-container";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "B" };
const PRO = {
  role: "PRO",
  email: "pro@example.dz",
  password: "Motdepasse1",
  businessName: "Salles Pro",
  phone: "+213550000009"
};

const API_CLIENT_DIR = join(__dirname, "../../../../packages/api-client/src");

// ── 1. CONTRAT DE CHEMINS ────────────────────────────────────────────────────

interface ClientCall {
  file: string;
  method: string;
  path: string;
}

/**
 * Relève les appels du paquet client dans ses SOURCES.
 *
 * ⚠ Lire le source plutôt que d'exécuter le client est un choix : exécuter
 * n'atteindrait que les chemins effectivement appelés par les tests, donc
 * couvrirait ce qui est déjà couvert. On veut l'inverse — l'exhaustif.
 */
/** Texte de l'appel courant, borné par la parenthèse fermante correspondante. */
function untilCallEnd(src: string, from: number): string {
  let depth = 1; // la parenthèse ouvrante de l'appel est déjà consommée
  for (let i = from; i < src.length && i < from + 600; i += 1) {
    const c = src[i];
    if (c === "(") depth += 1;
    else if (c === ")") {
      depth -= 1;
      if (depth === 0) return src.slice(from, i);
    }
  }
  return src.slice(from, from + 600);
}

const partiels: string[] = [];

function collectClientCalls(): ClientCall[] {
  const out: ClientCall[] = [];
  partiels.length = 0;
  for (const file of readdirSync(API_CLIENT_DIR).filter((f) => f.endsWith(".ts") && !f.includes(".test."))) {
    const src = readFileSync(join(API_CLIENT_DIR, file), "utf8");
    // `request<T>("/chemin", { method: "POST" })` ou `` request(`/chemin/${x}`) ``
    const re = /\b(?:authedRequest|request|raw)\s*(?:<[^>]*>)?\s*\(\s*(`[^`]+`|"[^"]+")/g;
    for (const m of src.matchAll(re)) {
      // ⚠ Le chemin peut être CONCATÉNÉ sur plusieurs lignes (`` `…` + `…` ``).
      // Le littéral capturé n'est alors qu'un morceau : le comparer produirait
      // un faux orphelin. On les compte plutôt que de les ignorer en silence.
      // ⚠ FENÊTRE BORNÉE À L'APPEL COURANT, par équilibrage de parenthèses.
      // Une fenêtre à longueur fixe attrapait le `method:` de l'appel SUIVANT
      // et transformait des GET en POST : huit orphelins fabriqués de toutes
      // pièces. Un test qui accuse à tort est pire qu'un test absent.
      const suite = untilCallEnd(src, m.index! + m[0].length);
      if (/^\s*\+/.test(suite)) {
        partiels.push(`${file} — ${m[1]!.slice(0, 40)}…`);
        continue;
      }
      // ⚠ `method:` vit souvent sur la LIGNE SUIVANTE, hors de toute accolade
      // capturable par une regex simple. La première version lisait un groupe
      // `[^}]*` collé au littéral : elle rendait « GET » pour des PATCH et des
      // DELETE, et fabriquait quatre orphelins qui n'existaient pas.
      const method = (/method:\s*"(\w+)"/.exec(suite)?.[1] ?? "GET").toUpperCase();
      // Chaîne de requête retirée : `?${params}` n'appartient pas au chemin.
      const literal = m[1]!.slice(1, -1).split("?")[0]!;
      // `${...}` → segment quelconque. Vaut pour un paramètre comme pour un
      // littéral choisi à l'appel (`${action}` → accept|decline|…).
      out.push({ file, method, path: literal.replace(/\$\{[^}]*\}/g, "*") });
    }
  }
  return out;
}

interface ServerRoute {
  method: string;
  path: string;
}

/** Table des routes lue sur le routeur Nest — même source que le guard (D119). */
function collectServerRoutes(): ServerRoute[] {
  const scanner = new MetadataScanner();
  const modules = ctx.app.get(ModulesContainer);
  const verbs = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
  const out: ServerRoute[] = [];

  for (const module of modules.values()) {
    for (const wrapper of module.controllers.values()) {
      const instance = wrapper.instance as object | undefined;
      const metatype = wrapper.metatype as (new (...a: never[]) => unknown) | undefined;
      if (!instance || !metatype) continue;
      const base: string = Reflect.getMetadata("path", metatype) ?? "";
      const proto = Object.getPrototypeOf(instance) as object;
      for (const name of scanner.getAllMethodNames(proto)) {
        const handler = (proto as Record<string, unknown>)[name];
        if (typeof handler !== "function") continue;
        const sub: string | undefined = Reflect.getMetadata("path", handler);
        const verbIndex: number | undefined = Reflect.getMetadata("method", handler);
        if (sub === undefined || verbIndex === undefined) continue;
        const method = verbs[verbIndex];
        if (!method) continue;
        const path =
          "/" +
          [base, sub]
            .map((s) => s.replace(/^\/+|\/+$/g, ""))
            .filter(Boolean)
            .join("/");
        out.push({ method, path });
      }
    }
  }
  return out;
}

/** Un segment `*` côté client accepte n'importe quoi ; un `:param` côté serveur
 *  accepte n'importe quoi. Le reste doit coïncider au caractère près. */
function matches(clientPath: string, serverPath: string): boolean {
  const a = clientPath.split("/").filter(Boolean);
  const b = serverPath.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg === "*" || b[i]!.startsWith(":") || seg === b[i]);
}

// ── 2. CONTRAT DE FORME SUR LE FIL ───────────────────────────────────────────

/**
 * Jeux de clés GELÉS, relevés sur des réponses réelles.
 *
 * ⚠ Ce n'est pas un doublon des types : TypeScript accepte qu'une ligne Prisma
 * porte PLUS de champs que le DTO. Un `select` élargi passe donc le typecheck
 * et part quand même sur le fil. Ici, tout écart — champ ajouté comme champ
 * retiré — échoue jusqu'à ce que quelqu'un mette la liste à jour EN CONNAISSANCE
 * DE CAUSE. Même doctrine que la liste blanche RBAC (D119).
 */
const FORMES_GELEES: Record<string, string[]> = {
  "GET /api/v1/wilayas": ["id", "code", "nameFr", "nameAr", "cities"],
  "GET /api/v1/amenities": ["id", "key", "nameFr", "nameAr", "icon"]
};

beforeAll(async () => {
  ctx = await createTestApp();
  await truncateAll(ctx.prisma);
});

afterAll(async () => {
  await ctx.app.close();
});

describe("B6 — contrat de CHEMINS entre le client et l'API (D122)", () => {
  it("l'extraction trouve bien des appels des deux côtés (garde-fou du garde-fou)", () => {
    // Sans ceci, une regex cassée rendrait une liste vide — et le test suivant
    // serait vert en n'ayant rien comparé.
    expect(collectClientCalls().length).toBeGreaterThan(30);
    expect(collectServerRoutes().length).toBeGreaterThan(60);
    // ⚠ QUATRE chemins échappent au contrôle : ils sont construits par
    // concaténation sur plusieurs lignes, le littéral capturé n'en est qu'un
    // morceau. Les comparer fabriquerait de faux orphelins.
    //
    // Le nombre est GELÉ, pas ignoré : un cinquième fait échouer ce test tant
    // que personne ne l'a regardé. Le jour où ces quatre appels seront écrits
    // d'un seul tenant, ce plafond descendra — et le contrôle les couvrira.
    expect(
      partiels.length,
      `chemins concaténés non vérifiés :\n${partiels.join("\n")}`
    ).toBe(4);
  });

  it("CHAQUE chemin appelé par @zwadj/api-client existe sur le routeur Nest", () => {
    const routes = collectServerRoutes();
    const orphelins = collectClientCalls()
      .filter((call) => !routes.some((r) => r.method === call.method && matches(call.path, r.path)))
      .map((c) => `${c.method} ${c.path}   (${c.file})`)
      .sort();

    expect(
      orphelins,
      `Le client appelle des routes que l'API n'expose pas :\n${orphelins.join("\n")}\n\n` +
        `Soit la route a été renommée côté serveur, soit le client s'est trompé de chemin.`
    ).toEqual([]);
  });

  it("la VERBE compte autant que le chemin : un GET sur une route POST est un contrat rompu", () => {
    // Vérification du vérificateur : on fabrique un appel volontairement faux et
    // on s'assure que le comparateur le rejette. Sinon rien ne prouve que le
    // test ci-dessus sait dire non.
    const routes = collectServerRoutes();
    const faux = { method: "DELETE", path: "/auth/login" };
    expect(routes.some((r) => r.method === faux.method && matches(faux.path, r.path))).toBe(false);
  });
});

describe("B6 — contrat de FORME sur le fil (D122)", () => {
  it("les référentiels publics n'exposent QUE les champs déclarés", async () => {
    // Les référentiels sont seedés par les autres specs ; ici la base est vide,
    // on les crée donc à la main pour que la réponse ne soit pas vide — un
    // tableau vide ne prouverait aucune forme.
    const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
    await ctx.prisma.city.create({
      data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7, lng: 3.0 }
    });
    await ctx.prisma.amenity.create({ data: { key: "parking", nameFr: "Parking", nameAr: "موقف" } });

    const ecarts: string[] = [];
    for (const [signature, attendues] of Object.entries(FORMES_GELEES)) {
      const [, path] = signature.split(" ");
      const res = await request(ctx.app.getHttpServer()).get(path!).expect(200);
      const body = res.body as unknown;
      const premier = Array.isArray(body) ? body[0] : body;
      if (premier === undefined) {
        ecarts.push(`${signature} → réponse VIDE, la forme n'est pas vérifiable`);
        continue;
      }
      const observees = Object.keys(premier as object).sort();
      const gelees = [...attendues].sort();
      // Les DEUX sens comptent : un champ EN TROP est une fuite, un champ
      // MANQUANT casse le client.
      if (JSON.stringify(observees) !== JSON.stringify(gelees)) {
        ecarts.push(`${signature}\n    gelé   : ${gelees.join(", ")}\n    observé: ${observees.join(", ")}`);
      }
    }
    expect(ecarts, ecarts.join("\n")).toEqual([]);
  });

  it("la réponse d'authentification n'expose jamais le hash du mot de passe", async () => {
    // ⚠ Le cas concret que le contrôle « champ en trop » sert à empêcher. Un
    // `select` élargi d'une ligne suffirait, et rien d'autre ne le verrait.
    await registerUser(ctx, CLIENT);
    await verifyLastRegistered(ctx);
    const token = await loginAs(ctx, CLIENT.email, CLIENT.password);
    const me = await request(ctx.app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const serialise = JSON.stringify(me.body);
    for (const interdit of ["passwordHash", "password_hash", "tokenHash", "token_hash", "$argon2"]) {
      expect(serialise, `la réponse /auth/me contient « ${interdit} »`).not.toContain(interdit);
    }
  });

  it("un PRO fraîchement inscrit ne reçoit aucun champ interne dans sa session", async () => {
    await registerUser(ctx, PRO);
    await verifyLastRegistered(ctx);
    const token = await loginAs(ctx, PRO.email, PRO.password);
    const me = await request(ctx.app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const cles = Object.keys(me.body as object).sort();
    // Jeu gelé : tout ajout doit être un choix, pas un effet de bord d'un select.
    // ⚠ Jeu RELEVÉ sur `AuthUserDTO`, pas deviné. La première version en
    // inventait six ; il y en a onze. Une attente écrite de mémoire produit un
    // rouge qui ne prouve rien — c'est la troisième fois dans cette série.
    expect(cles, `clés observées : ${cles.join(", ")}`).toEqual(
      [
        "email",
        "emailVerified",
        "firstName",
        "hasGoogle",
        "hasPassword",
        "id",
        "lastName",
        "locale",
        "phone",
        "proProfile",
        "role"
      ].sort()
    );
  });
});
