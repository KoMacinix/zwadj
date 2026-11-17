// ADM-1 (D349, rang 51) — la FILE « en attente de publication » : ce qui se décide sans base. Module pur.
//
// Ce que cette spec garde :
//  · les statuts SOURCES de publier et de rejeter se confrontent à l'ÉNUMÉRATION (`VenuePublicationStatus`), jamais à une liste recopiée ici : publier part de tout ce qui n'est
//    pas déjà publié, rejeter ne part que de DRAFT (le sens unique d'A3-④ : une salle publiée ne se rejette pas, MD-ADM-4) ;
//  · la page est découpée sur DEUX groupes — les brouillons jamais rejetés d'abord, les rejetés ensuite (R-2) — et la réunion de toutes les pages est la liste complète,
//    sans trou ni doublon (c'est ce qui rend « filtrée AVANT la pagination » vrai, MD-ADM-8) ;
//  · le refus visible : jamais sur une salle publiée, la date seulement quand le journal la porte.
import { describe, expect, it } from "vitest";
import { VenuePublicationStatus } from "@zwadj/types";
import {
  PUBLISHABLE_FROM,
  REJECTABLE_FROM,
  latestDatePerEntity,
  pageAcrossGroups,
  toRejection
} from "./venue-review-queue";

describe("statuts sources — confrontés à l'énumération", () => {
  const TOUS = Object.values(VenuePublicationStatus);

  it("publier part de TOUT ce qui n'est pas déjà publié (DRAFT et le PENDING verrouillé), jamais de PUBLISHED", () => {
    expect([...PUBLISHABLE_FROM].sort()).toEqual(TOUS.filter((s) => s !== VenuePublicationStatus.PUBLISHED).sort());
    expect(PUBLISHABLE_FROM).not.toContain(VenuePublicationStatus.PUBLISHED);
  });

  it("rejeter ne part que de DRAFT : ni PUBLISHED (sens unique), ni le PENDING verrouillé", () => {
    expect([...REJECTABLE_FROM]).toEqual([VenuePublicationStatus.DRAFT]);
  });
});

describe("pageAcrossGroups — la page se découpe sur deux groupes, dans l'ordre", () => {
  it("la première page tient dans le premier groupe : le second n'est pas interrogé", () => {
    expect(pageAcrossGroups({ firstTotal: 5, secondTotal: 3, page: 1, pageSize: 4 })).toEqual({
      first: { skip: 0, take: 4 },
      second: { skip: 0, take: 0 }
    });
  });

  it("une page à cheval : la fin du premier groupe PUIS le début du second", () => {
    expect(pageAcrossGroups({ firstTotal: 5, secondTotal: 3, page: 2, pageSize: 4 })).toEqual({
      first: { skip: 4, take: 1 },
      second: { skip: 0, take: 3 }
    });
  });

  it("une page entièrement dans le second groupe : le premier n'est pas interrogé, le saut est relatif au second", () => {
    expect(pageAcrossGroups({ firstTotal: 2, secondTotal: 9, page: 2, pageSize: 3 })).toEqual({
      first: { skip: 2, take: 0 },
      second: { skip: 1, take: 3 }
    });
  });

  it("un premier groupe vide : tout vient du second", () => {
    expect(pageAcrossGroups({ firstTotal: 0, secondTotal: 4, page: 1, pageSize: 3 })).toEqual({
      first: { skip: 0, take: 0 },
      second: { skip: 0, take: 3 }
    });
  });

  it("un second groupe vide, ou les deux : rien de plus que ce qui existe", () => {
    expect(pageAcrossGroups({ firstTotal: 3, secondTotal: 0, page: 1, pageSize: 5 })).toEqual({
      first: { skip: 0, take: 3 },
      second: { skip: 0, take: 0 }
    });
    expect(pageAcrossGroups({ firstTotal: 0, secondTotal: 0, page: 1, pageSize: 5 })).toEqual({
      first: { skip: 0, take: 0 },
      second: { skip: 0, take: 0 }
    });
  });

  it("une page au-delà de la fin : AUCUNE ligne demandée — jamais une page qui REPREND le début, jamais une requête pour rien", () => {
    const { first, second } = pageAcrossGroups({ firstTotal: 2, secondTotal: 2, page: 9, pageSize: 5 });
    expect(first.take).toBe(0);
    expect(second.take).toBe(0);
  });

  it("PROPRIÉTÉ : sur toutes les pages, les tranches réunies sont les n1 + n2 lignes, dans l'ordre, sans trou ni doublon", () => {
    // Le cas réel qu'elle doit accepter : une file de brouillons dont quelques-uns ont été rejetés, lue page après page.
    for (let n1 = 0; n1 <= 7; n1 += 1) {
      for (let n2 = 0; n2 <= 7; n2 += 1) {
        for (let size = 1; size <= 6; size += 1) {
          const vus: number[] = []; // l'indice GLOBAL de chaque ligne rendue : 0..n1-1 pour le premier groupe, n1..n1+n2-1 pour le second
          const pages = Math.max(1, Math.ceil((n1 + n2) / size));
          for (let page = 1; page <= pages; page += 1) {
            const { first, second } = pageAcrossGroups({ firstTotal: n1, secondTotal: n2, page, pageSize: size });
            for (let i = 0; i < first.take; i += 1) vus.push(first.skip + i);
            for (let i = 0; i < second.take; i += 1) vus.push(n1 + second.skip + i);
          }
          expect(vus, `n1=${n1} n2=${n2} taille=${size}`).toEqual(Array.from({ length: n1 + n2 }, (_, i) => i));
        }
      }
    }
  });
});

