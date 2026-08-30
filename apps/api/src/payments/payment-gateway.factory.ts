// Choix de l'adaptateur de paiement — Phase 7, lot E3b (Chargily).
//
// ⚠ FONCTION PURE, ET POUR LA RAISON DE D187 (motif réécrit par D192) : elle se
// rejoue en millisecondes, sans amorçage Nest ni `ConfigService`, donc sa
// neutralisation est rejouable à chaque passage. Le module ne fait que
// l'appeler. Un aiguillage enfoui dans une `useFactory` ne se teste qu'en
// montant un module entier — c'est-à-dire rarement, c'est-à-dire tard.
import { ChargilyGateway } from "./chargily.gateway";
import type { PaymentGateway } from "./payment.types";
import { UnavailablePaymentGateway } from "./unavailable.gateway";

/** Le sous-ensemble de l'environnement dont dépend le choix. Volontairement
 *  restreint : ce que la fonction ne lit pas, elle ne peut pas s'y tromper. */
export interface PaymentGatewaySettings {
  PAYMENTS_ENABLED: boolean;
  CHARGILY_BASE_URL?: string;
  CHARGILY_SECRET_KEY?: string;
  CHARGILY_TIMEOUT_MS: number;
}

/**
 * ⚠ LE DRAPEAU MAÎTRE PASSE AVANT TOUT. Éteint, on rend l'adaptateur qui refuse
 * — même si la clé et l'URL sont présentes et valides. Un fournisseur configuré
 * ne doit jamais pouvoir s'allumer derrière le dos du drapeau : c'est
 * exactement ce que le drapeau existe pour empêcher (E3a).
 *
 * ⚠ AUCUN REPLI SILENCIEUX. Drapeau allumé sans clé ni URL, on lève au lieu de
 * retomber sur l'adaptateur qui refuse. `env.ts` fait déjà échouer le boot dans
 * ce cas ; ce contrôle-ci est la seconde serrure, pour le jour où quelqu'un
 * appellera cette fonction sans passer par la validation d'environnement. Un
 * repli rendrait la configuration cassée indiscernable de la configuration
 * « paiements éteints » — et c'est précisément le silence qui coûte cher ici.
 */
export function createPaymentGateway(settings: PaymentGatewaySettings): PaymentGateway {
  if (!settings.PAYMENTS_ENABLED) return new UnavailablePaymentGateway();

  const manquantes = (["CHARGILY_BASE_URL", "CHARGILY_SECRET_KEY"] as const).filter(
    (cle) => settings[cle] === undefined || settings[cle] === ""
  );
  if (manquantes.length > 0) {
    throw new Error(
      `PAYMENTS_ENABLED est allumé mais la configuration Chargily est incomplète : ${manquantes.join(", ")}`
    );
  }

  return new ChargilyGateway({
    baseUrl: settings.CHARGILY_BASE_URL as string,
    secretKey: settings.CHARGILY_SECRET_KEY as string,
    timeoutMs: settings.CHARGILY_TIMEOUT_MS
  });
}
