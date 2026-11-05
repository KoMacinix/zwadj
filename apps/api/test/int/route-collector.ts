// Le COLLECTEUR DE ROUTES dérivé du routeur — rang 44, L36-3a-1 (D341). COPIE de la logique de `rbac-all-routes.int-spec.ts` (T2 / B10, D119), qui n'exporte pas la sienne : ce fichier-là n'est PAS modifié par ce lot
// (« pas de refactoring opportuniste en passant »). Le jour où un lot ouvre `rbac-all-routes.int-spec.ts` pour une autre raison, il peut importer ce collecteur — entrée de backlog écrite par D341.
//
// ⚠ LA TABLE EST DÉRIVÉE DU ROUTEUR, JAMAIS ÉCRITE À LA MAIN. Une liste de 55 chemins recopiée dans un test est une liste qui dérive : la route ajoutée demain n'y serait pas, et son absence ne ferait échouer
// aucun test. On lit les métadonnées `@Roles`, `@Public` et `@StaffExempt` là où les gardes les lisent eux-mêmes — sur les handlers, via le `Reflector`.
import type { INestApplication } from "@nestjs/common";
import { MetadataScanner, Reflector } from "@nestjs/core";
import { ModulesContainer } from "@nestjs/core/injector/modules-container";
import { IS_PUBLIC_KEY, ROLES_KEY } from "../../src/auth/auth.decorators";
import { STAFF_EXEMPT_KEY } from "../../src/staff/staff-decorators";

export interface RouteEntry {
  method: "get" | "post" | "patch" | "put" | "delete";
  /** Chemin complet, `:param` conservé : `/api/v1/venues/:id/publish`. */
  path: string;
  roles: string[];
  /** `@Public()` : une route publique n'a évidemment pas de rôle ; l'oublier ferait crier toute liste blanche sur les routes d'auth anonymes. */
  isPublic: boolean;
  /** `@StaffExempt()` — la liste blanche du garde du personnel. */
  staffExempt: boolean;
}

/** Parcourt les contrôleurs enregistrés et rend, pour chaque handler, le chemin complet, les rôles exigés, la publicité et l'exemption du garde du personnel. */
export function collectRoutes(app: INestApplication): RouteEntry[] {
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

        const roles = reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [handler, metatype]) ?? [];
        const isPublic = reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [handler, metatype]) === true;
        const staffExempt = reflector.getAllAndOverride<boolean | undefined>(STAFF_EXEMPT_KEY, [handler, metatype]) === true;
        const verbs = ["get", "post", "put", "delete", "patch"] as const;
        const method = verbs[methodIndex];
        if (!method) continue;

        const path = ["/api/v1", basePath, subPath]
          .map((s) => s.replace(/^\/+|\/+$/g, ""))
          .filter(Boolean)
          .join("/");
        out.push({ method, path: `/${path}`, roles, isPublic, staffExempt });
      }
    }
  }
  return out;
}

/** Remplace `:param` par un UUID valide : on veut être arrêté par un GARDE, pas par le pipe de validation (400) ni par un 404 de ressource. */
export const withIds = (path: string): string => path.replace(/:[A-Za-z]+/g, "00000000-0000-7000-8000-00000000000a");

/** Les routes qu'un compte PRO authentifié peut atteindre : celles qui exigent PRO, et les authentifiées SANS rôle (le compte commun). Jamais une route publique. */
export function routesDuPro(routes: RouteEntry[]): RouteEntry[] {
  return routes.filter((r) => !r.isPublic && (r.roles.length === 0 || r.roles.includes("PRO")));
}

export const signature = (r: Pick<RouteEntry, "method" | "path">): string => `${r.method.toUpperCase()} ${r.path}`;
