// ADM-1 (D349, rang 51) — la LIGNE de journal des actions admin (D-8, R-5). Module pur : aucune base, aucun Nest.
//
// Ce que cette spec garde :
//  · les noms d'action et d'entité viennent de l'AUTORITÉ (`AdminAuditAction`, `AdminAuditEntity` de `@zwadj/types`), jamais d'une liste recopiée ici ;
//  · AUCUNE donnée personnelle dans une ligne : pas de nom, de numéro de téléphone, d'e-mail (S-81 du rang 43, même règle) — chaque ligne n'a que les clés écrites ici ;
//  · une ligne ne contient que des valeurs simples (elle part en JSON dans `audit_logs.before` / `.after`).
import { describe, expect, it } from "vitest";
import { AdminAuditAction, AdminAuditEntity, UserRole, VenuePublicationStatus } from "@zwadj/types";
import { deletionDecisionEntry, promoteAdminEntry, venuePublishEntry, venueRejectEntry } from "./admin-audit";

const ADMIN = { userId: "018f0000-0000-7000-8000-0000000000ad", role: UserRole.ADMIN } as const;
const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";
const REQUEST_ID = "018f0000-0000-7000-8000-0000000000ee";
const USER_ID = "018f0000-0000-7000-8000-00000000aaaa";

describe("venuePublishEntry", () => {
  it("l'acteur, l'action et l'entité sont ceux de l'autorité ; avant → après porte le seul statut", () => {
    const e = venuePublishEntry(ADMIN, VENUE_ID, VenuePublicationStatus.DRAFT);
    expect(e).toEqual({
      actorId: ADMIN.userId,
      actorRole: UserRole.ADMIN,
      action: AdminAuditAction.VENUE_PUBLISH,
      entityType: AdminAuditEntity.VENUE,
      entityId: VENUE_ID,
      before: { publicationStatus: VenuePublicationStatus.DRAFT },
      after: { publicationStatus: VenuePublicationStatus.PUBLISHED }
    });
  });

  it("le statut de départ est celui qu'on passe (le cas d'un `PENDING` verrouillé ne s'écrit pas « DRAFT »)", () => {
    const e = venuePublishEntry(ADMIN, VENUE_ID, VenuePublicationStatus.PENDING);
    expect(e.before).toEqual({ publicationStatus: VenuePublicationStatus.PENDING });
  });
});

describe("venueRejectEntry", () => {
  it("le MOTIF est dans la ligne — publier l'efface de la colonne, le journal garde l'histoire (R-2)", () => {
    const e = venueRejectEntry(ADMIN, VENUE_ID, "Photos floues, merci de les remplacer.");
    expect(e).toEqual({
      actorId: ADMIN.userId,
      actorRole: UserRole.ADMIN,
      action: AdminAuditAction.VENUE_REJECT,
      entityType: AdminAuditEntity.VENUE,
      entityId: VENUE_ID,
      before: { rejectionReason: null },
      after: { rejectionReason: "Photos floues, merci de les remplacer." }
    });
  });
});

describe("deletionDecisionEntry", () => {
  it("approuver : le nombre de salles archivées voyage, AUCUN identifiant du compte, AUCUNE note de décision", () => {
    const e = deletionDecisionEntry(ADMIN, REQUEST_ID, "APPROVED", 3);
    expect(e).toEqual({
      actorId: ADMIN.userId,
      actorRole: UserRole.ADMIN,
      action: AdminAuditAction.DELETION_APPROVE,
      entityType: AdminAuditEntity.DELETION_REQUEST,
      entityId: REQUEST_ID,
      before: { status: "PENDING" },
      after: { status: "APPROVED", archivedVenues: 3 }
    });
  });

  it("rejeter : pas de clé `archivedVenues` (rien n'a été archivé)", () => {
    const e = deletionDecisionEntry(ADMIN, REQUEST_ID, "REJECTED");
    expect(e.action).toBe(AdminAuditAction.DELETION_REJECT);
    expect(e.after).toEqual({ status: "REJECTED" });
    expect(Object.keys(e.after)).not.toContain("archivedVenues");
  });
});

describe("promoteAdminEntry — le script du premier admin (D-3)", () => {
  it("pas d'acteur-compte (aucun admin n'existe encore) : `SCRIPT` ; l'entité est le compte, avant → après porte le seul rôle", () => {
    const e = promoteAdminEntry(USER_ID, UserRole.CLIENT);
    expect(e).toEqual({
      actorId: null,
      actorRole: "SCRIPT",
      action: AdminAuditAction.USER_PROMOTE_ADMIN,
      entityType: AdminAuditEntity.USER,
      entityId: USER_ID,
      before: { role: UserRole.CLIENT },
      after: { role: UserRole.ADMIN }
    });
  });
});

describe("aucune ligne ne porte de donnée personnelle ni de valeur composée", () => {
  const LIGNES = [
    venuePublishEntry(ADMIN, VENUE_ID, VenuePublicationStatus.DRAFT),
    venueRejectEntry(ADMIN, VENUE_ID, "Motif"),
    deletionDecisionEntry(ADMIN, REQUEST_ID, "APPROVED", 1),
    deletionDecisionEntry(ADMIN, REQUEST_ID, "REJECTED"),
    promoteAdminEntry(USER_ID, UserRole.CLIENT)
  ];

  it("les clés de chaque ligne sont exactement les sept clés de `audit_logs` que le module écrit", () => {
    for (const ligne of LIGNES) {
      expect(Object.keys(ligne).sort()).toEqual(
        ["action", "actorId", "actorRole", "after", "before", "entityId", "entityType"].sort()
      );
    }
  });

  it("`before` et `after` ne contiennent que des valeurs simples (chaîne, nombre, booléen, null) — jamais d'objet imbriqué", () => {
    for (const ligne of LIGNES) {
      for (const bloc of [ligne.before, ligne.after]) {
        for (const valeur of Object.values(bloc)) {
          expect(["string", "number", "boolean"].includes(typeof valeur) || valeur === null).toBe(true);
        }
      }
    }
  });

  it("aucune clé n'est un nom de donnée personnelle (e-mail, téléphone, nom, note de décision)", () => {
    const INTERDITES = ["email", "phone", "name", "firstName", "lastName", "decisionNote", "reason", "userId", "address"];
    for (const ligne of LIGNES) {
      const cles = [...Object.keys(ligne.before), ...Object.keys(ligne.after)];
      for (const interdite of INTERDITES) expect(cles).not.toContain(interdite);
    }
  });
});
