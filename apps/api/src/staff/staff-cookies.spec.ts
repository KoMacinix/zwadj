// Les COOKIES du personnel — rang 44, L36-3a-1 (D341, MP-37, S-99). Un module PUR : les noms, les attributs, la lecture bornée. `Secure` suit le levier EXISTANT (`AUTH_COOKIE_SECURE`), jamais un second.
//
// ⛔ Ce que ce module garantit et que rien d'autre ne garantit : un jeton de personnel ne part JAMAIS sans `HttpOnly` ni `SameSite=Strict` ; la session n'a AUCUNE échéance côté navigateur (sa durée de vie
// est côté serveur : 10 min d'inactivité, 12 h) ; le cookie d'appareil ne voyage que vers `/api/v1/pro/staff`. ⚠ `SameSite=Strict` SUPPOSE l'application Pro et l'API sur le MÊME SITE (R-2 (D341)) :
// c'est une contrainte de mise en service, la même que celle du cookie de rafraîchissement en `Lax`.
import { describe, expect, it } from "vitest";
import { STAFF_LIMITS } from "@zwadj/types";
import {
  STAFF_DEVICE_COOKIE_PATH,
  STAFF_DEVICE_COOKIE_PREFIX,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_COOKIE_PATH,
  readDeviceCookies,
  readSessionCookie,
  staffDeviceCookieName,
  staffDeviceCookieOptions,
  staffSessionCookieOptions
} from "./staff-cookies";

/** Un jeton opaque de la forme réelle : 43 caractères base64url (256 bits). */
const jeton = (c: string) => c.repeat(43).slice(0, 43);

describe("noms et chemins", () => {
  it("la session est `zwadj_ss` sur `/api/v1` ; l'appareil `zwadj_dv_<suffixe>` sur `/api/v1/pro/staff`", () => {
    expect(STAFF_SESSION_COOKIE).toBe("zwadj_ss");
    expect(STAFF_SESSION_COOKIE_PATH).toBe("/api/v1");
    expect(STAFF_DEVICE_COOKIE_PREFIX).toBe("zwadj_dv_");
    expect(STAFF_DEVICE_COOKIE_PATH).toBe("/api/v1/pro/staff");
  });

  it("le nom du cookie de rafraîchissement n'est jamais celui d'un cookie du personnel (aucune collision, ni de nom ni de préfixe)", () => {
    expect(STAFF_SESSION_COOKIE).not.toBe("zwadj_rt");
    expect("zwadj_rt".startsWith(STAFF_DEVICE_COOKIE_PREFIX)).toBe(false);
    expect(STAFF_SESSION_COOKIE.startsWith(STAFF_DEVICE_COOKIE_PREFIX)).toBe(false);
  });
});

describe("staffSessionCookieOptions (MP-37)", () => {
  it("HttpOnly, SameSite=Strict, chemin `/api/v1`, `Secure` suit le paramètre — et AUCUNE échéance (cookie de session du navigateur)", () => {
    const options = staffSessionCookieOptions(true);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("strict");
    expect(options.path).toBe("/api/v1");
    expect(options.secure).toBe(true);
    expect(options.maxAge, "la durée de vie est côté serveur").toBeUndefined();
    expect(options.expires).toBeUndefined();
  });

  it("`Secure` vaut faux quand le levier existant vaut faux (développement local)", () => {
    expect(staffSessionCookieOptions(false).secure).toBe(false);
  });

  it("ne pose aucun `domain` : le cookie reste attaché à l'hôte qui l'a posé", () => {
    expect(staffSessionCookieOptions(true).domain).toBeUndefined();
  });
});

describe("staffDeviceCookieOptions (MP-37, R-6 (D341))", () => {
  it("HttpOnly, SameSite=Strict, chemin `/api/v1/pro/staff`, `Secure` suit le paramètre", () => {
    const options = staffDeviceCookieOptions(true);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("strict");
    expect(options.path).toBe("/api/v1/pro/staff");
    expect(options.secure).toBe(true);
    expect(staffDeviceCookieOptions(false).secure).toBe(false);
  });

  it("⛔ R-6 (D341) — l'échéance du cookie d'appareil est la durée du PIN (même levier), en millisecondes, dérivée de `STAFF_LIMITS.PIN_VALIDITY_DAYS`", () => {
    const attendu = STAFF_LIMITS.PIN_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
    expect(staffDeviceCookieOptions(true).maxAge).toBe(attendu);
  });
});

