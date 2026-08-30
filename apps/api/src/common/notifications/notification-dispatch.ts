// Cœur commun de la journalisation-et-envoi des notifications — lot S2 (F4).
//
// ⚠ CE FICHIER EST UN DÉPLACEMENT, PAS UNE RÉÉCRITURE. Le corps ci-dessous est
// celui que `booking-notifications.service.ts` et `visit-notifications.service.ts`
// portaient en DOUBLE, au caractère près — messages de log compris. Deux copies
// d'une règle qui ne lève jamais, c'est deux endroits où quelqu'un peut un jour
// « améliorer » la gestion d'erreur d'un seul côté : la salle serait notifiée
// selon une règle, le client selon une autre, et aucun test ne le dirait.
//
// ── Les cinq comportements que ce cœur DOIT garder ──────────────────────────
// 1. La ligne `QUEUED` s'écrit AVANT l'envoi. Deux écritures au lieu d'une, et
//    c'est le but : un process tué au milieu laisse une trace rejouable.
//    Écrire après l'envoi perdrait exactement ce qu'on voudrait rejouer.
// 2. Succès → `SENT` + `sentAt`.
// 3. Échec d'ENVOI → `FAILED` + motif TRONQUÉ à 500 + log d'erreur.
// 4. Échec de l'écriture de la TRACE elle-même → log seul. JAMAIS de levée :
//    une réservation acceptée en base ne se dé-accepte pas parce qu'un e-mail
//    est tombé (D63).
// 5. Envoi SYNCHRONE, après commit, sans file (D63 — inchangé par S2). L'appel
//    est `await`é : c'est ce qui rend les tests déterministes.
//
// ── Pourquoi une FONCTION et non un service injectable [ÉCART / directive S2] ─
// La directive demandait un injectable. Mesuré sur le dépôt, c'était
// impossible sans casser une garde : `visit-notifications.service.spec.ts`
// construit son service par `new VisitNotificationsService(prisma, email,
// whatsapp, logger)` — quatre arguments positionnels. Une cinquième dépendance
// injectée aurait imposé de MODIFIER cette spec pour la faire repasser au vert,
// c'est-à-dire exactement ce qu'un lot de refactoring n'a pas le droit de
// faire. Une fonction partagée laisse les deux constructeurs intacts, la spec
// verte sans une ligne touchée, et `venues.module.ts` sans nouveau provider.
// C'est aussi le patron déjà en place dans ce dossier : `renderTemplate`
// (`common/email/render.ts`) est une fonction, pas un service, et les deux
// mêmes appelants l'importent déjà ainsi.
//
// Le `logger` est PASSÉ par l'appelant, il n'est pas une dépendance d'ici : les
// deux services posent un contexte distinct (`BookingNotifications` /
// `VisitNotifications`) et un logger propre au répartiteur les aurait fondus en
// un seul. Un `setContext` par appel sur une instance partagée aurait été pire :
// une course entre deux requêtes concurrentes.
import type { PinoLogger } from "nestjs-pino";
import type { Prisma } from "../../generated/prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";

/** Canal de `NotificationChannel` (Prisma). Les deux appelants gardent leur
 *  propre alias littéral : s'ils divergeaient — l'un ajoutant un canal que ce
 *  cœur ne connaît pas — le typecheck TOMBERAIT. Une duplication qui ne peut
 *  pas dériver en silence n'est pas la duplication que S2 traque. */
export type NotificationChannel = "EMAIL" | "SMS";

export interface NotificationDispatchInput {
  prisma: PrismaService;
  logger: PinoLogger;
  /** Taxonomie applicative : `booking.requested`, `visit.cancelled`… */
  type: string;
  channel: NotificationChannel;
  userId: string;
  /** OPAQUE : chaque domaine y met ses propres clés (`bookingId` d'un côté,
   *  `visitBookingId` + `startMinutes` de l'autre). Ce cœur ne la lit jamais —
   *  la comprendre serait rouvrir la porte à deux comportements. */
  payload: Prisma.InputJsonValue;
  send: () => Promise<void>;
}

export async function dispatchNotification({
  prisma,
  logger,
  type,
  channel,
  userId,
  payload,
  send
}: NotificationDispatchInput): Promise<void> {
  try {
    const row = await prisma.notification.create({
      data: { userId, channel, type, status: "QUEUED", payload },
      select: { id: true }
    });

    try {
      await send();
      await prisma.notification.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await prisma.notification.update({
        where: { id: row.id },
        data: { status: "FAILED", error: reason.slice(0, 500) }
      });
      logger.error({ notificationId: row.id, type, channel }, `Envoi ${channel} échoué : ${reason}`);
    }
  } catch (error) {
    // La trace elle-même n'a pas pu s'écrire (base indisponible). Il reste le
    // log : ce n'est pas une raison pour renvoyer une erreur sur un acte qui,
    // lui, est bel et bien écrit.
    logger.error({ type, channel, userId }, `Notification non journalisée : ${String(error)}`);
  }
}
