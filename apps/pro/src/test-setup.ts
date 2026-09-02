import "@testing-library/jest-dom/vitest";

// ⛔ AUCUN GEL D'HORLOGE ICI, ET C'EST UNE DÉCISION MESURÉE — NE PAS « FACTORISER ».
//
// Des fichiers de test gèlent l'horloge (`vi.useFakeTimers` + `vi.setSystemTime`),
// chacun sur SA propre ancre. La tentation est de remonter ce gel ici pour éviter
// la répétition. **Mesuré le 02/09/2026 : ça casse la suite.**
//   · gel global posé à la date DU JOUR, où rien ne devrait changer :
//     26 échecs au lieu de 24 — l'instrument perturbe ce qu'il mesure ;
//   · gel global posé à une date lointaine : la COLLECTE entière tombe
//     (« no tests »), y compris sur des fichiers sans aucune date.
// Cause : des faux timers actifs pour TOUS les fichiers entrent en conflit avec les
// tests asynchrones ; React produit des avertissements `act(...)` que l'`afterEach`
// ci-dessous transforme en échecs.
//
// ⇒ Le gel reste PAR FICHIER, posé par ceux qui en ont besoin, sur une ancre dont
// leurs fixtures dérivent. La répétition est le prix, et il est plus bas que celui
// d'une suite qui rougit sans rapport avec ce qu'elle teste.

// ⛔ UNE ATTENTE INTERROGE UN NŒUD DÉJÀ TENU, JAMAIS UN RÔLE PAR NOM (D269).
//
// `waitFor(() => expect(screen.getByRole("button", { name: … })).…)` recalcule le
// NOM ACCESSIBLE de tout le sous-arbre à CHAQUE tour de la boucle d'attente. Sur un
// écran chargé, c'est assez cher pour faire tomber les tests VOISINS.
// ⚠ Mesuré, et payé : le premier correctif d'attente de D269 est passé de 8 à
// **48 délais dépassés** avant d'être repris. Il était juste sur le fond ; c'est son
// COÛT qui cassait la porte, et rien dans son intention ne le laissait deviner.
//
// ⇒ On tient le nœud d'abord, on attend ensuite sur LUI :
//     const jour = await screen.findByRole("button", { name: /15/ });
//     await waitFor(() => expect(jour).toBeEnabled());
// Et pour un composant qui ne rend rien d'observable, on attend la DISPARITION du
// texte de chargement (idiome de `blocks-section.test.tsx`) ou on vide la file de
// microtâches DANS `act` (idiome de `a3-unexpected-responses.test.tsx`) — jamais une
// boucle qui re-cherche par rôle.

// GARDE DES SORTIES DE TEST — lot S7 (audit F8).
//
// ⚠ POURQUOI UNE SUITE VERTE MAIS BRUYANTE EST UN PROBLÈME.
// Un `console.error` de React — « An update … was not wrapped in act(...) » —
// signale un état mis à jour APRÈS la fin du test. C'est le symptôme exact
// d'une régression asynchrone : une requête qui se résout trop tard, un effet
// qui court après le démontage. Tant que la sortie en contient cent, personne
// ne verra la cent-unième, celle qui compte. La suite reste verte, et le signal
// se noie.
//
// ⚠ CETTE GARDE NE NETTOIE PAS LE PASSÉ, ELLE FERME L'AVENIR. Les fichiers
// déjà bruyants sont EXEMPTÉS nommément, avec leur compte et leur date. Un
// fichier neuf, ou un fichier corrigé, n'a droit à aucun bruit : le premier
// avertissement le fait tomber. C'est le contraire d'un objectif de propreté
// général — c'est une borne qui ne recule pas.
//
// ⚠ POURQUOI ON N'ÉCHOUE PAS DANS `console.error` LUI-MÊME. Lever depuis le
// `console.error` que React appelle interromprait React au milieu de son
// propre rendu, et produirait une erreur qui ne ressemble à rien. On COLLECTE
// pendant le test, et on juge dans le `afterEach` — là où l'échec est lisible
// et attribuable au bon test.
import { afterAll, afterEach, beforeEach, expect } from "vitest";