describe("toRejection — ce que le pro et l'admin lisent d'un refus", () => {
  const DATE = new Date("2026-11-10T09:30:00.000Z");

  it("un brouillon avec un motif : le motif et la date au format ISO", () => {
    expect(toRejection(VenuePublicationStatus.DRAFT, "Photos floues", DATE)).toEqual({
      reason: "Photos floues",
      rejectedAt: "2026-11-10T09:30:00.000Z"
    });
  });

  it("le journal n'a pas de ligne (motif écrit à la main) : le motif est rendu, la date est `null` — jamais inventée", () => {
    expect(toRejection(VenuePublicationStatus.DRAFT, "Photos floues", null)).toEqual({ reason: "Photos floues", rejectedAt: null });
  });

  it("aucun motif : aucun refus", () => {
    expect(toRejection(VenuePublicationStatus.DRAFT, null, DATE)).toBeNull();
  });

  it("une salle PUBLIÉE ne porte jamais de refus, même si une valeur périmée traîne dans la colonne", () => {
    expect(toRejection(VenuePublicationStatus.PUBLISHED, "Photos floues", DATE)).toBeNull();
  });
});

describe("latestDatePerEntity — une requête pour toute la page, la ligne la plus récente de chaque salle", () => {
  it("rend, par entité, la PREMIÈRE ligne d'une liste triée du plus récent au plus ancien", () => {
    const m = latestDatePerEntity([
      { entityId: "a", createdAt: new Date("2026-11-12T10:00:00Z") },
      { entityId: "b", createdAt: new Date("2026-11-11T10:00:00Z") },
      { entityId: "a", createdAt: new Date("2026-11-01T10:00:00Z") }
    ]);
    expect(m.get("a")?.toISOString()).toBe("2026-11-12T10:00:00.000Z");
    expect(m.get("b")?.toISOString()).toBe("2026-11-11T10:00:00.000Z");
    expect(m.size).toBe(2);
  });

  it("une ligne sans entité n'entre pas dans la table", () => {
    expect(latestDatePerEntity([{ entityId: null, createdAt: new Date("2026-11-12T10:00:00Z") }]).size).toBe(0);
  });
});
