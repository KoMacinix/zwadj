// Les DÉCISIONS PURES de la couche du personnel — rang 44, L36-3a-1 (D341). Une garde du chemin d'identité vit dans un module SANS dépendance (D187) : elle se rejoue en millisecondes, sans base, et se
// NEUTRALISE à chaque passage (`neutralisation/neutralize-r44.py`). Le service et l'adaptateur ne font que lire, appeler et écrire ; ce qu'ils DÉCIDENT est ici.
//
// Quatre décisions :
//   1. `guardVerdict`          — le quatrième garde global laisse passer, ou exige une session (MP-20, MP-34, MP-35) ;
//   2. `classifySessionRefusal` — POURQUOI une session est refusée, et si ce refus s'écrit (MP-4, MP-13, MP-18, MP-19) ;
//   3. `loginVerification`     — la connexion paie-t-elle le VRAI hachage ou le FACTICE (MP-8, MP-17, R-3 (D341)) ;
//   4. `pickReusableDevice`    — quel appareil reconnu est réutilisable (MP-3).
// ⛔ AUCUNE horloge ici (MP-41) : le temps se décide dans la base. Les drapeaux `idle`, `capped`… arrivent DÉJÀ évalués par SQL (`now()` de la base).
import { StaffSessionEndReason } from "@zwadj/types";

// ── 1. Le garde ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface GuardInput {
  /** Le rôle du compte commun (`request.user.role`), ou `undefined` (route publique, identité absente). */
  role: string | undefined;
  /** La route porte `@StaffExempt()`. */
  exempt: boolean;
  /** La couche est activée pour la salle de ce compte (`staff_layer_enabled_at` non nul). */
  layerEnabled: boolean;
}

/**
 * ⛔ FERMÉ PAR DÉFAUT. Une session est exigée pour UN SEUL croisement : un PRO, sur une route non exemptée, la couche activée. Tout le reste passe : un ADMIN ou un CLIENT ne sont jamais concernés (MP-34),
 * une couche éteinte laisse l'app Pro marcher comme avant (MP-35), une route exemptée sert justement à en ouvrir une.
 */
export function guardVerdict(input: GuardInput): "pass" | "requireSession" {
  if (input.role !== "PRO") return "pass";
  if (input.exempt) return "pass";
  if (!input.layerEnabled) return "pass";
  return "requireSession";
}

// ── 2. Le refus d'une session ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Ce que la base dit d'un jeton présenté, EN DRAPEAUX évalués avec son horloge. */
export interface SessionProbe {
  /** Une session porte ce jeton. */
  found: boolean;
  /** Le membre de la session est de la MÊME salle que le compte commun (le Bearer). */
  sameVenue: boolean;
  /** La session a une fin (`ended_at` non nul). */
  ended: boolean;
  /** Le membre est ACTIF. */
  memberActive: boolean;
  /** Le plafond absolu est atteint (`expires_at <= now()`). */
  capped: boolean;
  /** L'inactivité a dépassé la durée admise. */
  idle: boolean;
}

export type SessionRefusalReason = "absent" | "foreign" | "ended" | "disabled" | "capped" | "idle";

/** L'erreur que lève `classifySessionRefusal` sur une session vivante : une classe à part, pour que l'appelant n'attrape QUE celle-là (jamais une panne quelconque). */
export class SessionNotRefusedError extends Error {
  constructor() {
    super("classifySessionRefusal : la session est vivante, il n'y a rien à refuser");
    this.name = "SessionNotRefusedError";
  }
}

export interface SessionRefusal {
  reason: SessionRefusalReason;
  /** La fin à ÉCRIRE sur la session, ou `null` quand le refus ne s'écrit pas. */
  endWith: StaffSessionEndReason | null;
}

/**
 * Pourquoi une session vivante ne l'est plus. L'ordre est celui de la cause la plus précise d'abord : une autre salle l'emporte sur tout (⛔ et RIEN ne s'écrit : on ne termine pas la session d'autrui parce
 * qu'un cookie a été présenté avec le mauvais Bearer) ; déjà terminée, rien à ajouter ; membre désactivé, la fin DISABLED s'écrit ; plafond atteint, rien ne s'écrit (l'énumération des fins n'a pas de valeur
 * « plafond » : le schéma est ratifié, DR8) ; inactive, la fin IDLE s'écrit. ⚠ Cette fonction LÈVE sur une session vivante : l'appelant ne classe pas ce qu'il vient d'accepter.
 */
export function classifySessionRefusal(probe: SessionProbe): SessionRefusal {
  if (!probe.found) return { reason: "absent", endWith: null };
  if (!probe.sameVenue) return { reason: "foreign", endWith: null };
  if (probe.ended) return { reason: "ended", endWith: null };
  if (!probe.memberActive) return { reason: "disabled", endWith: StaffSessionEndReason.DISABLED };
  if (probe.capped) return { reason: "capped", endWith: null };
  if (probe.idle) return { reason: "idle", endWith: StaffSessionEndReason.IDLE };
  throw new SessionNotRefusedError();
}

// ── 3. La connexion : le vrai hachage ou le factice ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface LoginVerificationInput {
  /** Un membre de ce nom existe dans cette salle. */
  memberFound: boolean;
  /** Il est actif. */
  memberActive: boolean;
  /** La tentative a été RÉSERVÉE par le magasin (ni éteint, ni en pause). */
  reserved: boolean;
}

/**
 * ⛔ Le VRAI hachage n'est vérifié que quand le membre existe, est actif ET que la tentative a été réservée. Dans tous les autres cas — compte inconnu, membre désactivé, PAUSE (R-3 (D341)) — la requête paie le
 * hachage FACTICE (D5) : même coût, même réponse. C'est aussi ce qui borne le travail : vingt requêtes parallèles ne font pas vingt vérifications du vrai hachage (MP-17).
 */
export function loginVerification(input: LoginVerificationInput): "real" | "dummy" {
  return input.memberFound && input.memberActive && input.reserved ? "real" : "dummy";
}

// ── 4. L'appareil reconnu ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un appareil trouvé par le hachage d'un cookie présenté, avec le membre qui le porte, ses drapeaux évalués par SQL. */
export interface DeviceRow {
  id: string;
  memberId: string;
  proProfileId: string;
  revoked: boolean;
  expired: boolean;
}

/**
 * Le premier appareil réutilisable, dans l'ordre de lecture des cookies : CE membre, CETTE salle, ni révoqué ni expiré. ⛔ L'appareil d'un autre membre ou d'une autre salle n'est JAMAIS réutilisé (MP-3) :
 * le PIN (lot 3b) ne se prête pas d'un membre à l'autre.
 */
export function pickReusableDevice(rows: readonly DeviceRow[], memberId: string, proProfileId: string): DeviceRow | null {
  return rows.find((d) => d.memberId === memberId && d.proProfileId === proProfileId && !d.revoked && !d.expired) ?? null;
}
