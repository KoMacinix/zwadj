// PORT DE PAIEMENT — Phase 7, lots E3b (socle) puis E3b (Chargily).
//
// ⚠ POURQUOI UN PORT AVEC UN SEUL FOURNISSEUR. Chargily est le seul au MVP, et
// une interface pour un seul implémenteur ressemble à de la cérémonie. Elle ne
// l'est pas ici : BaridiMob exige un enrôlement marchand séparé (Algérie Poste)
// et n'entre pas dans l'agrégation Chargily. Le jour où il s'ajoute, soit il se
// branche derrière ce port, soit il faut rouvrir tout le chemin de l'argent —
// et rouvrir le chemin de l'argent est précisément ce que D126 organise pour
// éviter.
//
// C'est le même patron que `EMAIL_SENDER` : interface + jeton `Symbol`, adaptateur
// injecté par le module. Relevé sur `common/email/email.types.ts`, pas écrit de
// mémoire.
//
// ⚠ CE FICHIER NE CONTIENT TOUJOURS AUCUN NOM DE CHAMP CHARGILY. Il décrit NOS
// besoins ; la traduction vers `amount` / `success_url` / `checkout_url` vit
// dans `chargily.gateway.ts`, seul fichier autorisé à connaître le fournisseur.

/** Ce que le domaine demande à un fournisseur de paiement. */
export interface CheckoutRequest {
  /** Notre identifiant de paiement. Persisté de NOTRE côté, en regard de
   *  `providerCheckoutId` — il n'est PAS transmis au fournisseur.
   *  ⚠ Le socle le décrivait comme « clé de rapprochement au retour ». La
   *  capture réelle du bac à sable a montré que le seul canal qui aurait pu le
   *  porter (`metadata`) n'a jamais été testé et rend `null`. Le rapprochement
   *  repose donc sur `providerCheckoutId`, que la base indexe déjà. `metadata`
   *  ne redeviendra une option que le jour où on l'aura VU revenir dans un
   *  webhook réel (E3c). */
  paymentId: string;
  /** Montant réellement demandé, en CENTIMES. Déjà arrondi au dinar par
   *  `roundToDinar` (`venues/pricing-engine.ts`).
   *  ⚠ Le port reste en centimes — c'est l'unité du système entier, et la faire
   *  varier selon le destinataire ferait de chaque appelant un convertisseur.
   *  Chargily, lui, compte en DINARS : la conversion est un détail
   *  d'adaptateur, mesuré sur une capture réelle du bac à sable. */
  amountCents: number;
  /** ISO 4217. `DZD` au MVP ; le champ existe pour que le port ne mente pas. */
  currency: string;
  /** Où le fournisseur renvoie le client après une tentative RÉUSSIE. */
  successUrl: string;
  /** Où le fournisseur renvoie le client après une tentative ÉCHOUÉE.
   *
   *  ⚠ INVARIANT — AUCUNE DE CES DEUX URL NE FAIT FOI DU PAIEMENT.
   *  Une redirection de navigateur n'est pas une preuve : elle se rejoue, elle
   *  se forge à la main, et elle se perd si le client ferme l'onglet avant le
   *  retour. Les deux pages affichent « vérification en cours » et lisent le
   *  statut du `Payment` CHEZ NOUS. La seule source de vérité est le webhook
   *  signé (E3c). Deux URL existent pour que le fournisseur sache où renvoyer,
   *  jamais pour que l'application en déduise un résultat.
   *  ⚠ Corollaire exécutoire : le jour où une page de retour conclura « payé »
   *  parce qu'elle a été atteinte, c'est cette ligne-ci qui aura été franchie. */
  failureUrl: string;
}

/** Ce que le fournisseur rend en échange. */
export interface CheckoutSession {
  /** Identifiant de session côté fournisseur — persisté en `providerCheckoutId`. */
  providerCheckoutId: string;
  /** URL vers laquelle rediriger le client, RENDUE TELLE QUELLE.
   *  ⚠ Elle n'est ni réécrite, ni reconstruite à partir de l'identifiant.
   *  Reconstruire un motif d'URL observé une seule fois, c'est inventer un
   *  contrat ; la réécrire (par exemple de `http` vers `https`) c'est décider à
   *  la place du fournisseur. Voir `chargily.gateway.ts`. */
  redirectUrl: string;
}

export interface PaymentGateway {
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
}

/** Jeton d'injection du port (une interface TS n'existe pas à l'exécution). */
export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");
