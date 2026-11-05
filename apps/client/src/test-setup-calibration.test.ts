// ⛔ L'ÉTALON DU PLAFOND DE CONSOLE (`src/test-setup.ts`) — FC-9, session `front-client`.
//
// Depuis FC-9, AUCUN fichier de la suite client n'est plus exempté : ceux qui l'étaient ont été corrigés à la source, ou
// n'émettaient plus rien. Le mécanisme de plafond — « dépasser fait tomber », la sentinelle `A_RELEVER`, le mode relevé qui ne
// sort jamais en vert — n'aurait donc plus RIEN à juger ; et un code que plus rien n'emprunte est un code dont on ne sait plus
// s'il marche (S8).
// ⇒ Ce fichier est son CAS CONNU : il émet EXACTEMENT deux lignes par `console.error`, et `PLAFONDS` l'exempte à DEUX. Le verdict
// n'est pas ici : c'est l'`afterAll` de `test-setup.ts` qui compare le total au plafond. Les cibles S8-1 à S8-3 de
// `neutralisation/neutralize-e3d1-s8.py` déplacent ce plafond (1, `A_RELEVER`) ou coupent la recherche d'exemption, et ce fichier
// doit alors TOMBER ; joué en mode relevé (`UPDATE_CONSOLE_CEILINGS=1`), il doit ROUGIR.
// ⚠ Ce n'est PAS du bruit toléré : rien d'autre que ces deux lignes ne sort d'ici. Changer leur nombre, c'est changer le plafond
// dans le même geste.

describe("étalon du plafond de console (`test-setup.ts`)", () => {
  it("émet exactement DEUX lignes de console — le compte sous lequel ce fichier est exempté", () => {
    console.error("étalon du plafond de console (FC-9) — ligne 1 sur 2, émise exprès");
    console.error("étalon du plafond de console (FC-9) — ligne 2 sur 2, émise exprès");
  });
});
