// Lot B4b — D52. Le test qui compte est celui de la soirée 20h→02h : c'est le
// créneau de mariage le plus courant du pays, et celui que B1 avait interdit
// par erreur.
import { describe, expect, it } from "vitest";
import { clockToMinutes, crossesMidnight, deriveEndMinutes, minutesToClock, slotDurationMinutes } from "./slot-time";

describe("minutesToClock", () => {
  it("une fin au-delà de 1440 s'affiche en heure MURALE du lendemain", () => {
    expect(minutesToClock(1560)).toBe("02:00");
    expect(minutesToClock(1440)).toBe("00:00");
    // 2640 = un créneau de 24 h parti de 20h : il se termine bien à 20h.
    expect(minutesToClock(2640)).toBe("20:00");
  });

  it("les heures de la journée sont rendues telles quelles, sur deux chiffres", () => {
    expect(minutesToClock(0)).toBe("00:00");
    expect(minutesToClock(540)).toBe("09:00");
    expect(minutesToClock(1200)).toBe("20:00");
    expect(minutesToClock(1439)).toBe("23:59");
    expect(minutesToClock(605)).toBe("10:05");
  });
});

describe("clockToMinutes", () => {
  it("convertit une horloge murale valide", () => {
    expect(clockToMinutes("00:00")).toBe(0);
    expect(clockToMinutes("20:00")).toBe(1200);
    expect(clockToMinutes("23:59")).toBe(1439);
  });

  it("refuse une forme ou une valeur impossible, sans lever", () => {
    expect(clockToMinutes("24:00")).toBeNull();
    expect(clockToMinutes("20:60")).toBeNull();
    expect(clockToMinutes("2:00")).toBeNull();
    expect(clockToMinutes("")).toBeNull();
    expect(clockToMinutes("abcde")).toBeNull();
  });
});

describe("deriveEndMinutes — D52", () => {
  it("20h→02h donne 1560, PAS 120 : c'est la soirée que B1 avait interdite", () => {
    expect(deriveEndMinutes(1200, 120)).toBe(1560);
  });

  it("un créneau dans la journée n'est pas décalé", () => {
    expect(deriveEndMinutes(600, 900)).toBe(900);
  });

  it("fin ÉGALE au début vaut 24 h, pas un créneau vide", () => {
    expect(deriveEndMinutes(1200, 1200)).toBe(2640);
    expect(slotDurationMinutes(1200, 2640)).toBe(1440);
  });

  it("la fin déduite reste toujours strictement après le début", () => {
    for (const start of [0, 600, 1200, 1439]) {
      for (const end of [0, 120, 900, 1439]) {
        expect(deriveEndMinutes(start, end)).toBeGreaterThan(start);
      }
    }
  });

  it("le domaine produit ne dépasse jamais 2879 — le CHECK autorise 2880, l'écran reste plus strict", () => {
    expect(deriveEndMinutes(1439, 1439)).toBe(2879);
  });
});

describe("crossesMidnight", () => {
  it("dit au pro ce qui a été déduit, plutôt que de le supposer", () => {
    expect(crossesMidnight(1560)).toBe(true);
    expect(crossesMidnight(900)).toBe(false);
    expect(crossesMidnight(1440)).toBe(false);
  });
});
