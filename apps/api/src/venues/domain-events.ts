// ÉVÉNEMENTS DE DOMAINE — publication post-commit, lot S6 (audit F4, 2ᵉ moitié).
//
// ⚠ CE QUE CE FICHIER N'EST PAS. Ni `@nestjs/event-emitter`, ni pg-boss, ni un
// worker, ni une file. Cinquante lignes écrites à la main, aucune dépendance
// neuve. Un émetteur générique apporterait des chaînes magiques et une
// résolution dynamique là où l'on veut exactement l'inverse : des types
// discriminés que le compilateur vérifie.
//
// ⚠ D63 N'EST PAS RÉVOQUÉ, SON MOTIF EST ÉTENDU. D63 a écarté pg-boss pour les
// notifications — worker, schéma et déploiement en plus pour un envoi qui tient
// en un `await`. Ce lot ne change rien à cela : la publication est SYNCHRONE,
// EN PROCESSUS, `await`ée, et elle a lieu EXACTEMENT aux sites d'appel actuels,
// c'est-à-dire après résolution de la transaction. Ce qu'elle apporte est une
// COUTURE : E3c pourra substituer une implémentation pg-boss à cet éditeur sans
// toucher aux cas d'usage. Le motif de D63 s'enrichit, la décision tient.
//
// ⚠ POURQUOI L'`await` EST CONSERVÉ. Publier sans attendre rendrait chaque test
// non déterministe : l'assertion sur la ligne `Notification` courrait contre
// l'envoi. Le déterminisme des tests n'est pas un détail de confort, c'est ce
// qui rend les gardes de S2 exécutables.
import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import type { BookingNotificationInput } from "./booking-notifications.service";
import type { VisitNotificationInput } from "./visit-notifications.service";

/** Les événements réellement publiés — liste RELEVÉE sur les huit sites
 *  d'appel existants, pas imaginée.
 *
 *  ⚠ `booking.declined` ET `booking.cancelledByPro` sont DEUX événements
 *  distincts qui, aujourd'hui, mènent au MÊME envoi. C'est le comportement
 *  actuel, conservé tel quel : un lot de refactoring ne décide pas qu'une
 *  annulation pro mérite un autre courrier qu'un refus. Les séparer ici rend
 *  simplement ce choix VISIBLE — et modifiable un jour, sans toucher aux cas
 *  d'usage. */
export type DomainEvent =
  | { type: "booking.requested"; payload: BookingNotificationInput }
  | { type: "booking.accepted"; payload: BookingNotificationInput }
  | { type: "booking.declined"; payload: BookingNotificationInput }
  | { type: "booking.cancelledByPro"; payload: BookingNotificationInput }
  | { type: "visit.booked"; payload: VisitNotificationInput }
  | { type: "visit.cancelledByPro"; payload: VisitNotificationInput }
  | { type: "visit.cancelledByClient"; payload: VisitNotificationInput };

export type DomainEventType = DomainEvent["type"];

/** Charge utile associée à un type — le compilateur refuse un mauvais couple. */
export type PayloadOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>["payload"];

type Handler = (payload: never) => Promise<void>;

@Injectable()
export class DomainEvents {
  private readonly handlers = new Map<DomainEventType, Handler[]>();

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext("DomainEvents");
  }

  /** Abonne un handler. L'ORDRE d'abonnement est l'ordre d'exécution — c'est
   *  ce qui préserve « le pro d'abord, le client ensuite » sur une visite. */
  subscribe<T extends DomainEventType>(type: T, handler: (payload: PayloadOf<T>) => Promise<void>): void {
    const liste = this.handlers.get(type) ?? [];
    liste.push(handler as Handler);
    this.handlers.set(type, liste);
  }

  /** Publie, en séquence, en attendant chaque handler.
   *
   *  ⚠ NE LÈVE JAMAIS, ET C'EST LA RÈGLE CENTRALE (D63). Une réservation
   *  acceptée en base ne se dé-accepte pas parce qu'un e-mail est tombé.
   *  Aujourd'hui les services de notification n'attrapent que l'ENVOI : un
   *  gabarit qui casserait AVANT lui remonterait jusqu'au client, en 500, sur
   *  un acte pourtant écrit. La couture ferme ce chemin-là structurellement,
   *  au lieu de compter sur la bonne tenue de chaque handler.
   *
   *  ⚠ UN HANDLER QUI TOMBE N'EMPÊCHE PAS LES SUIVANTS. Sur `visit.booked`, le
   *  pro et le client sont prévenus par deux handlers : que le premier échoue
   *  ne doit pas priver le second de son courrier. */
  async publish<T extends DomainEventType>(type: T, payload: PayloadOf<T>): Promise<void> {
    for (const handler of this.handlers.get(type) ?? []) {
      try {
        await (handler as (p: PayloadOf<T>) => Promise<void>)(payload);
      } catch (error) {
        this.logger.error({ type }, `Handler en échec sur ${type} : ${String(error)}`);
      }
    }
  }
}
