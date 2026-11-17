// ADM-1 (D349, rang 51) — les contrats de la MODÉRATION des salles : la file « en attente de publication », le détail pour l'admin, le rejet avec motif, la lecture du refus par le pro, et les
// noms des actions du journal (`audit_logs`).
//
// ⚠ UN FICHIER NEUF ET NON UN BLOC DE `venue.ts` : `venue.ts` est dans la liste de la branche `par-carte` (R-8, `docs/preuves/D349/par-carte-fichiers.txt`) — un bloc ajouté ou déplacé y devient
// un conflit au moment de l'intégrer. Un fichier neuf n'en a aucun. ⚠ Il n'a PAS de texte français ni arabe : D-2 (arbitrage de Ko, D321) — les textes de l'admin vivent hors de
// `packages/i18n`, avec l'écran (ADM-2) ; les clés `admin.*` ci-dessous sont des identifiants stables, pas des entrées des catalogues, et la porte de parité FR = AR ne les voit pas.
// ⛔ R-1 — AUCUN taux ici, sauf par héritage : `VenueAdminDetailDTO` étend `VenueAdminDTO`, qui porte déjà les deux taux (le détail les AFFICHE, en lecture seule).
import { z } from "zod";
import type { VenuePublicationStatus } from "./enums";
import type { VenueAdminDTO } from "./venue";

// ── Le rejet ────────────────────────────────────────────────────────────────

/** Longueur maximale du motif d'un rejet, APRÈS rognage. Même borne que la note de décision d'une suppression de compte (`deletionDecisionSchema`, 1000) : deux champs de texte libre
 *  écrits par l'admin, une seule valeur (D55 : le cas réel — un motif de quelques phrases — tient très largement ; la borne protège la base, pas le rédacteur). */
export const VENUE_REJECTION_REASON_MAX = 1000;

/** POST /admin/venues/:id/reject — le motif est OBLIGATOIRE (D-4, Ko) : un rejet sans raison laisserait le pro sans rien à corriger. */
export const venueRejectSchema = z
  .object({
    reason: z
      .string({ required_error: "admin.validation.rejectionReasonRequired", invalid_type_error: "admin.validation.rejectionReasonRequired" })
      .trim()
      .min(1, "admin.validation.rejectionReasonRequired")
      .max(VENUE_REJECTION_REASON_MAX, "admin.validation.rejectionReasonTooLong")
  })
  .strict("admin.validation.unknownKey");
export type VenueRejectInput = z.infer<typeof venueRejectSchema>;

/** Le refus d'une salle, tel que l'admin ET le pro le lisent. `rejectedAt` est la date de la ligne du journal du rejet ; `null` si le journal n'a pas de ligne (motif écrit à la main en base) —
 *  jamais une date inventée. */
export interface VenueRejectionDTO {
  reason: string;
  /** ISO 8601, ou `null`. */
  rejectedAt: string | null;
}

/** Réponse de `POST /admin/venues/:id/reject`. ⛔ R-1 : ce n'est PAS un `VenueAdminDTO` — un rejet ne lit ni n'écrit un taux, sa réponse non plus. La salle reste un brouillon. */
export interface VenueRejectResultDTO {
  id: string;
  publicationStatus: VenuePublicationStatus;
  rejection: VenueRejectionDTO;
}

// ── La file « en attente de publication » (D-6, l2) ─────────────────────────

/** Mêmes valeurs que l'enveloppe de pagination de la liste publique (A3-⑤ : `pageSize` défaut 12, maximum 50). Répétées ICI parce que `venue.ts` ne les exporte pas et qu'y toucher est
 *  interdit (R-8) ; une entrée de backlog propose de les exporter une fois `par-carte` intégrée. */
export const VENUE_PENDING_PAGE_SIZE_DEFAULT = 12;
export const VENUE_PENDING_PAGE_SIZE_MAX = 50;

/** GET /admin/venues/pending-publication — page et taille, rien d'autre : la file n'a ni filtre de statut ni d'identifiant (`.strict()`). */
export const venuePendingQuerySchema = z
  .object({
    page: z.coerce
      .number({ invalid_type_error: "admin.validation.pageInvalid" })
      .int("admin.validation.pageInvalid")
      .min(1, "admin.validation.pageInvalid")
      .default(1),
    pageSize: z.coerce
      .number({ invalid_type_error: "admin.validation.pageSizeRange" })
      .int("admin.validation.pageSizeRange")
      .min(1, "admin.validation.pageSizeRange")
      .max(VENUE_PENDING_PAGE_SIZE_MAX, "admin.validation.pageSizeRange")
      .default(VENUE_PENDING_PAGE_SIZE_DEFAULT)
  })
  .strict("admin.validation.unknownKey");
