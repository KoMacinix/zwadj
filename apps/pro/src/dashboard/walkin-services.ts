// FP-1 (session `front-client`) — LE CHOIX D'UNE PRESTATION AU COMPTOIR, TEL QUE LE CONTRAT L'ATTEND. Module PUR (D187) : il se
// rejoue en millisecondes, sans écran ni serveur, et c'est ce qui le rend neutralisable à chaque passage.
//
// ⛔ AUCUN MONTANT N'EST CALCULÉ ICI (règle des montants, D325) : la valeur envoyée est celle SAISIE ; le prix d'un palier, d'une
// unité, le total — c'est le SERVEUR qui les résout depuis le catalogue (D91), et l'écran affiche ce qu'il rend.
// ⛔ LE CONTRAT (`bookingServiceChoiceSchema`, `@zwadj/types`) : `tierId` REQUIS en TIERED et INTERDIT ailleurs ; `quantity` REQUISE en
// PER_UNIT et INTERDITE ailleurs. Un choix incomplet ne part PAS : la règle rend `null`, l'écran le dit et retient « Voir le devis ».
// Modes de défaillance : `docs/preuves/front-client/FP-1/modes-de-defaillance.md` (MD-1 à MD-11).
import { ServicePricingType, type BookingServiceChoice, type ServiceDTO } from "@zwadj/types";

/** Ce que le pro a SAISI pour une prestation cochée : le palier choisi, la quantité tapée (texte du champ). */
export interface DetailSaisi {
  tierId?: string;
  quantite?: string;
}

/** Le choix d'UNE prestation, conforme au contrat — ou `null` quand le détail qu'elle exige manque ou est hors bornes. */
export function choixDePrestation(service: ServiceDTO, detail?: DetailSaisi): BookingServiceChoice | null {
  switch (service.pricingType) {
    case ServicePricingType.TIERED: {
      // MD-1 : aucun palier par défaut ; MD-11 : un palier ACTIF de CETTE prestation, rien d'autre.
      const palier = service.tiers.find((t) => t.isActive && t.id === detail?.tierId);
      return palier === undefined ? null : { serviceId: service.id, tierId: palier.id };
    }
    case ServicePricingType.PER_UNIT: {
      // MD-5 : un ENTIER saisi tel quel — ni virgule, ni signe, ni exposant ; MD-3 : les bornes du CATALOGUE, incluses.
      const saisie = (detail?.quantite ?? "").trim();
      if (!/^[0-9]+$/.test(saisie)) return null;
      const quantite = Number(saisie);
      if (!Number.isSafeInteger(quantite) || quantite < 1) return null;
      if (service.minUnits !== null && quantite < service.minUnits) return null;
      if (service.maxUnits !== null && quantite > service.maxUnits) return null;
      return { serviceId: service.id, quantity: quantite };
    }
    default:
      // MD-4 : FIXED et PER_GUEST n'emportent NI palier NI quantité, même si l'écran en gardait une.
      return { serviceId: service.id };
  }
}

/** Les choix de TOUTES les prestations cochées, dans l'ordre où elles l'ont été, et les IDENTIFIANTS de celles qui ne peuvent pas
 *  partir. ⚠ Une prestation cochée absente du catalogue n'est jamais envoyée « à vide », ni omise en silence (le devis changerait sans
 *  que l'écran le dise) : elle compte comme un manque. */
export function choixDuDevis(
  coches: readonly string[],
  catalogue: readonly ServiceDTO[],
  details: Readonly<Record<string, DetailSaisi>>
): { choix: BookingServiceChoice[]; manquants: string[] } {
  const choix: BookingServiceChoice[] = [];
  const manquants: string[] = [];
  for (const id of coches) {
    const service = catalogue.find((s) => s.id === id);
    const un = service === undefined ? null : choixDePrestation(service, details[id]);
    if (un === null) manquants.push(id);
    else choix.push(un);
  }
  return { choix, manquants };
}
