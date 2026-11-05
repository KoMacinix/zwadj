// FC-3 (session `front-client`) — la règle du nom localisé, mesurée sans monter de composant (D205).
import { attributsDeLangue, nomLocalise } from "./nom-localise";

describe("FC-3 — nomLocalise : la langue de la page, et un repli qui se DIT", () => {
  it("arabe, champ arabe présent : le texte ARABE, sans repli", () => {
    expect(nomLocalise("Soirée", "سهرة", "ar")).toEqual({ texte: "سهرة", langue: "ar", repli: false });
  });

  it("arabe, champ arabe VIDE : le français, et le repli est DIT", () => {
    expect(nomLocalise("Soirée", "", "ar")).toEqual({ texte: "Soirée", langue: "fr", repli: true });
  });

  it("arabe, champ arabe fait de BLANCS : compté comme vide", () => {
    expect(nomLocalise("Soirée", "   ", "ar")).toEqual({ texte: "Soirée", langue: "fr", repli: true });
  });

  it("arabe, champ arabe ABSENT (`null`, un nom d'unité facultatif) : le français, repli dit", () => {
    expect(nomLocalise("par table", null, "ar")).toEqual({ texte: "par table", langue: "fr", repli: true });
  });

  it("français : le champ français, JAMAIS l'arabe, sans repli", () => {
    expect(nomLocalise("Soirée", "سهرة", "fr")).toEqual({ texte: "Soirée", langue: "fr", repli: false });
  });

  it("les attributs : RIEN hors repli ; `lang` ET `dir` ensemble dans le repli", () => {
    expect(attributsDeLangue(nomLocalise("Soirée", "سهرة", "ar"))).toEqual({});
    expect(attributsDeLangue(nomLocalise("Soirée", "", "ar"))).toEqual({ lang: "fr", dir: "ltr" });
    expect(attributsDeLangue(nomLocalise("Soirée", "سهرة", "fr"))).toEqual({});
  });
});
