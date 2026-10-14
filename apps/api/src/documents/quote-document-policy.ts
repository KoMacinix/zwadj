// Politique du DOCUMENT du devis — module PUR. Rang 33 (D326), décision 1 du relecteur.
//
// Une décision, aucune dépendance (ni Prisma, ni Nest, ni navigateur) : elle se rejoue en millisecondes, c'est ce qui permet de la
// neutraliser et de la rejouer à chaque passage (D187 : le motif qui tient est la vitesse, pas l'exécutabilité).
// ⛔ Rang 38 (D332) : la SECONDE décision de ce module — la langue du PDF (« celle du client quand elle est lisible, sinon celle du pro », décision 7 de D326) —
// est RETIRÉE. Ko l'a remplacée (décision A de D327) par un choix du pro à chaque téléchargement : la langue appliquée est la langue demandée, il n'y a plus
// de règle à rendre ici. `chooseDocumentLocale`, `DocumentLocaleBranch` et la lecture de `users.locale` disparaissent ensemble (« une règle remplacée ne laisse pas de code mort »).
//
// ⛔ CE MODULE NE CALCULE AUCUN MONTANT et n'importe NI `pricing-engine` NI `deposit` : le PDF imprime la valeur STOCKÉE (précision de Ko,
// 05/10/2026 : « il ne doit jamais recalculer tout seul à partir des règles de prix actuelles »). `quote-document.spec.ts` garde cette absence.
import { isQuoteOpen, QuoteStatus } from "@zwadj/types";

export type QuoteDocumentDecision =
  | { readonly outcome: "ALLOWED" }
  /** Une version PLUS RÉCENTE existe dans la chaîne : `latestVersion` dit laquelle, pour que l'écran sache quoi faire. */
  | { readonly outcome: "VERSION_NOT_ACTIVE"; readonly latestVersion: number }
  /** Le devis est une affaire perdue ou un statut hérité remplacé (jamais un devis ouvert ni accepté) : le statut RÉEL est rendu. */
  | { readonly outcome: "STATUS_CONFLICT"; readonly status: string };

/**
 * Le document d'un devis ne se sert que pour la version ACTIVE de sa chaîne (décision 1 du relecteur) :
 * « le serveur ne sert ni l'ancienne valeur, ni une autre version à sa place ».
 *
 * ⚠ « ACTIVE » est DÉRIVÉ, aucune colonne ne le dit : `revise()` écrit une ligne N+1 sans toucher au statut de la courante
 * (`quote-transitions.ts`, `REVISE.to = null`), et `SUPERSEDED` n'est plus écrit depuis Q2. Active = la plus haute `version` de la chaîne ET un
 * statut imprimable : ouvert (`QUOTE_OPEN_STATUSES`, l'autorité des quatre commandes — jamais une seconde liste ici) ou accepté.
 *
 * ⛔ L'ORDRE DES REFUS EST UNE RÈGLE MÉTIER, ET IL SE MESURE SUR UN CAS DOUBLEMENT FAUTIF : une ancienne version ANNULÉE est refusée comme
 * « pas la version active » — c'est l'information utile (« une version plus récente existe »), pas « ce devis est clos ». Le statut ne parle
 * que de la dernière version : une chaîne dont la dernière version est close n'a, elle, plus de version active.
 */
export function decideQuoteDocument(input: {
  readonly status: QuoteStatus;
  readonly version: number;
  readonly latestVersion: number;
}): QuoteDocumentDecision {
  if (input.version < input.latestVersion) return { outcome: "VERSION_NOT_ACTIVE", latestVersion: input.latestVersion };
  if (!isPrintable(input.status)) return { outcome: "STATUS_CONFLICT", status: input.status };
  return { outcome: "ALLOWED" };
}

/**
 * Un devis ouvert s'imprime ; un devis ACCEPTÉ aussi — c'est LA version active, celle dont l'acompte a été réglé (E3, à venir) : la refuser serait
 * refuser le document qui compte le plus. Ne s'impriment pas : une affaire PERDUE (`QUOTE_LOST_STATUSES`) et le statut hérité `SUPERSEDED`.
 * ⚠ Jamais une troisième liste de statuts : `isQuoteOpen` et `QuoteStatus.ACCEPTED` sont les autorités, ce prédicat ne fait que les composer.
 */
function isPrintable(status: QuoteStatus): boolean {
  return isQuoteOpen(status) || status === QuoteStatus.ACCEPTED;
}