/** Ce que le client PEUT envoyer (tout est facultatif) ; le serveur applique les défauts. */
export type VenuePendingQueryInput = z.input<typeof venuePendingQuerySchema>;
/** Ce que le service reçoit, défauts appliqués. */
export type VenuePendingQuery = z.output<typeof venuePendingQuerySchema>;

/** Une ligne de la file. ⛔ R-1 : aucun taux. `rejection` non nul = « déjà rejetée » (R-2) : la salle reste dans la file, rangée après les autres. */
export interface VenuePendingItemDTO {
  id: string;
  /** Le numéro de la salle (séquence de la plateforme, D333). */
  number: number;
  slug: string;
  nameFr: string;
  nameAr: string;
  cityNameFr: string;
  cityNameAr: string;
  /** Le nom commercial du pro (`ProProfile.businessName`) — jamais un nom de personne, jamais un e-mail. */
  ownerBusinessName: string;
  /** Au moins 1 : c'est la condition de la file (D-6, l2). */
  activeSlotCount: number;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
  rejection: VenueRejectionDTO | null;
}

/** Enveloppe de pagination offset. `total` est celui du jeu FILTRÉ (le filtre vit dans le `where`, MD-ADM-8) ; `page` et `pageSize` sont l'ÉCHO de ce qui a été appliqué. */
export interface VenuePendingPageDTO {
  items: VenuePendingItemDTO[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Le détail pour l'admin ──────────────────────────────────────────────────

/** GET /admin/venues/:id — la vue admin existante (qui porte les deux taux, en LECTURE) + ce qu'il faut pour décider de publier ou de rejeter. N'importe quelle salle VIVANTE se lit. */
export interface VenueAdminDetailDTO extends VenueAdminDTO {
  number: number;
  cityNameFr: string;
  cityNameAr: string;
  ownerBusinessName: string;
  activeSlotCount: number;
  rejection: VenueRejectionDTO | null;
}

// ── La lecture du refus par le pro (R-3, D-5 p2) ────────────────────────────

/** GET /pro/venues/:id/publication — un contrat ÉTROIT, séparé de `VenueProDTO` (qui garde sa liste blanche : jamais de motif, jamais de taux). Exactement deux clés. */
export interface VenuePublicationReviewDTO {
  publicationStatus: VenuePublicationStatus;
  /** `null` : jamais rejetée, ou déjà publiée (publier efface le motif — le journal garde l'histoire). */
  rejection: VenueRejectionDTO | null;
}

// ── Codes d'erreur neufs ────────────────────────────────────────────────────

/** Lus par l'ADMIN seulement ; leur `message` est une clé stable (`admin.errors.*`) que l'écran fera correspondre à un texte français HORS catalogue (D-2). Le pro n'en reçoit aucun : la route
 *  de lecture du refus répond le `VENUE_NOT_FOUND` existant. */
export const VenueModerationErrorCode = {
  /** 409 — on ne rejette pas une salle qui n'est plus un brouillon : une salle publiée ne se dépublie pas (sens unique, A3-④). */
  VENUE_NOT_DRAFT: "VENUE_NOT_DRAFT",
  /** 409 — la salle est déjà rejetée avec UN AUTRE motif. Le motif stocké n'est pas écrasé. Comportement PROVISOIRE : « corriger un motif » est une décision produit non tranchée (R-2). */
  VENUE_ALREADY_REJECTED: "VENUE_ALREADY_REJECTED"
} as const;
export type VenueModerationErrorCode = (typeof VenueModerationErrorCode)[keyof typeof VenueModerationErrorCode];

// ── Le journal des actions admin (`audit_logs`, D-8) ────────────────────────

/** Les actions journalisées. ⛔ Le réglage des taux n'y est PAS (R-1, MD-ADM-17). `user.promote_admin` est celle du script du premier admin (D-3). */
export const AdminAuditAction = {
  VENUE_PUBLISH: "venue.publish",
  VENUE_REJECT: "venue.reject",
  DELETION_APPROVE: "account_deletion.approve",
  DELETION_REJECT: "account_deletion.reject",
  USER_PROMOTE_ADMIN: "user.promote_admin"
} as const;
export type AdminAuditAction = (typeof AdminAuditAction)[keyof typeof AdminAuditAction];

/** Les types d'entité de ces lignes (`audit_logs.entity_type`). */
export const AdminAuditEntity = {
  VENUE: "venue",
  DELETION_REQUEST: "account_deletion_request",
  USER: "user"
} as const;
export type AdminAuditEntity = (typeof AdminAuditEntity)[keyof typeof AdminAuditEntity];
