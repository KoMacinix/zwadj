// Les COOKIES du personnel — rang 44, L36-3a-1 (D341, S-99, MP-37). Un module PUR : les noms, les chemins, les attributs, la lecture bornée. Rien ici ne lit l'environnement : `Secure` est un PARAMÈTRE, que l'appelant
// tire du levier EXISTANT (`AUTH_COOKIE_SECURE`) — jamais un second.
//
// ⛔ Deux jetons, deux cookies, tous deux `HttpOnly` et `SameSite=Strict` :
//   · la SESSION (`zwadj_ss`, chemin `/api/v1`) : AUCUNE échéance côté navigateur — sa durée de vie est côté serveur (10 minutes d'inactivité, 12 heures de plafond) ;
//   · l'APPAREIL (`zwadj_dv_<suffixe>`, chemin `/api/v1/pro/staff`) : UN cookie par membre reconnu sur ce poste, échéance = la durée du PIN (R-6 (D341), même levier).
// ⚠ `SameSite=Strict` SUPPOSE l'application Pro et l'API sur le MÊME SITE (R-2 (D341)) : c'est une contrainte de MISE EN SERVICE, la même que celle du cookie de rafraîchissement en `Lax`. Si Pro et API étaient
// sur deux sites, les quatre cookies tomberaient ensemble.
// ⚠ Ce que ce transport ne couvre pas : le XSS (`HttpOnly` empêche de LIRE un cookie, pas de l'UTILISER). Et aucune de ces routes n'est `@Public()` : toutes sont derrière `JwtAuthGuard`, qui exige le Bearer.
import type { CookieOptions } from "express";
import { STAFF_LIMITS } from "@zwadj/types";

export const STAFF_SESSION_COOKIE = "zwadj_ss";
export const STAFF_SESSION_COOKIE_PATH = "/api/v1";
export const STAFF_DEVICE_COOKIE_PREFIX = "zwadj_dv_";
export const STAFF_DEVICE_COOKIE_PATH = "/api/v1/pro/staff";

/** Un jeton opaque : 256 bits en base64url, 43 caractères. */
const JETON = /^[A-Za-z0-9_-]{43}$/;
/** Le suffixe aléatoire d'un nom de cookie d'appareil : 8 caractères base64url. */
const SUFFIXE = /^[A-Za-z0-9_-]{8}$/;

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

export type CookiesRecus = Record<string, unknown> | undefined;

export function staffSessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_SESSION_COOKIE_PATH };
}

export function staffDeviceCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_DEVICE_COOKIE_PATH, maxAge: STAFF_LIMITS.PIN_VALIDITY_DAYS * MS_PAR_JOUR };
}

/** Le nom du cookie d'un appareil. Refuse un suffixe qui n'est pas de 8 caractères base64url : un nom de cookie ne se construit pas avec n'importe quoi. */
export function staffDeviceCookieName(suffixe: string): string {
  if (!SUFFIXE.test(suffixe)) throw new Error("suffixe de cookie d'appareil invalide");
  return `${STAFF_DEVICE_COOKIE_PREFIX}${suffixe}`;
}

/** Le jeton de session présenté, ou `undefined` s'il est absent ou n'a pas la forme d'un jeton (aucune requête SQL pour un déchet). Ne lit QUE `zwadj_ss`. */
export function readSessionCookie(cookies: CookiesRecus): string | undefined {
  const valeur = cookies?.[STAFF_SESSION_COOKIE];
  return typeof valeur === "string" && JETON.test(valeur) ? valeur : undefined;
}

export interface CookieAppareil {
  name: string;
  value: string;
}

/**
 * Les cookies d'appareil présentés : seuls ceux de préfixe `zwadj_dv_` dont le suffixe et la valeur ont la bonne forme, AU PLUS `STAFF_LIMITS.DEVICE_COOKIES_MAX`, dans l'ordre où le navigateur les envoie.
 * ⛔ La borne est DURE : une requête ne force pas une recherche de taille arbitraire (MP-28).
 */
export function readDeviceCookies(cookies: CookiesRecus): CookieAppareil[] {
  if (cookies === undefined) return [];
  const lus: CookieAppareil[] = [];
  for (const [name, value] of Object.entries(cookies)) {
    if (lus.length >= STAFF_LIMITS.DEVICE_COOKIES_MAX) break;
    if (!name.startsWith(STAFF_DEVICE_COOKIE_PREFIX)) continue;
    if (!SUFFIXE.test(name.slice(STAFF_DEVICE_COOKIE_PREFIX.length))) continue;
    if (typeof value !== "string" || !JETON.test(value)) continue;
    lus.push({ name, value });
  }
  return lus;
}
