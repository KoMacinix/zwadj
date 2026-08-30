// Moteur de prix — Lot B2, D46. FONCTION PURE : aucun accès base, aucune date
// « maintenant », aucun fuseau implicite. Chemin d'argent ⇒ tout ce qui décide
// d'un montant est ici, testable ligne à ligne, et nulle part ailleurs.
//
// ── La règle de résolution, en une phrase ───────────────────────────────────
// UNE SEULE règle gagne. Des prix ABSOLUS ne se composent pas : « férié à
// 300 000 » et « week-end à 250 000 » ne peuvent pas produire 550 000, ni un
// quelconque mélange. Il faut donc un ordre total, et c'est celui-ci :
//
//     HOLIDAY  >  WEEKDAY  >  SEASON        (du plus spécifique au moins)
//     puis `priority` décroissante
//     puis la règle la plus RÉCEMMENT créée
//
// Le 1ᵉʳ novembre tombant un vendredi de haute saison prend le prix FÉRIÉ.
// Aucune règle applicable : le prix de base du créneau.
//
// ── Conséquence ACTÉE, pas subie ────────────────────────────────────────────
// Aucun cumul n'est possible. « Été ET vendredi = +30 % » n'existe pas : le pro
// saisit le prix qu'il veut pour ce cas. En échange il lit un montant en dinars
// sur chaque ligne, et le calcul n'a AUCUNE chaîne d'arrondis — donc aucune
// dérive d'un centime entre l'affichage, le devis et la commission.
import type { PricingRuleType } from "@zwadj/types";

/** Vue minimale d'une règle pour le résolveur. Volontairement structurelle :
 *  le moteur ne connaît ni Prisma ni le DTO. */