describe("staffDeviceCookieName", () => {
  it("préfixe le suffixe aléatoire", () => {
    expect(staffDeviceCookieName("abcd1234")).toBe("zwadj_dv_abcd1234");
    expect(staffDeviceCookieName("A-_z09Zk")).toBe("zwadj_dv_A-_z09Zk");
  });

  it("refuse un suffixe qui n'est pas de 8 caractères base64url (un nom de cookie ne se construit pas avec n'importe quoi)", () => {
    for (const mauvais of ["", "abc", "abcd12345", "ab cd123", "ab;cd123", "ab=cd123", "abcd123é"]) {
      expect(() => staffDeviceCookieName(mauvais), mauvais).toThrow();
    }
  });
});

describe("readSessionCookie", () => {
  it("rend le jeton quand il a la forme d'un jeton opaque (43 caractères base64url)", () => {
    expect(readSessionCookie({ zwadj_ss: jeton("a") })).toBe(jeton("a"));
  });

  it("rend `undefined` pour une valeur absente, trop courte, trop longue, mal formée ou qui n'est pas une chaîne (aucune requête SQL pour un déchet)", () => {
    expect(readSessionCookie(undefined)).toBeUndefined();
    expect(readSessionCookie({})).toBeUndefined();
    expect(readSessionCookie({ zwadj_ss: "court" })).toBeUndefined();
    expect(readSessionCookie({ zwadj_ss: jeton("a") + "a" })).toBeUndefined();
    expect(readSessionCookie({ zwadj_ss: "!".repeat(43) })).toBeUndefined();
    expect(readSessionCookie({ zwadj_ss: 42 })).toBeUndefined();
    expect(readSessionCookie({ zwadj_ss: [jeton("a")] })).toBeUndefined();
  });

  it("ne lit JAMAIS le cookie de rafraîchissement ni un cookie d'appareil à la place de la session", () => {
    expect(readSessionCookie({ zwadj_rt: jeton("a") })).toBeUndefined();
    expect(readSessionCookie({ zwadj_dv_abcd1234: jeton("a") })).toBeUndefined();
  });
});

describe("readDeviceCookies (MP-28, borne dure de 8)", () => {
  it("ne retient que les cookies de préfixe `zwadj_dv_` dont la valeur a la forme d'un jeton, avec leur nom", () => {
    const lus = readDeviceCookies({
      zwadj_dv_abcd1234: jeton("a"),
      zwadj_dv_wxyz9876: jeton("b"),
      zwadj_ss: jeton("c"),
      zwadj_rt: jeton("d"),
      autre: jeton("e"),
      zwadj_dv_malforme: "court"
    });
    expect(lus).toEqual([
      { name: "zwadj_dv_abcd1234", value: jeton("a") },
      { name: "zwadj_dv_wxyz9876", value: jeton("b") }
    ]);
  });

  it("⛔ lit AU PLUS `STAFF_LIMITS.DEVICE_COOKIES_MAX` cookies d'appareil et ignore le reste (une requête ne force pas une recherche de taille arbitraire)", () => {
    const cookies: Record<string, string> = {};
    for (let i = 0; i < STAFF_LIMITS.DEVICE_COOKIES_MAX + 4; i += 1) cookies[`zwadj_dv_${String(i).padStart(8, "0")}`] = jeton(String.fromCharCode(97 + (i % 26)));
    const lus = readDeviceCookies(cookies);
    expect(lus).toHaveLength(STAFF_LIMITS.DEVICE_COOKIES_MAX);
    expect(lus.map((l) => l.name)).toEqual(Object.keys(cookies).slice(0, STAFF_LIMITS.DEVICE_COOKIES_MAX));
  });

  it("une valeur qui n'est pas une chaîne est ignorée ; aucun cookie ⇒ liste vide", () => {
    expect(readDeviceCookies({ zwadj_dv_abcd1234: 12 })).toEqual([]);
    expect(readDeviceCookies(undefined)).toEqual([]);
    expect(readDeviceCookies({})).toEqual([]);
  });
});
