// LE HACHEUR DU PIN — rang 58, L36-3b (D356, DR5, R-2, MP-11). Le SEUL fichier qui connaît le secret du HMAC et le SEUL qui calcule un HMAC : le PIN se stocke en HMAC-SHA-256 avec un secret serveur HORS base, jamais en
// clair (« 10 000 valeurs se cassent hors ligne en une seconde sans secret », DR5). Le secret arrive par le fournisseur `STAFF_PIN_SECRET` de `staff.module.ts` (la SEULE lecture de la variable, avec le schéma de
// `config/env.ts`) : ce fichier ne lit aucune variable d'environnement.
//
// ⛔ CE QUE CE FICHIER TIENT, chacun avec sa garde :
//   · UN calcul de HMAC par chemin (`digest`) : hacher, vérifier et vérifier contre le FACTICE coûtent la même chose — c'est ce qui rend le refus de la connexion par PIN identique quelle qu'en soit la cause (R-3,
//     compté par espion dans `staff-pin-hasher.spec.ts`) ;
//   · la comparaison est À TEMPS CONSTANT (`timingSafeEqual`), jamais `===` sur des hachés (garde de SOURCE de `staff-source-guards.spec.ts`) ;
//   · un haché MAL FORMÉ (vide, trop court, non hexadécimal) rend `false` et ne lève pas : la base peut contenir n'importe quoi, la connexion n'en fait pas une panne ;
//   · l'aléa est celui du système (`randomInt`, jamais `Math.random`).
// ⚠ Le HMAC porte sur le PIN SEUL (pas sur l'identifiant du membre) : à l'activation le membre n'existe pas encore quand le PIN est haché. Deux membres qui auraient le même PIN auraient le même haché — visible
// de qui lit la base, qui n'a pas le secret : décision de la session, écrite au rapport.
import { Inject, Injectable } from "@nestjs/common";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { generatePin } from "./staff-pin";

/** Le jeton d'injection du secret du HMAC (une chaîne, jamais journalisée). */
export const STAFF_PIN_SECRET = Symbol("STAFF_PIN_SECRET");

/** Le « haché » contre lequel `verifyAgainstDummy` compare : trente-deux octets nuls, jamais le haché d'un PIN — l'objet est de PAYER la comparaison, pas d'en tirer un verdict. */
const FACTICE = Buffer.alloc(32);

@Injectable()
export class StaffPinHasher {
  constructor(@Inject(STAFF_PIN_SECRET) private readonly secret: string) {}

  /** L'UNIQUE calcul de HMAC du module : les trois chemins qui hachent ou vérifient passent par lui. */
  private digest(pin: string): Buffer {
    return createHmac("sha256", this.secret).update(pin).digest();
  }

  /** Le HMAC-SHA-256 du PIN, en hexadécimal (64 caractères) — ce que la base stocke. */
  hash(pin: string): string {
    return this.digest(pin).toString("hex");
  }

  /** Le PIN présenté est-il celui dont `stored` est le haché ? À temps constant ; un haché mal formé rend `false`. */
  verify(pin: string, stored: string): boolean {
    const calcule = this.digest(pin);
    const lu = Buffer.from(stored, "hex");
    if (lu.length !== calcule.length) return false;
    return timingSafeEqual(calcule, lu);
  }

  /** Paie le MÊME coût qu'une vérification, pour un refus qui ne doit pas se distinguer d'un PIN faux (membre inconnu, PIN verrouillé…). Ne rend rien : jamais un verdict. */
  verifyAgainstDummy(pin: string): void {
    timingSafeEqual(this.digest(pin), FACTICE);
  }

  /** Un PIN neuf, non trivial, tiré par l'aléa du système. */
  generate(): string {
    return generatePin(randomInt);
  }
}
