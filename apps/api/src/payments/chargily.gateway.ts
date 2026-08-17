// ADAPTATEUR CHARGILY — Phase 7, lot E3b (Chargily).
//
// ⚠ SEUL FICHIER DU DÉPÔT AUTORISÉ À CONNAÎTRE CHARGILY. Noms de champs, unité
// monétaire, forme d'erreur : tout est ici, et tout provient d'une CAPTURE
// RÉELLE du bac à sable versionnée dans `__fixtures__/`. D126 interdit d'écrire
// une valeur de mémoire sur ce chemin ; aucune ligne de ce fichier ne vient de
// la documentation.
//
// ⚠ CE QU'IL NE FAIT PAS, ET C'EST LA LIGNE D'ARRÊT D'E3b : aucune bascule de
// statut, aucun `PAID`, aucune commission, aucune route HTTP. Il ouvre une
// session de règlement, il rend deux valeurs, il s'arrête.
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import type { CheckoutRequest, CheckoutSession, PaymentGateway } from "./payment.types";

/** Configuration injectée par `payments.module.ts` — jamais lue ici depuis
 *  `process.env` : un adaptateur qui va chercher sa config tout seul n'est pas
 *  testable sans variables d'environnement. */
export interface ChargilyConfig {
  /** Base COMPLÈTE de l'API, jusqu'à la version incluse.
   *  ⚠ Seule la base de TEST a été observée. Celle de production n'a jamais été
   *  capturée : elle se relève du tableau de bord, elle ne se déduit pas de
   *  l'autre. C'est pourquoi cette valeur n'a AUCUN défaut (voir `env.ts`). */
  baseUrl: string;
  secretKey: string;
  timeoutMs: number;
}

/** Cent centimes font un dinar. Constante nommée parce qu'elle apparaîtra
 *  ailleurs le jour du remboursement, et qu'un `/ 100` nu ne se cherche pas. */
const CENTIMES_PAR_DINAR = 100;

/** Ce que l'adaptateur lit dans la réponse : DEUX champs sur les trente-quatre
 *  que la capture contient. Un champ lu est un champ dont il faudra un jour
 *  expliquer la valeur — `fulfillment_status`, `account`, `earnings_consumed`
 *  et les autres restent délibérément hors du modèle. */
interface ChargilyCheckoutResponse {
  id?: unknown;
  checkout_url?: unknown;
}

@Injectable()
export class ChargilyGateway implements PaymentGateway {
  private readonly logger = new Logger(ChargilyGateway.name);