export interface PricingRuleLike {
  id: string;
  ruleType: PricingRuleType;
  priceCents: number;
  /** SEASON : mois de début/fin INCLUS, 1–12. La fenêtre peut enjamber
   *  décembre (11 → 2 = novembre à février). */
  startMonth: number | null;
  endMonth: number | null;
  /** WEEKDAY : jours concernés, 0 = dimanche … 6 = samedi. En Algérie le
   *  week-end est vendredi/samedi, soit [5, 6] — mais rien n'est codé en dur
   *  ici, c'est le pro qui coche. */
  daysOfWeek: number[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
}

/** Spécificité décroissante. C'est l'ordre de D46, et il n'est pas négociable
 *  à l'exécution : un férié est plus précis qu'un jour de semaine, qui est plus
 *  précis qu'une saison. */
const SPECIFICITY: Record<PricingRuleType, number> = { HOLIDAY: 3, WEEKDAY: 2, SEASON: 1 };

/** Composantes calendaires d'une date, en heure LOCALE de la salle.
 *  Le résolveur ne fabrique jamais ces valeurs lui-même : les extraire d'un
 *  `Date` reviendrait à choisir un fuseau en silence, et un mariage du
 *  vendredi soir deviendrait un jeudi pour un serveur en UTC. */
export interface CalendarDay {
  /** 1–12. */
  month: number;
  /** 0 = dimanche … 6 = samedi. */
  dayOfWeek: number;
  /** La date figure-t-elle dans le référentiel des jours fériés ? */
  isHoliday: boolean;
}

/** Fenêtre de mois INCLUSIVE, capable d'enjamber la fin d'année. */
export function monthInWindow(month: number, start: number, end: number): boolean {
  return start <= end ? month >= start && month <= end : month >= start || month <= end;
}

/** Prédicat d'applicabilité d'UNE famille de règle. */
type RuleMatcher = (rule: PricingRuleLike, day: CalendarDay) => boolean;

/** Registre des familles — lot S4 (audit F3).
 *
 *  ⚠ CE N'EST PAS UN `switch` DÉGUISÉ. Le `Record` est EXHAUSTIF sur
 *  `PricingRuleType` : ajouter une famille à l'énumération sans l'ajouter ici
 *  ne compile plus. Le `switch` d'origine, lui, retombait silencieusement sur
 *  son `default` — une règle d'un type neuf aurait cessé de s'appliquer sans
 *  qu'aucune erreur ne soit levée, et le prix de base serait sorti à la place.
 *  Sur un chemin d'argent, un oubli qui compile est pire qu'un oubli qui casse.
 *
 *  ⚠ `SPECIFICITY` reste séparé et INCHANGÉ : c'est l'arbitrage D46, pas
 *  l'applicabilité. Les fondre serait mélanger « cette règle concerne-t-elle ce
 *  jour ? » et « laquelle gagne ? ». */
const MATCHERS: Record<PricingRuleType, RuleMatcher> = {
  HOLIDAY: (_rule, day) => day.isHoliday,
  WEEKDAY: (rule, day) => rule.daysOfWeek.includes(day.dayOfWeek),
  // Une saison sans bornes ne veut rien dire : on la considère inapplicable
  // plutôt que « toute l'année », qui écraserait le prix de base sans que le
  // pro l'ait demandé.
  SEASON: (rule, day) =>
    rule.startMonth !== null && rule.endMonth !== null
      ? monthInWindow(day.month, rule.startMonth, rule.endMonth)
      : false
};

export function ruleApplies(rule: PricingRuleLike, day: CalendarDay): boolean {
  if (!rule.isActive) return false;
  // ⚠ LE REPLI DU `default:` EST CONSERVÉ TEL QUEL, et il n'est pas redondant
  // avec l'exhaustivité du `Record` : celle-ci vaut à la COMPILATION, tandis
  // qu'une colonne de base peut porter une valeur que le type ignore. Le
  // transtypage n'est pas une facilité, c'est ce qui rend ce repli exprimable.
  const matcher = (MATCHERS as Record<string, RuleMatcher | undefined>)[rule.ruleType];
  return matcher === undefined ? false : matcher(rule, day);
}

/** Comparateur d'arbitrage. Retourne < 0 si `a` l'emporte sur `b`. */
function beats(a: PricingRuleLike, b: PricingRuleLike): number {
  const bySpecificity = SPECIFICITY[b.ruleType] - SPECIFICITY[a.ruleType];
  if (bySpecificity !== 0) return bySpecificity;
  const byPriority = b.priority - a.priority;
  if (byPriority !== 0) return byPriority;
  // Départage FINAL, et il doit être total : deux règles de même type et même
  // priorité existent (le pro s'y reprend à deux fois). La plus récente gagne
  // — c'est la dernière intention exprimée. Le tiebreak par `id` garantit un
  // résultat déterministe même à createdAt identique.
  const byRecency = b.createdAt.getTime() - a.createdAt.getTime();
  if (byRecency !== 0) return byRecency;
  return a.id < b.id ? 1 : -1;
}

export interface PriceResolution {
  priceCents: number;
  /** `null` = aucune règle n'a gagné, c'est le prix de base du créneau. Exposé
   *  pour que l'UI puisse DIRE pourquoi ce prix-là, plutôt que d'afficher un
   *  montant que le pro ne s'explique pas. */
  ruleId: string | null;
  ruleType: PricingRuleType | null;
}

/**
 * Prix d'un créneau à une date donnée. `slotBasePriceCents` est le repli, et
 * il est TOUJOURS défini : un créneau ne peut pas exister sans prix (CHECK
 * `slot_templates_base_price_positive`).
 */
export function resolveSlotPrice(
  slotBasePriceCents: number,
  rules: readonly PricingRuleLike[],
  day: CalendarDay
): PriceResolution {
  const applicable = rules.filter((rule) => ruleApplies(rule, day));
  if (applicable.length === 0) {
    return { priceCents: slotBasePriceCents, ruleId: null, ruleType: null };
  }
  // `toSorted` n'est pas utilisé : la lib cible est ES2022. Copie explicite
  // pour ne jamais réordonner le tableau de l'appelant.
  const [winner] = [...applicable].sort(beats);
  if (!winner) return { priceCents: slotBasePriceCents, ruleId: null, ruleType: null };
  return { priceCents: winner.priceCents, ruleId: winner.id, ruleType: winner.ruleType };
}

/**
 * Arrondi au DINAR le plus proche, moitié vers le haut (D46-⑤).
 *
 * Inutile tant que les prix sont saisis en dinars entiers — c'est le cas
 * aujourd'hui, la résolution ne fait AUCUNE arithmétique. Cette fonction existe
 * pour le premier calcul qui en fera : commission, acompte, remise. Elle est
 * ici, avec le reste du chemin d'argent, pour qu'il n'en apparaisse jamais une
 * seconde ailleurs.
 */
export function roundToDinar(cents: number): number {
  return Math.round(cents / 100) * 100;
}