/**
 * ⛔ PLAFONDS À CLIQUET — lot S8. LE NOMBRE ÉTAIT DÉCORATIF, IL DEVIENT UNE PORTE.
 *
 * ⚠ CE QUI N'ALLAIT PAS. Cette liste portait un compte en toutes lettres
 * (« 38 avertissements act(…) ») que RIEN ne vérifiait. Un fichier exempté
 * pouvait passer de 38 à 380 sans un bruit : l'exemption ne tenait même pas la
 * ligne qu'elle prétendait tenir. C'est la même faute qu'un test vert qui ne
 * mesure rien — une assurance sans mesure derrière.
 *
 * ⛔ UN PLAFOND, PAS UNE ÉGALITÉ — ET LA RAISON EST MESURÉE.
 * Première version de ce fichier : passer EN DESSOUS du plafond faisait
 * tomber aussi, pour qu'un progrès réel soit enregistré. C’était faux ici.
 * `src/venues/services-section.test.tsx` a produit 1 avertissement au relevé
 * du 25/08/2026 et 0 au run suivant, sans qu'une ligne du dépôt ait bougé :
 * un `act(…)` tardif tombe avant ou après la fin du test selon l'ordre des
 * microtâches. Une égalité stricte sur une mesure qui flotte, c'est une
 * suite qui rougit au hasard — et une garde à laquelle plus personne ne
 * croit est exactement la maladie que ce lot devait soigner.
 *
 * ⚠ L'ERREUR ÉTAIT DE COPIER LA FORME DU CLIQUET a11y SANS SON FONDEMENT.
 * `b8-accessibility.e2e.ts` gèle des SIGNATURES — déterministes pour un DOM
 * donné —, pas des comptes. Les deux sens y sont légitimes ; ici, un seul
 * l'est.
 *
 * Ce qui reste, et qui porte la charge : DÉPASSER FAIT TOMBER. Descendre ne
 * fait que s'imprimer — abaisser un plafond reste un geste humain, pris sur
 * la donnée que le relevé affiche.
 *
 * ⚠ UN PLAFOND SE RELÈVE SUR PLUSIEURS PASSES, PAS UNE. La mesure flottant,
 * un chiffre pris une seule fois peut être dépassé au run suivant : on garde
 * le MAXIMUM de trois relevés, et on écrit qu'il en vient.
 *
 * ⛔ LES NOMBRES NE SONT PAS ÉCRITS ICI À LA MAIN. Ceux du 22/08 sont périmés
 * depuis D249–D251 et D254. On les RELÈVE, une fois :
 *
 *     UPDATE_CONSOLE_CEILINGS=1 pnpm --filter @zwadj/pro test
 *
 * La sortie imprime le bloc à recopier ci-dessous. Tant qu'un plafond vaut
 * `A_RELEVER`, le fichier tombe en indiquant le compte observé : une valeur
 * devinée ne peut pas se glisser dans cette liste.
 *
 * ⚠ AJOUTER UNE ENTRÉE reste un geste explicite et daté : c'est accepter du
 * bruit neuf. En RETIRER une est toujours bienvenu — le fichier redevient
 * gardé comme les autres, au premier avertissement.
 */
const A_RELEVER = -1;

const PLAFONDS: Record<string, number> = {
  // ⚠ 64 le 22/08 (S7) → 293. ÉCART NON EXPLIQUÉ — voir plus bas.
  "src/dashboard/walkin-journey.test.tsx": 293,
  // 6 le 22/08 (S7), inchangé.
  "src/venues/venue-form.test.tsx": 6,
  // ⚠ 3 le 22/08 (S7), 3 au relevé du 25/08, puis 4 au run suivant — SANS
  // qu'une ligne de ce fichier ait bougé. Plafond porté au MAXIMUM observé,
  // pas à la dernière valeur vue : un plafond calé sur un seul échantillon
  // d'une mesure qui flotte rougit tôt ou tard sans qu'il se soit rien passé.
  // ⛔ CE FICHIER EST LE PROCHAIN CANDIDAT au traitement de
  // `services-section.test.tsx` : une assertion qui finit avant la dernière
  // mise à jour laisse un `act(…)` tomber après le test, tantôt un, tantôt
  // deux. Le plafond contient le symptôme ; il ne soigne pas la cause.
  "src/venues/venue-wizard.test.tsx": 4,
  // ⛔ HUITIÈME FICHIER, ABSENT DE LA LISTE S7 — DÉCISION EN ATTENTE (Ko).
  // Relevé du 25/08/2026 : 1 avertissement. Ce fichier n'a JAMAIS été exempté,
  // donc la garde d'origine le faisait déjà tomber — or l'audit annonçait
  // « Pro 344 ✅ ». L'une des deux affirmations est fausse, et c'est ça qu'il
  // faut savoir avant de décider.
  //
  // ⚠ L'INSCRIRE ICI REVIENDRAIT À LÉGITIMER UN BRUIT QUE LA GARDE ATTRAPAIT.
  // Un seul avertissement dans un seul fichier est la chose la moins chère à
  // corriger du dépôt ; l'exempter coûterait plus cher plus tard. Le relevé
  // NOMME désormais le premier message — relancer pour le lire, puis choisir :
  // corriger le test, ou décommenter la ligne ci-dessous en datant le geste.
  // "src/venues/services-section.test.tsx": 1,
};

