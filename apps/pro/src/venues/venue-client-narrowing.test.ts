// ⛔ S9 — AUCUN ÉCRAN NE REDEMANDE LE CLIENT ENTIER.
//
// ⚠ Sans cette garde, S9 est cosmétique. Les six interfaces peuvent exister,
// les six crochets aussi : il suffit qu'un écran écrive `useVenues()` pour
// recevoir de nouveau les vingt-deux membres, et rien ne le dirait. Le
// découpage tiendrait sur la discipline de celui qui écrit — c'est-à-dire sur
// rien.
//
// ⚠ Garde STATIQUE, sur les sources. Un test de rendu ne peut pas la porter :
// `useVenues()` et `useVenueCrud()` rendent le MÊME objet, donc aucun
// comportement observable ne les distingue. Ce qui les distingue est le type
// demandé, et il n'existe plus à l'exécution.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  VenueAvailabilityClient,
  VenueCrudClient,
  VenueMediaClient,
  VenuePricingRuleClient,
  VenueSlotTemplateClient,
  VenueVisitClient
} from "@zwadj/api-client";
import {
  useVenueAvailability,
  useVenueCrud,
  useVenueMedia,
  useVenuePricingRules,
  useVenueSlotTemplates,
  useVenueVisits
} from "./venue-client-context";

/** ⛔ CE QUE CHAQUE CROCHET REND, EXACTEMENT.
 *
 *  ⚠ Mesuré le 26/08/2026 : sans ces six lignes, ÉLARGIR un crochet à
 *  `VenueProClient` ne cassait RIEN. C'est logique et c'est le piège — un
 *  type de retour élargi n'a jamais fait tomber un appelant, seul un type
 *  rétréci le fait. Le découpage pouvait donc se défaire crochet par
 *  crochet, en silence, sans qu'aucune porte ne bouge.
 *
 *  On compare au TYPE, pas à une liste de clés : une seconde liste ici
 *  divergerait de celle de `venue-families.test.ts`. */
type Identiques<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

const _crud: Identiques<ReturnType<typeof useVenueCrud>, VenueCrudClient> = true;
const _medias: Identiques<ReturnType<typeof useVenueMedia>, VenueMediaClient> = true;
const _gabarits: Identiques<ReturnType<typeof useVenueSlotTemplates>, VenueSlotTemplateClient> = true;
const _tarifs: Identiques<ReturnType<typeof useVenuePricingRules>, VenuePricingRuleClient> = true;
const _dispo: Identiques<ReturnType<typeof useVenueAvailability>, VenueAvailabilityClient> = true;
const _visites: Identiques<ReturnType<typeof useVenueVisits>, VenueVisitClient> = true;

/** Le seul fichier autorisé à nommer le crochet large : celui qui le déclare.
 *  ⚠ Construit avec `join`, donc avec le SÉPARATEUR DE LA PLATE-FORME. Écrit
 *  « venues/… » en dur, il ne correspondait à rien sous Windows — et cette
 *  garde dénonçait alors le seul fichier qu'elle devait épargner. */
const DECLARANT = join("venues", "venue-client-context.tsx");

function sourcesDe(racine: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(racine, { withFileTypes: true })) {
    const chemin = join(racine, entree.name);
    if (entree.isDirectory()) trouves.push(...sourcesDe(chemin));
    else if (/\.tsx?$/.test(entree.name) && !/\.test\.tsx?$/.test(entree.name)) trouves.push(chemin);
  }
  return trouves;
}

/** ⚠ UN SEUL parcours, une seule lecture, partagés par les trois tests.
 *  La version précédente relisait les 53 sources à chaque test — sans
 *  conséquence sur le verdict, mais ce fichier est le 28ᵉ travailleur
 *  parallèle de la suite, et trois tests voisins ont expiré à 5 s le
 *  26/08/2026 sur une machine chargée. On ne paie pas trois fois ce qui se
 *  paie une. */
const RACINE = join(process.cwd(), "src");
const SOURCES = sourcesDe(RACINE).map((chemin) => ({
  chemin,
  // ⚠ Affichage seulement : `sep` évite d'écrire un antislash, donc de
  //   l'échapper — c'est là que cette garde s'était cassé les dents.
  lisible: ["src", ...relative(RACINE, chemin).split(sep)].join("/"),
  texte: readFileSync(chemin, "utf8")
}));
const HORS_DECLARANT = SOURCES.filter((f) => !f.chemin.endsWith(DECLARANT));

describe("⛔ S9 — le crochet large n'a plus d'appelant", () => {
  it("aucune source de production n'appelle `useVenues()`", () => {
    // ⚠ `process.cwd()` est le dossier du paquet quand vitest tourne, et on le
    // VÉRIFIE : un dossier courant inattendu doit dire lequel, pas rendre une
    // liste vide qui ferait passer la garde pour verte. C'est la même faute que
    // la campagne S6 — une cible sans mesure comptée comme réussie.
    expect(SOURCES.length, `aucune source trouvée sous ${RACINE}`).toBeGreaterThan(20);

    const fautifs = HORS_DECLARANT
      // ⛔ LE NOM, PAS L'APPEL. Mesuré le 26/08/2026 : cette garde était
      // MUETTE sous neutralisation. `import { useVenues as useVenueCrud }`
      // rend le crochet large sous un autre nom, et le site d'appel ne le
      // trahit plus — chercher `useVenues(` ne voyait rien. Chercher
      // l'IDENTIFIANT attrape l'import comme l'appel.
      .filter((f) => /\buseVenues\b/.test(f.texte))
      .map((f) => f.lisible);

    expect(
      fautifs,
      "ces écrans redemandent les 22 membres au lieu de leur famille — S9 se défait par là"
    ).toEqual([]);
  });

  it("les six crochets rendent EXACTEMENT leur famille", () => {
    // ⚠ Les six lignes de type ci-dessus sont référencées ici, sinon le lint
    // les tient pour du code mort — et emporte la garde avec.
    expect([_crud, _medias, _gabarits, _tarifs, _dispo, _visites]).toEqual([true, true, true, true, true, true]);
  });

  it("les six crochets étroits sont TOUS employés", () => {
    // ⚠ L'autre sens. Un crochet que personne n'appelle est une interface dont
    // on ne sait plus si elle correspond à un besoin réel : c'est le début du
    // fourre-tout suivant, par accumulation plutôt que par ajout.
    const CROCHETS = [
      "useVenueCrud",
      "useVenueMedia",
      "useVenueSlotTemplates",
      "useVenuePricingRules",
      "useVenueAvailability",
      "useVenueVisits"
    ];
    const corpus = HORS_DECLARANT.map((f) => f.texte).join("\n");

    const orphelins = CROCHETS.filter((c) => !new RegExp(`\\b${c}\\s*\\(`).test(corpus));
    expect(orphelins, "crochets sans aucun appelant").toEqual([]);
  });
});
