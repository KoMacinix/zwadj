// La règle du libellé « Ma salle / Mes salles » — rang 38 (D332), S-11. Décision ① de l'ancien lot UIP-A : « Ma salle » tant que le pro n'en a qu'une (le cas général en
// Algérie), « Mes salles » dès la seconde. Le menu du haut ET le titre de la page l'importent : UNE règle, UN endroit (« un seul endroit par formule »). Module PUR.
import { messages } from "@zwadj/i18n";
import { describe, expect, it } from "vitest";
import { venuesLabelKey } from "./venues-label";

describe("venuesLabelKey — « Ma salle » jusqu'à une salle, « Mes salles » dès la seconde", () => {
  it("zéro et une salle : le singulier (pendant le chargement le compte vaut 0 : afficher « Mes salles » puis le voir se rétracter serait un scintillement)", () => {
    expect(venuesLabelKey(0)).toBe("venue.ui.nav.myVenue");
    expect(venuesLabelKey(1)).toBe("venue.ui.nav.myVenue");
  });

  it("deux salles et plus : le pluriel — le seuil est à DEUX, ni à un ni à trois", () => {
    for (const n of [2, 3, 10]) expect(venuesLabelKey(n), String(n)).toBe("venue.ui.nav.myVenues");
  });

  it("les deux clés existent dans les deux catalogues, et le singulier diffère du pluriel dans chaque langue (sinon la règle ne se verrait pas)", () => {
    for (const langue of ["fr", "ar"] as const) {
      const nav = messages[langue].venue.ui.nav;
      expect(typeof nav.myVenue).toBe("string");
      expect(typeof nav.myVenues).toBe("string");
      expect(nav.myVenue).not.toBe(nav.myVenues);
    }
  });
});
