// Politique du DOCUMENT du devis — module PUR. Rang 33 (D326), décisions 1 et 7 du relecteur.
//
// Deux décisions, aucune dépendance (ni Prisma, ni Nest, ni navigateur) : elles se rejouent en millisecondes, c'est ce qui permet de les
// neutraliser et de les rejouer à chaque passage (D187 : le motif qui tient est la vitesse, pas l'exécutabilité).
//
// ⛔ CE MODULE NE CALCULE AUCUN MONTANT et n'importe NI `pricing-engine` NI `deposit` : le PDF imprime la valeur STOCKÉE (précision de Ko,
// 05/10/2026 : « il ne doit jamais recalculer tout seul à partir des règles de prix actuelles »). `quote-document.spec.ts` garde cette absence.
import { isQuoteOpen, QUOTE_DOCUMENT_LOCALES, QuoteStatus, type QuoteDocumentLocale } from "@zwadj/types";

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

export type DocumentLocaleBranch = "CLIENT" | "FALLBACK";

/**
 * LA LANGUE DU PDF (décision 7) : celle du CLIENT quand elle est lisible « facilement » — pour CE devis, dans une colonne existante
 * (`users.locale`, seulement si le devis a un `clientId`) — sinon celle de l'interface du pro au moment du clic (le REPLI arbitré par Ko pour
 * cette première version). Un PDF, une langue.
 *
 * ⛔ LA COMPARAISON EST AU MINUSCULE, PARCE QUE L'ÉNUMÉRÉ LE EST. `booking-notification-input.ts` teste `"AR"` alors que `Locale` vaut `ar`
 * (F7, ouvert) : un client arabophone y reçoit du français sans qu'aucun test rougisse. Ici la valeur du compte est confrontée à la liste
 * `QUOTE_DOCUMENT_LOCALES` — l'autorité — et une valeur inconnue n'est PAS devinée : c'est le repli.
 */
export function chooseDocumentLocale(input: {
  readonly clientLocale: string | null;
  readonly fallback: QuoteDocumentLocale;
}): { readonly locale: QuoteDocumentLocale; readonly branch: DocumentLocaleBranch } {
  const lisible = QUOTE_DOCUMENT_LOCALES.find((l) => l === input.clientLocale);
  return lisible === undefined ? { locale: input.fallback, branch: "FALLBACK" } : { locale: lisible, branch: "CLIENT" };
}
