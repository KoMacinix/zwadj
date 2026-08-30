// Notifications des visites (Lot C3, D63) — doubles de ports, aucune base.
//
// Ce qui se prouve ICI et nulle part ailleurs : la matrice de canaux de D60, la
// langue du DESTINATAIRE, et surtout qu'un envoi qui LÈVE devient une ligne
// FAILED sans jamais remonter à l'appelant. En intégration on verrait bien la
// ligne, mais pas la composition du message.
import { describe, expect, it, vi } from "vitest";
import { VisitNotificationsService, type VisitNotificationInput } from "./visit-notifications.service";

interface Created {
  userId: string;
  channel: string;
  type: string;
  status: string;
}

/** Double Prisma minimal : mémorise les créations et les mises à jour.
 *  ⚠ Créé à CHAQUE appel, jamais partagé entre tests — un `vi.fn()` de portée
 *  module rendrait les compteurs dépendants de l'ordre d'exécution. */
function prismaDouble() {
  const created: Created[] = [];
  const updated: { id: string; data: Record<string, unknown> }[] = [];
  return {
    created,
    updated,
    notification: {
      create: vi.fn(async ({ data }: { data: Created }) => {
        created.push(data);
        return { id: `n${created.length}` };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        updated.push({ id: where.id, data });
        return {};
      })
    }
  };
}

const loggerDouble = () => ({ setContext: vi.fn(), info: vi.fn(), error: vi.fn() });

/** Les doubles d'envoi déclarent leur ARGUMENT : sans lui, `mock.calls[0][0]`
 *  est un tuple vide pour TypeScript et le typecheck tombe — porte franchie
 *  avant la livraison, jamais après. */
interface SentEmail {
  to: string;
  subject: string;
  text: string;
}
interface SentWhatsApp {
  to: string;
  text: string;
}

function makeInput(over: Partial<VisitNotificationInput> = {}): VisitNotificationInput {
  return {
    visitBookingId: "vb-1",
    venueId: "v-1",
    venueNameFr: "Salle El Ryad",
    venueNameAr: "قاعة الرياض",
    date: "2027-08-15",
    // 20:30 — l'heure la plus révélatrice : un formateur qui bascule en AM/PM
    // écrirait « 8:30 PM » (D57 l'interdit).
    startMinutes: 1230,
    clientName: "Amina Bensalem",
    contact: "+213550000001",
    pro: {
      userId: "pro-1",
      email: "pro@example.dz",
      locale: "fr",
      phone: "+213550000009",
      notifyByEmail: true,
      notifyBySms: false
    },
    client: { userId: "cli-1", email: "amina@example.dz", locale: "fr" },
    ...over
  };
}

function build(options: { emailThrows?: boolean; whatsAppThrows?: boolean } = {}) {
  const prisma = prismaDouble();
  const emailSend = vi.fn(async (_input: SentEmail) => {
    if (options.emailThrows) throw new Error("SMTP indisponible");
  });
  const whatsAppSend = vi.fn(async (_input: SentWhatsApp) => {
    if (options.whatsAppThrows) throw new Error("passerelle WhatsApp indisponible");
  });
  const logger = loggerDouble();
  const service = new VisitNotificationsService(
    prisma as never,
    { send: emailSend } as never,
    { send: whatsAppSend } as never,
    logger as never
  );
  return { service, prisma, emailSend, whatsAppSend, logger };
}

describe("VisitNotificationsService — canaux du pro (D60)", () => {
  it("notifyByEmail seul → 1 e-mail, 0 WhatsApp, 1 ligne Notification EMAIL résolue SENT", async () => {
    const { service, prisma, emailSend, whatsAppSend } = build();
    await service.notifyProBooked(makeInput());

    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(whatsAppSend).not.toHaveBeenCalled();
    expect(prisma.created).toHaveLength(1);
    expect(prisma.created[0]).toMatchObject({ userId: "pro-1", channel: "EMAIL", type: "visit.booked", status: "QUEUED" });
    expect(prisma.updated[0]?.data).toMatchObject({ status: "SENT" });
  });

  it("notifyBySms seul → 1 WhatsApp sur le numéro du pro, 0 e-mail", async () => {
    const { service, prisma, emailSend, whatsAppSend } = build();
    await service.notifyProBooked(
      makeInput({ pro: { ...makeInput().pro, notifyByEmail: false, notifyBySms: true } })
    );

    expect(emailSend).not.toHaveBeenCalled();
    expect(whatsAppSend).toHaveBeenCalledTimes(1);
    expect(whatsAppSend.mock.calls[0]![0]).toMatchObject({ to: "+213550000009" });
    expect(prisma.created[0]).toMatchObject({ channel: "SMS" });
  });

  it("les DEUX drapeaux → 2 envois et 2 lignes, une par canal", async () => {
    const { service, prisma, emailSend, whatsAppSend } = build();
    await service.notifyProBooked(makeInput({ pro: { ...makeInput().pro, notifyBySms: true } }));

    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(whatsAppSend).toHaveBeenCalledTimes(1);
    expect(prisma.created.map((row) => row.channel)).toEqual(["EMAIL", "SMS"]);
  });
});