/** Motifs tolérés partout : ils ne signalent pas un état tardif. */
const TOLERES: RegExp[] = [
  // jsdom ne sait pas naviguer ; ce n'est pas un défaut du composant.
  /Not implemented: navigation/i
];

/** ⛔ RÉSOUT LES `%s` DE REACT.
 *
 *  React appelle `console.error("An update to %s inside a test…", nom, …)`.
 *  Concaténés tels quels, le gabarit et ses arguments se retrouvent séparés par
 *  les sauts de ligne du gabarit — et l'aperçu du garde-fou, qui ne montre que
 *  la première ligne, affiche « An update to %s ». Un message qui n'apprend
 *  rien coûte un aller-retour à chaque fois.
 *
 *  ⚠ Ne change ni le COMPTE ni les motifs tolérés : seulement ce qu'on lit. */
function formaterConsole(args: unknown[]): string {
  const enChaine = (a: unknown) => (a instanceof Error ? a.message : String(a));
  const [gabarit, ...suite] = args;
  if (typeof gabarit !== "string" || !gabarit.includes("%s")) return args.map(enChaine).join(" ");
  let i = 0;
  const resolu = gabarit.replace(/%s/g, () => (i < suite.length ? enChaine(suite[i++]) : "%s"));
  const reste = suite.slice(i).map(enChaine).join(" ");
  return reste ? `${resolu} ${reste}` : resolu;
}

let captures: string[] = [];
let restaurer: (() => void) | null = null;

beforeEach(() => {
  captures = [];
  const originaux = { error: console.error, warn: console.warn };
  const collecte =
    (canal: "error" | "warn") =>
    (...args: unknown[]) => {
      const texte = formaterConsole(args);
      if (!TOLERES.some((motif) => motif.test(texte))) captures.push(texte);
      // On laisse passer la sortie d'origine : la garde ne masque rien, elle
      // ajoute un verdict.
      originaux[canal](...args);
    };
  console.error = collecte("error");
  console.warn = collecte("warn");
  restaurer = () => {
    console.error = originaux.error;
    console.warn = originaux.warn;
  };
});

afterEach(() => {
  restaurer?.();
  restaurer = null;
  if (captures.length === 0) return;

  // `testPath` est absolu : on compare sur la fin du chemin, pour que la liste
  // reste lisible et indépendante de l'endroit où le dépôt est cloné.
  const chemin = suffixe();
  // ⚠ Un fichier exempté ACCUMULE au lieu de sortir en silence : c'est ce
  // total que le plafond juge dans `afterAll` (S8).
  totalFichier += captures.length;
  totalAct += captures.filter((c) => /not wrapped in act/i.test(c)).length;
  premier ??= captures[0]?.split("\n")[0] ?? null;

  // ⛔ LE RELEVÉ COLLECTE, IL NE JUGE PAS. Lever ici rendrait le run de
  // bootstrap rouge — donc indistinguable d'une vraie casse — et, pire,
  // un test marqué en échec peut s'arrêter avant d'avoir produit tout son
  // bruit : le compte relevé serait COURT, et le plafond gelé trop bas
  // ferait tomber la porte suivante pour rien.
  if (RELEVE) return;
  if (exemptionDe(chemin) !== undefined) return;

  const apercu = captures.slice(0, 3).map((c) => `  · ${c.split("\n")[0]}`).join("\n");
  throw new Error(
    `${captures.length} avertissement(s) de console dans un fichier NON exempté.\n` +
      `${apercu}\n` +
      "Un « not wrapped in act(...) » signale un état mis à jour APRÈS la fin du test — " +
      "corrigez-le, ou justifiez une exemption datée dans le fichier de préparation.\n" +
      "⚠ SI UN TEST DE CE FICHIER VIENT D'ÉCHOUER OU D'EXPIRER, ce bruit en est " +
      "probablement la CONSÉQUENCE et non la cause : un test interrompu laisse ses " +
      "mises à jour tomber dans le suivant. Corrigez l'échec d'abord, relancez, et " +
      "ne jugez ce message que sur une suite par ailleurs verte."
  );
});

/** ⚠ Le total du FICHIER, pas du test. Les avertissements `act(…)` se
 *  répartissent sur plusieurs tests d'un même fichier ; un plafond par test
 *  laisserait le total dériver sans jamais dépasser localement. Les fichiers de
 *  préparation sont évalués UNE FOIS PAR FICHIER DE TEST, donc ce compteur de
 *  module est bien celui du fichier courant. */
let totalFichier = 0;
/** ⚠ Combien parmi eux sont des « not wrapped in act(…) ». Les comptes de
 *  S7 étaient étiquetés « avertissements act(…) » ; ce plafond, lui, compte
 *  TOUT `console.error` et `console.warn` non toléré. Si les deux mesures
 *  divergent, ce n'est pas une régression, c'est une AUTRE mesure — et la
 *  seule façon de le savoir est de compter les deux. */
