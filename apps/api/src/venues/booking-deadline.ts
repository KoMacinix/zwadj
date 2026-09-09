/**
 * D282 — UNE ÉCHÉANCE, ÉCRÊTÉE PAR LE DÉBUT DE L'ÉVÉNEMENT.
 *
 * Cet idiome était écrit DEUX FOIS dans `BookingsService`, en ligne, sans
 * aucune spec unitaire d'un côté ni de l'autre (MD6 du cadrage de S11-b) :
 *   - `create`  : `expiresAt`     = min(maintenant + délai pro,  début) ;
 *   - `accept`  : `paymentDueAt`  = min(acceptation + fenêtre,   début).
 *
 * ⛔ LES DEUX CONSTANTES NE FUSIONNENT PAS, ET CE MODULE EST CONSTRUIT POUR
 * QU'ELLES NE PUISSENT PAS. `PRO_RESPONSE_DAYS` (7 jours, D82) et
 * `PAYMENT_WINDOW_HOURS` (48 h, D82) sont deux valeurs MÉTIER distinctes : le
 * temps laissé au pro pour répondre n'a rien à voir avec le temps laissé au
 * client pour payer. La durée est donc un PARAMÈTRE — `windowMs` — et ce
 * fichier ne déclare aucune constante de durée. Écrire ici une valeur
 * harmonisée serait changer une règle métier sans l'avoir demandé.
 *
 * ⚠ CE MODULE NE LIT PAS L'HEURE (D48). L'instant de départ lui est donné. Le
 * service reste seul autorisé à appeler l'horloge — sans quoi ce module
 * deviendrait non déterministe pour tous ses appelants, tests compris.
 *
 * ⚠ IL NE LÈVE PAS et ne connaît ni code applicatif ni clé i18n : même idiome
 * que `booking-admission`, `booking-charge` et `booking-window`.
 *
 * -----------------------------------------------------------------------------
 * ⛔ LES DEUX CAS LIMITES SONT SPÉCIFIÉS TELS QUE LE CODE LES TRAITE
 *    AUJOURD'HUI — CE MODULE N'EN CHANGE AUCUN (D282)
 * -----------------------------------------------------------------------------
 * 1. ÉVÉNEMENT DANS MOINS D'UNE FENÊTRE ⇒ l'échéance EST le début de
 *    l'événement. L'écrêtage mord, et c'est la raison d'être de D82 : une
 *    demande pour dans cinq jours ne doit pas expirer APRÈS la fête.
 * 2. ÉVÉNEMENT DÉJÀ COMMENCÉ ⇒ l'échéance tombe DANS LE PASSÉ. C'est ce que
 *    `Math.min` produit, et c'est donc ce que le système fait depuis toujours.
 *
 * ⛔ CE QUE CE MODULE NE TRANCHE PAS, ET IL NE DOIT PAS : ce que vaut alors le
 * bouton « payer l'acompte ». Le cadrage de S11-b l'a relevé comme non écrit —
 * « personne n'a écrit ce que vaut alors le bouton » — et c'est une décision de
 * COMPORTEMENT, pas de découpage. Elle est rapportée pour arbitrage, PAS prise
 * ici : un lot de SRP qui corrige un comportement en passant est très exactement
 * le refactoring opportuniste que ce dépôt punit.
 * ⇒ Une échéance passée est donc RENDUE telle quelle, sans drapeau, sans
 * verdict et sans exception. Le jour où le comportement sera tranché, c'est ici
 * que la règle s'écrira — et la spec de ce module dira ce qu'elle a remplacé.
 */

/** Une échéance à écrêter. Les trois champs sont NOMMÉS : deux durées en
 *  millisecondes voisines dans une signature positionnelle s'interverticent en
 *  silence, et celle-ci est sur le chemin de l'argent. */
export interface DeadlineInput {
  /** Instant de départ du décompte, en millisecondes. Fourni par l'appelant. */
  readonly fromMs: number;
  /** Largeur de la fenêtre, en millisecondes. ⛔ Paramètre, jamais une constante
   *  de ce module : c'est ce qui garde les deux règles métier séparées. */
  readonly windowMs: number;
  /** Début de l'événement. L'échéance ne le dépasse JAMAIS (D82). */
  readonly eventStartsAt: Date;
}

/**
 * Rend l'échéance : `min(fromMs + windowMs, début de l'événement)`.
 *
 * ⚠ Le rendu est une `Date` neuve — jamais `eventStartsAt` lui-même, qui est un
 * objet de l'appelant et que rendre tel quel exposerait à une mutation à
 * distance sur une valeur du chemin de l'argent.
 */
export function deadlineClampedToEventStart({ fromMs, windowMs, eventStartsAt }: DeadlineInput): Date {
  return new Date(Math.min(fromMs + windowMs, eventStartsAt.getTime()));
}