describe("VisitNotificationsService — annulation par le PRO (C3b)", () => {
  it("c'est le CLIENT qui est prévenu, par e-mail, quels que soient les canaux du pro", async () => {
    const { service, prisma, emailSend, whatsAppSend } = build();
    // Pro réglé sur WhatsApp SEUL : ses préférences (D60) gouvernent ce qu'IL
    // reçoit, pas ce que reçoit le client. Le confondre enverrait l'annulation
    // au numéro du pro et laisserait le client venir pour rien.
    await service.notifyClientCancelledByPro(
      makeInput({ pro: { ...makeInput().pro, notifyByEmail: false, notifyBySms: true } })
    );

    expect(whatsAppSend).not.toHaveBeenCalled();
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(emailSend.mock.calls[0]![0].to).toBe(makeInput().client.email);
    expect(prisma.created[0]).toMatchObject({
      userId: "cli-1",
      channel: "EMAIL",
      type: "visit.cancelledByPro",
      status: "QUEUED"
    });
    expect(prisma.updated[0]?.data).toMatchObject({ status: "SENT" });
  });

  it("langue du CLIENT, pas du pro : un client en `ar` reçoit le corps arabe", async () => {
    const { service, emailSend } = build();
    const base = makeInput();
    await service.notifyClientCancelledByPro({
      ...base,
      pro: { ...base.pro, locale: "fr" },
      client: { ...base.client, locale: "ar" }
    });

    expect(emailSend.mock.calls[0]![0].subject).toMatch(/[\u0600-\u06FF]/);
  });

  it("envoi en ÉCHEC : la ligne passe FAILED et rien ne remonte — l'annulation reste faite", async () => {
    const { service, prisma, emailSend } = build();
    emailSend.mockRejectedValueOnce(new Error("smtp down"));

    // Ne lève pas : le rendez-vous est annulé en base avant l'envoi, et une
    // exception ici ne le dé-annulerait pas — elle rendrait juste 500 sur une
    // opération réussie.
    await expect(service.notifyClientCancelledByPro(makeInput())).resolves.toBeUndefined();
    expect(prisma.updated[0]?.data).toMatchObject({ status: "FAILED" });
  });

  it("le gabarit se rend sans variable manquante — `renderTemplate` lève sur un trou", async () => {
    const { service, emailSend } = build();
    await service.notifyClientCancelledByPro(makeInput());

    const body = emailSend.mock.calls[0]![0].text;
    // Le défaut réel attrapé en intégration : `{clientName}` au lieu de
    // `{client}` faisait lever le rendu, donc partir la ligne en FAILED.
    expect(body).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(body).toContain("20:30");
  });
});

describe("VisitNotificationsService — contenu", () => {
  it("l'heure est en 24 h (formatWallClock) : « 20:30 », jamais « 8:30 PM » (D57)", async () => {
    const { service, emailSend } = build();
    await service.notifyProBooked(makeInput());

    const body = emailSend.mock.calls[0]![0].text;
    expect(body).toContain("20:30");
    expect(body).not.toMatch(/PM|AM/);
  });

  it("la langue est celle du DESTINATAIRE : un pro en `ar` reçoit le corps arabe", async () => {
    const { service, emailSend } = build();
    await service.notifyProBooked(makeInput({ pro: { ...makeInput().pro, locale: "ar" } }));

    const sent = emailSend.mock.calls[0]![0];
    expect(sent.subject).toContain("موعد زيارة جديد");
    expect(sent.text).toContain("قاعة الرياض");
  });

  it("client sans téléphone : le pro reçoit l'e-mail de rappel, jamais « null » (D61)", async () => {
    const { service, emailSend } = build();
    await service.notifyProBooked(makeInput({ contact: "amina@example.dz" }));

    const body = emailSend.mock.calls[0]![0].text;
    expect(body).toContain("amina@example.dz");
    expect(body).not.toMatch(/null|undefined/);
  });

  it("la confirmation du client part dans SA langue, indépendamment de celle du pro", async () => {
    const { service, prisma, emailSend } = build();
    await service.confirmToClient(
      makeInput({ pro: { ...makeInput().pro, locale: "ar" }, client: { userId: "cli-1", email: "amina@example.dz", locale: "fr" } })
    );

    const sent = emailSend.mock.calls[0]![0];
    expect(sent.to).toBe("amina@example.dz");
    expect(sent.subject).toContain("Votre visite est confirmée");
    expect(prisma.created[0]).toMatchObject({ userId: "cli-1", type: "visit.confirmed" });
  });

  it("l'annulation dit au pro que le créneau est LIBÉRÉ — sinon il croit sa journée prise", async () => {
    const { service, prisma, emailSend } = build();
    await service.notifyProCancelled(makeInput());

    expect(prisma.created[0]).toMatchObject({ type: "visit.cancelled" });
    expect(emailSend.mock.calls[0]![0].text).toContain("libéré");
  });
});

describe("VisitNotificationsService — un envoi tombé ne dé-réserve rien (D63)", () => {
  it("l'envoyeur LÈVE → ligne FAILED + error, et AUCUNE exception ne remonte", async () => {
    const { service, prisma, logger } = build({ emailThrows: true });

    await expect(service.notifyProBooked(makeInput())).resolves.toBeUndefined();

    expect(prisma.updated).toHaveLength(1);
    expect(prisma.updated[0]?.data).toMatchObject({ status: "FAILED" });
    expect(String(prisma.updated[0]?.data.error)).toContain("SMTP indisponible");
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("un canal en panne n'empêche PAS l'autre : WhatsApp échoue, l'e-mail passe", async () => {
    const { service, prisma, emailSend } = build({ whatsAppThrows: true });
    await service.notifyProBooked(makeInput({ pro: { ...makeInput().pro, notifyBySms: true } }));

    expect(emailSend).toHaveBeenCalledTimes(1);
    const statuses = prisma.updated.map((row) => row.data.status);
    expect(statuses).toEqual(["SENT", "FAILED"]);
  });

  it("même l'écriture de la trace peut échouer : on logge, on ne lève pas", async () => {
    const { service, prisma, logger } = build();
    prisma.notification.create.mockRejectedValueOnce(new Error("base indisponible"));

    await expect(service.notifyProBooked(makeInput())).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