let totalAct = 0;
let premier: string | null = null;
const RELEVE = process.env.UPDATE_CONSOLE_CEILINGS === "1";

/** Chemin absolu → suffixe lisible, indépendant de l'endroit du clone. */
function suffixe(): string {
  return (expect.getState().testPath ?? "").replace(/\\/g, "/");
}

function exemptionDe(chemin: string): string | undefined {
  return Object.keys(PLAFONDS).find((s) => chemin.endsWith(s));
}

afterAll(() => {
  const chemin = suffixe();
  const cle = exemptionDe(chemin);

  if (RELEVE) {
    // ⚠ On IMPRIME, on n'écrit pas. Vitest exécute les fichiers en parallèle :
    // écrire ce fichier depuis chaque travailleur en perdrait la moitié. Le
    // relevé se recopie à la main, ce qui force au passage à le LIRE.
    if (totalFichier > 0) {
      const court = chemin.slice(chemin.indexOf("/src/") + 1);
      const detail = `// ${totalAct} act(…) sur ${totalFichier}`;
      if (cle === undefined) {
        // ⚠ UN FICHIER NON EXEMPTÉ QUI FAIT DU BRUIT EST LE RÉSULTAT LE PLUS
        // INTÉRESSANT DU RELEVÉ, pas une ligne de plus. Hors relevé il fait
        // TOMBER la suite — l'ajouter aux plafonds reviendrait à légitimer un
        // bruit que la garde attrapait déjà. On le distingue donc à l'œil, et
        // on NOMME le premier message pour que la décision se prenne sur une
        // mesure et non sur une intuition.
        console.info(`⚠ NON EXEMPTÉ ET BRUYANT  "${court}": ${totalFichier},  ${detail}  — premier : ${premier ?? "?"}`);
      } else {
        console.info(`RELEVÉ PLAFOND  "${court}": ${totalFichier},  ${detail}`);
      }
    }
    // ⛔ LE RELEVÉ NE SORT JAMAIS EN VERT. Sous cette variable, `afterEach`
    // sort avant son `throw` et les plafonds ne sont pas vérifiés : la garde
    // est entièrement désactivée. Une variable restée dans le shell rendrait
    // donc toutes les portes suivantes vertes SANS RIEN MESURER — vécu le
    // 25/08/2026, deux runs annoncés verts imprimaient encore des lignes de
    // relevé. On lève, pour qu'un relevé ne puisse jamais passer pour une
    // suite verte. Les lignes à recopier sont déjà imprimées au-dessus.
    if (totalFichier > 0) {
      throw new Error(
        "MODE RELEVÉ (UPDATE_CONSOLE_CEILINGS=1) — CE RUN NE VAUT PAS COMME PORTE.\n" +
          "La garde des sorties est désactivée : rien n'a été mesuré ici.\n" +
          "Recopie les lignes ci-dessus dans PLAFONDS, PUIS relance SANS la variable."
      );
    }
    return;
  }

  if (cle === undefined) return; // fichier non exempté : déjà jugé par `afterEach`
  const plafond = PLAFONDS[cle]!;

  if (plafond === A_RELEVER) {
    throw new Error(
      `Plafond NON RELEVÉ pour « ${cle} ». Observé dans cette exécution : ${totalFichier}.\n` +
        "Écris ce nombre dans PLAFONDS, ou relève les deux fronts d'un coup :\n" +
        "  UPDATE_CONSOLE_CEILINGS=1 pnpm test"
    );
  }
  if (totalFichier > plafond) {
    throw new Error(
      `${totalFichier} avertissement(s) dans « ${cle} », plafond ${plafond}.\n` +
        "Le bruit a AUGMENTÉ dans un fichier déjà exempté. Un « not wrapped in act(...) »\n" +
        "de plus signale un état mis à jour APRÈS la fin du test — corrigez-le. Relever le\n" +
        "plafond est un geste explicite, daté, et qui se discute."
    );
  }
  if (totalFichier < plafond) {
    // ⚠ ON RAPPORTE, ON NE FAIT PAS TOMBER. Voir l'entête : la mesure
    // flotte, donc un run sous le plafond ne prouve pas un progrès — il peut
    // n'être qu'un ordre de microtâches différent. Faire tomber ici
    // rendrait la suite aléatoire. Abaisser reste un geste humain, pris sur
    // plusieurs passes concordantes.
    console.info(
      `PLAFOND ABAISSABLE  "${cle}": ${totalFichier} observé(s) sous un plafond de ${plafond}. ` +
        "Confirmer sur plusieurs passes avant d'abaisser."
    );
  }
});