  constructor(private readonly config: ChargilyConfig) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const amount = this.toDinars(request.amountCents);

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/checkouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          // ⚠ MINUSCULE, relevé de la capture réelle. Notre colonne stocke
          // « DZD » — c'est la forme du fournisseur qui est particulière, pas la
          // nôtre, et la conversion se fait ici, à la frontière.
          currency: request.currency.toLowerCase(),
          success_url: request.successUrl,
          failure_url: request.failureUrl
        }),
        // ⚠ PREMIER APPEL SORTANT DU DÉPÔT (`grep fetch(` ne rendait rien hors
        // code généré). Sans délai, un fournisseur lent retient une requête
        // entrante jusqu'à épuisement du pool : la panne se propage chez nous.
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });
    } catch (cause) {
      // ⚠ MODE DE DÉFAILLANCE E3a-4 — ON NE SAIT PAS SI LA SESSION EXISTE.
      // Le délai expire APRÈS l'envoi : Chargily a peut-être créé le checkout
      // et c'est la réponse qui s'est perdue. On ne réessaie donc JAMAIS
      // automatiquement ici — une nouvelle tentative créerait une seconde
      // session pour une seule affaire. La session éventuellement orpheline est
      // inatteignable par le client (son URL ne lui est jamais parvenue) et
      // expire seule ; en revanche E3c devra ignorer proprement un webhook
      // portant un `providerCheckoutId` inconnu, au lieu d'échouer dessus.
      this.logger.error(
        `Chargily injoignable à la création de session (paymentId=${request.paymentId}) : ${describeCause(cause)}`
      );
      throw new ServiceUnavailableException({
        code: "PAYMENT_PROVIDER_UNREACHABLE",
        message: "payment.errors.providerUnreachable"
      });
    }

    if (!response.ok) {
      // ⚠ MODE DE DÉFAILLANCE E3a-5 — LE FOURNISSEUR A RÉPONDU, ET IL DIT NON.
      // 502 et non 503 : il est joignable, c'est la demande qu'il refuse. La
      // distinction porte pour la supervision — l'une se réessaie, l'autre non.
      const detail = await this.readProviderMessage(response);
      this.logger.error(
        `Chargily refuse la création de session (paymentId=${request.paymentId}, http=${response.status}) : ${detail}`
      );
      // ⚠ LE MESSAGE DU FOURNISSEUR N'EST PAS RENVOYÉ AU CLIENT. Il est en
      // anglais, non traduit, et décrit notre requête — pas ce que la personne
      // doit faire. Le contrat d'erreur du dépôt est `{ code, clé i18n }`.
      throw new BadGatewayException({
        code: "PAYMENT_PROVIDER_REFUSED",
        message: "payment.errors.providerRefused"
      });
    }

    return this.readSession(response, request.paymentId);
  }

  /**
   * ⚠ ELLE REFUSE, ELLE N'ARRONDIT PAS.
   *
   * Chargily compte en DINARS — mesuré : `amount: 5000` affiche « 5 000,00 DA »
   * sur sa page de règlement, et un `amount: 1` est refusé par
   * « must be greater than or equal to 50 ». Notre système compte en centimes,
   * et `roundToDinar` garantit des multiples de 100 : la division est donc
   * EXACTE par construction.
   *
   * Si elle ne l'est pas, c'est qu'un montant non arrondi est arrivé jusqu'ici.
   * Arrondir à cet endroit produirait un SECOND calcul monétaire du même
   * montant — exactement ce que D188 interdit pour `resolveDepositCents` — et
   * masquerait le défaut amont derrière un paiement qui « marche ». 500 assumé :
   * c'est notre incohérence, pas une erreur du client.
   *
   * ⚠ Le minimum de 50 DA n'est PAS recopié ici. Dupliquer une borne du
   * fournisseur, c'est promettre de la maintenir : le jour où il la déplace,
   * nous refuserions des paiements qu'il accepte, sans que rien ne rougisse.
   * L'autorité sur ses bornes est à lui — nous traduisons son refus (D55).
   */
  private toDinars(amountCents: number): number {
    if (!Number.isInteger(amountCents) || amountCents % CENTIMES_PAR_DINAR !== 0) {
      throw new InternalServerErrorException({
        code: "PAYMENT_AMOUNT_NOT_WHOLE_DINAR",
        message: "payment.errors.amountNotWholeDinar"
      });
    }
    return amountCents / CENTIMES_PAR_DINAR;
  }

  /**
   * ⚠ ON NE FAIT PAS CONFIANCE À LA FORME DE LA RÉPONSE, MÊME EN 200.
   * Un fournisseur qui change son schéma sans prévenir produirait ici un
   * `undefined` silencieux, persisté en `providerCheckoutId`, puis un
   * rapprochement impossible le jour du webhook — donc un paiement encaissé que
   * personne ne sait rattacher. Deux champs, deux vérifications, un refus fort.
   */
  private async readSession(response: Response, paymentId: string): Promise<CheckoutSession> {
    let body: ChargilyCheckoutResponse;
    try {
      body = (await response.json()) as ChargilyCheckoutResponse;
    } catch {
      body = {};
    }

    const providerCheckoutId = typeof body.id === "string" ? body.id : "";
    // ⚠ RENDUE TELLE QUELLE. La capture donne `http://pay.chargily.dz/...`,
    // en clair et sur un hôte différent de l'API (`https://pay.chargily.net`).
    // La réécrire en `https` serait décider à la place du fournisseur ; la
    // reconstruire à partir de l'identifiant serait inventer un contrat sur un
    // motif vu une seule fois. Si le clair pose problème, c'est un sujet à
    // porter à Chargily, pas un correctif à écrire ici.
    const redirectUrl = typeof body.checkout_url === "string" ? body.checkout_url : "";

    if (providerCheckoutId === "" || redirectUrl === "") {
      this.logger.error(
        `Réponse Chargily inexploitable (paymentId=${paymentId}) : id=${String(body.id)} checkout_url=${String(body.checkout_url)}`
      );
      throw new BadGatewayException({
        code: "PAYMENT_PROVIDER_MALFORMED",
        message: "payment.errors.providerMalformed"
      });
    }

    return { providerCheckoutId, redirectUrl };
  }

  /**
   * Extrait de quoi DIAGNOSTIQUER, jamais de quoi afficher.
   *
   * ⚠ La forme d'erreur vient d'une capture réelle — `{"message": "...",
   * "errors": {"amount": ["..."]}}` — et non de la documentation. Elle est donc
   * lue de façon défensive : une seule forme a été observée, rien ne dit que
   * c'est la seule. Tout ce qui n'y ressemble pas retombe sur le corps brut,
   * tronqué : un journal ne doit jamais devenir le vecteur d'une réponse
   * fournisseur de plusieurs mégaoctets.
   */
  private async readProviderMessage(response: Response): Promise<string> {
    let raw: string;
    try {
      raw = await response.text();
    } catch {
      return "(corps illisible)";
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        const message = (parsed as { message?: unknown }).message;
        if (typeof message === "string" && message !== "") return message;
      }
    } catch {
      /* pas du JSON : on retombe sur le brut ci-dessous */
    }
    return raw.slice(0, 500);
  }
}

/** `AbortSignal.timeout` lève un `TimeoutError`, une coupure réseau un
 *  `TypeError` : les deux se journalisent, aucun ne se confond avec l'autre. */
function describeCause(cause: unknown): string {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return String(cause);
}
