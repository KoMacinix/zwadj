// ADM-1 (D349, rang 51) — les schémas de la MODÉRATION des salles (`packages/types/src/venue-moderation.ts`) : le corps du rejet et la requête de la file.
//
// DOCTRINE DES BORNES (D55) : le cas RÉEL est écrit d'abord — un motif de deux phrases, un motif d'exactement la borne, une page 3 de taille 50. Ce que le schéma refuse
// est ce que l'écran ne peut pas envoyer : un motif vide ou blanc (le rejet est sans motif INTERDIT, D-4 : « motif obligatoire »), une clé inconnue, une taille de page hors bornes.
import { describe, expect, it } from "vitest";
import {
  VENUE_PENDING_PAGE_SIZE_DEFAULT,
  VENUE_PENDING_PAGE_SIZE_MAX,
  VENUE_REJECTION_REASON_MAX,
  venuePendingQuerySchema,
  venueRejectSchema
} from "@zwadj/types";

describe("venueRejectSchema — le motif est OBLIGATOIRE (D-4)", () => {
  it("un motif de deux phrases est accepté, et rendu rogné", () => {
    const r = venueRejectSchema.safeParse({ reason: "  Les photos sont floues. Merci de les remplacer.  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBe("Les photos sont floues. Merci de les remplacer.");
  });

  it("la borne est INCLUSE : un motif d'exactement la longueur maximale passe, un caractère de plus est refusé", () => {
    expect(venueRejectSchema.safeParse({ reason: "x".repeat(VENUE_REJECTION_REASON_MAX) }).success).toBe(true);
    expect(venueRejectSchema.safeParse({ reason: "x".repeat(VENUE_REJECTION_REASON_MAX + 1) }).success).toBe(false);
  });

  it("la borne se mesure APRÈS le rognage : des espaces autour d'un motif long ne le font pas refuser", () => {
    expect(venueRejectSchema.safeParse({ reason: `  ${"x".repeat(VENUE_REJECTION_REASON_MAX)}  ` }).success).toBe(true);
  });

  it("un motif vide, blanc ou absent est REFUSÉ — jamais un rejet sans raison", () => {
    expect(venueRejectSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(venueRejectSchema.safeParse({ reason: "   \n\t " }).success).toBe(false);
    expect(venueRejectSchema.safeParse({}).success).toBe(false);
  });

  it("un motif qui n'est pas une chaîne est refusé", () => {
    expect(venueRejectSchema.safeParse({ reason: 42 }).success).toBe(false);
    expect(venueRejectSchema.safeParse({ reason: null }).success).toBe(false);
  });

  it("une clé inconnue est refusée (`.strict()`) : on ne glisse pas un statut ni un taux dans le corps d'un rejet", () => {
    expect(venueRejectSchema.safeParse({ reason: "Motif", publicationStatus: "PUBLISHED" }).success).toBe(false);
    expect(venueRejectSchema.safeParse({ reason: "Motif", commissionRateBps: 500 }).success).toBe(false);
  });
});

describe("venuePendingQuerySchema — la file « en attente »", () => {
  it("sans paramètre : page 1, taille par défaut", () => {
    const r = venuePendingQuerySchema.parse({});
    expect(r).toEqual({ page: 1, pageSize: VENUE_PENDING_PAGE_SIZE_DEFAULT });
  });

  it("une querystring (chaînes) est convertie en nombres", () => {
    expect(venuePendingQuerySchema.parse({ page: "3", pageSize: "50" })).toEqual({ page: 3, pageSize: 50 });
  });

  it("la taille maximale est INCLUSE, la suivante est refusée ; zéro et le négatif sont refusés", () => {
    expect(venuePendingQuerySchema.safeParse({ pageSize: VENUE_PENDING_PAGE_SIZE_MAX }).success).toBe(true);
    expect(venuePendingQuerySchema.safeParse({ pageSize: VENUE_PENDING_PAGE_SIZE_MAX + 1 }).success).toBe(false);
    expect(venuePendingQuerySchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(venuePendingQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(venuePendingQuerySchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it("une page non entière ou non numérique est refusée", () => {
    expect(venuePendingQuerySchema.safeParse({ page: "1.5" }).success).toBe(false);
    expect(venuePendingQuerySchema.safeParse({ page: "abc" }).success).toBe(false);
  });

  it("une clé inconnue est refusée : la file n'a AUCUN filtre de statut, de taux ni d'identifiant", () => {
    expect(venuePendingQuerySchema.safeParse({ status: "PUBLISHED" }).success).toBe(false);
    expect(venuePendingQuerySchema.safeParse({ commissionRateBps: "100" }).success).toBe(false);
  });

  it("les bornes sont celles de la liste publique d'A3-⑤ (page/pageSize, défaut 12, maximum 50) : même enveloppe, mêmes nombres", () => {
    expect(VENUE_PENDING_PAGE_SIZE_DEFAULT).toBe(12);
    expect(VENUE_PENDING_PAGE_SIZE_MAX).toBe(50);
  });
});
