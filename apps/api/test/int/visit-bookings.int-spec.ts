// Intégration Flux C, Lot C3 — prise de rendez-vous de visite (D61, D62, D63).
//
// Ce qui ne se prouve QU'ICI :
//   - qu'une plage NON alignée sur 30 minutes (09:20→10:20) rend 09:20 et 09:50,
//     et que 09:40 est refusé — le bug qu'un `% 30` aurait introduit (D55) ;
//   - que l'exclusivité vient de la BASE : deux clients sur le même créneau, le
//     second reçoit 409 via le P2002 traduit, et le premier survit (D59) ;
//   - qu'une annulation LIBÈRE réellement le créneau (index unique PARTIEL) ;
//   - la garde « un rendez-vous à venir par salle » et ses deux exceptions :
//     autre salle, rendez-vous déjà passé (D62) ;
//   - que la règle de visibilité est celle de /visit-slots, TEMPORARILY_UNAVAILABLE
//     comprise — sinon on proposerait des créneaux que le POST refuserait ;
//   - que les lignes `Notification` sont écrites selon les canaux du pro (D60) ;
//   - qu'un envoi qui TOMBE laisse le rendez-vous confirmé (D63).
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenueProDTO, VisitBookingDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO = {
  role: "PRO",
  email: "pro@example.dz",
  password: "Motdepasse1",
  businessName: "Salles Pro",
  phone: "+213550000009"
};
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Amina", lastName: "Bensalem" };
const CLIENT2 = { role: "CLIENT", email: "client2@example.dz", password: "Motdepasse1", firstName: "Yacine", lastName: "Haddad" };

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Dimanche LOINTAIN : l'écrêtage D49 ne s'applique pas à l'écriture, mais un
 *  créneau passé est refusé — les fixtures visent donc l'avenir. */
const DIMANCHE = "2027-08-15";
const LUNDI = "2027-08-16";

/** Plage 09:20 → 10:20, VOLONTAIREMENT non alignée sur 30 minutes : elle rend
 *  exactement deux rendez-vous, 09:20 et 09:50, et s'arrête là (10:20 − 30 min). */
const W_START = 9 * 60 + 20; // 560
const SLOT_1 = 560; // 09:20
const SLOT_2 = 590; // 09:50
const W_END = 10 * 60 + 20; // 620

/** Le dernier dimanche ÉCOULÉ : la plage hebdomadaire existe (même jour de la
 *  semaine), et pourtant tous ses créneaux sont passés. */
const lastSundayPast = (): string => {
  const d = new Date(Date.now() - 86_400_000);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Premier dimanche au-delà de l'horizon de 18 mois (~548 jours) : la plage
 *  existe, seule la distance dans le temps doit motiver le refus. */
const sundayBeyondHorizon = (): string => {
  const d = new Date(Date.now() + 560 * 86_400_000);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

interface Fixture {
  proToken: string;
  adminToken: string;
  clientToken: string;
  client2Token: string;
  venueA: VenueProDTO;
  venueB: VenueProDTO;
}

async function venue(proToken: string, cityId: string, nameFr: string): Promise<VenueProDTO> {
  const created = await api()
    .post("/api/v1/venues")
    .set(authH(proToken))
    .send({ cityId, nameFr, nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" })
    .expect(201);
  const dto = created.body as VenueProDTO;
  await api()
    .post(`/api/v1/venues/${dto.id}/slot-templates`)
    .set(authH(proToken))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 20_000_000 })
    .expect(201);
  return dto;
}

async function setup(): Promise<Fixture> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const proToken = await loginAs(ctx, PRO.email, PRO.password);

  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });

  const venueA = await venue(proToken, city.id, "Salle El Ryad");
  const venueB = await venue(proToken, city.id, "Salle El Firdaws");

  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  const adminToken = await loginAs(ctx, ADMIN.email, ADMIN.password);
  await api().post(`/api/v1/admin/venues/${venueA.id}/publish`).set(authH(adminToken)).expect(200);
  await api().post(`/api/v1/admin/venues/${venueB.id}/publish`).set(authH(adminToken)).expect(200);

  // La MÊME plage sur les deux salles : le test « autre salle » doit isoler la
  // seule variable qui compte, la salle.
  for (const id of [venueA.id, venueB.id]) {
    await api()
      .post(`/api/v1/venues/${id}/visit-availabilities`)
      .set(authH(proToken))
      .send({ dayOfWeek: 0, startMinutes: W_START, endMinutes: W_END })
      .expect(201);
  }

  await registerUser(ctx, CLIENT);
  await verifyLastRegistered(ctx);
  const clientToken = await loginAs(ctx, CLIENT.email, CLIENT.password);

  await registerUser(ctx, CLIENT2);
  await verifyLastRegistered(ctx);
  const client2Token = await loginAs(ctx, CLIENT2.email, CLIENT2.password);

  return { proToken, adminToken, clientToken, client2Token, venueA, venueB };
}

const book = (token: string, slug: string, body: Record<string, unknown>) =>
  api().post(`/api/v1/venues/${slug}/visit-bookings`).set(authH(token)).send(body);

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await truncateAll(ctx.prisma);
  ctx.emails.length = 0;
  ctx.whatsapps.length = 0;
  ctx.senders.failEmail = false;
  ctx.senders.failWhatsApp = false;
});

describe("POST /venues/:slug/visit-bookings — le créneau doit EXISTER (D55, D61)", () => {
  it("plage 09:20→10:20 : 09:20 et 09:50 sont réservables, 09:40 est REFUSÉ", async () => {
    const f = await setup();

    const first = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
    expect((first.body as VisitBookingDTO)).toMatchObject({
      date: DIMANCHE,
      startMinutes: SLOT_1,
      status: "CONFIRMED",
      venueSlug: f.venueA.slug
    });

    // 09:50 dans une AUTRE salle : la garde D62 ne doit pas masquer le fait que
    // le créneau existe.
    await book(f.clientToken, f.venueB.slug, { date: DIMANCHE, startMinutes: SLOT_2 }).expect(201);

    const refused = await book(f.client2Token, f.venueA.slug, { date: DIMANCHE, startMinutes: 580 }).expect(409);
    expect(refused.body.message).toEqual({
      code: "VISIT_SLOT_UNAVAILABLE",
      message: "venue.errors.visitSlotUnavailable"
    });
  });

  it("10:00 tombe DANS la plage mais ne rend pas un créneau entier → refusé", async () => {
    const f = await setup();
    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: 600 }).expect(409);
  });

  it("un jour SANS plage → refusé ; une plage SUSPENDUE → refusée", async () => {
    const f = await setup();
    await book(f.clientToken, f.venueA.slug, { date: LUNDI, startMinutes: SLOT_1 }).expect(409);

    const windows = await api()
      .get(`/api/v1/pro/venues/${f.venueA.id}/visit-availabilities`)
      .set(authH(f.proToken))
      .expect(200);
    const windowId = (windows.body as { id: string }[])[0]!.id;
    await api()
      .patch(`/api/v1/venues/${f.venueA.id}/visit-availabilities/${windowId}`)
      .set(authH(f.proToken))
      .send({ isActive: false })
      .expect(200);

    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(409);
  });

  it("créneau PASSÉ (dernier dimanche écoulé) et date au-delà de l'horizon 18 mois → refusés", async () => {
    const f = await setup();
    await book(f.clientToken, f.venueA.slug, { date: lastSundayPast(), startMinutes: SLOT_1 }).expect(409);
    await book(f.clientToken, f.venueA.slug, { date: sundayBeyondHorizon(), startMinutes: SLOT_1 }).expect(409);
  });
});

describe("POST /venues/:slug/visit-bookings — exclusivité garantie par la BASE (D59)", () => {
  it("deux clients sur le MÊME créneau : le second reçoit 409 VISIT_SLOT_TAKEN, le premier survit", async () => {
    const f = await setup();
    const mine = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    const clash = await book(f.client2Token, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(409);
    expect(clash.body.message).toEqual({ code: "VISIT_SLOT_TAKEN", message: "venue.errors.visitSlotTaken" });

    const rows = await ctx.prisma.visitBooking.findMany({ where: { status: "CONFIRMED" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe((mine.body as VisitBookingDTO).id);
  });

  it("le créneau reste RENDU par /visit-slots, marqué taken", async () => {
    const f = await setup();
    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    const slots = await api()
      .get(`/api/v1/venues/${f.venueA.slug}/visit-slots?from=${DIMANCHE}&to=${DIMANCHE}`)
      .expect(200);
    expect(slots.body.slots).toEqual([
      { date: DIMANCHE, startMinutes: SLOT_1, taken: true },
      { date: DIMANCHE, startMinutes: SLOT_2, taken: false }
    ]);
  });

  it("ANNULER libère le créneau : le même horaire se réserve à nouveau", async () => {
    const f = await setup();
    const mine = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    await api()
      .delete(`/api/v1/visit-bookings/${(mine.body as VisitBookingDTO).id}`)
      .set(authH(f.clientToken))
      .expect(204);

    await book(f.client2Token, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
  });
});

describe("POST /venues/:slug/visit-bookings — un rendez-vous à venir par salle (D62)", () => {
  it("second créneau dans la MÊME salle → 409 ; dans une AUTRE salle → 201", async () => {
    const f = await setup();
    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    const refused = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_2 }).expect(409);
    expect(refused.body.message).toEqual({
      code: "VISIT_ALREADY_BOOKED",
      message: "venue.errors.visitAlreadyBooked"
    });

    await book(f.clientToken, f.venueB.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
  });

  it("un rendez-vous déjà PASSÉ ne bloque rien : le client revient", async () => {
    const f = await setup();
    const client = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email } });
    await ctx.prisma.visitBooking.create({
      data: { venueId: f.venueA.id, clientId: client.id, scheduledAt: new Date(Date.now() - 30 * 86_400_000) }
    });

    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
  });
});

describe("POST /venues/:slug/visit-bookings — visibilité, rôles, contact", () => {
  it("salle MASQUÉE ou brouillon → 404 indistinct ; TEMPORAIREMENT INDISPONIBLE → 201", async () => {
    const f = await setup();

    await ctx.prisma.venue.update({ where: { id: f.venueA.id }, data: { status: "HIDDEN" } });
    const hidden = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(404);
    expect(hidden.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });

    await ctx.prisma.venue.update({ where: { id: f.venueA.id }, data: { status: "TEMPORARILY_UNAVAILABLE" } });
    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    await book(f.clientToken, "salle-inexistante", { date: DIMANCHE, startMinutes: SLOT_1 }).expect(404);
  });

  it("le PRO n'est pas un client : 403 ; anonyme : 401", async () => {
    const f = await setup();
    await book(f.proToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(403);
    await api()
      .post(`/api/v1/venues/${f.venueA.slug}/visit-bookings`)
      .send({ date: DIMANCHE, startMinutes: SLOT_1 })
      .expect(401);
  });

  it("téléphone : le corps l'emporte, à défaut le profil, à défaut null (D61)", async () => {
    const f = await setup();

    // ① ni corps ni profil
    const none = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
    expect((none.body as VisitBookingDTO).contactPhone).toBeNull();

    // ② profil renseigné, corps muet → snapshot du profil
    await ctx.prisma.user.update({ where: { email: CLIENT2.email }, data: { phone: "+213550000002" } });
    const fromProfile = await book(f.client2Token, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_2 }).expect(201);
    expect((fromProfile.body as VisitBookingDTO).contactPhone).toBe("+213550000002");

    // ③ corps renseigné → il gagne sur le profil
    const fromBody = await book(f.client2Token, f.venueB.slug, {
      date: DIMANCHE,
      startMinutes: SLOT_1,
      phone: "+213550000003"
    }).expect(201);
    expect((fromBody.body as VisitBookingDTO).contactPhone).toBe("+213550000003");
  });
});

describe("GET /me/visit-bookings", () => {
  it("ne rend que MES rendez-vous, triés par date croissante, annulés INCLUS", async () => {
    const f = await setup();
    const second = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_2 }).expect(201);
    await book(f.clientToken, f.venueB.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
    await book(f.client2Token, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    await api()
      .delete(`/api/v1/visit-bookings/${(second.body as VisitBookingDTO).id}`)
      .set(authH(f.clientToken))
      .expect(204);

    const mine = await api().get("/api/v1/me/visit-bookings").set(authH(f.clientToken)).expect(200);
    const rows = mine.body as VisitBookingDTO[];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.startMinutes)).toEqual([SLOT_1, SLOT_2]);
    expect(rows.map((row) => row.status)).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(rows[1]!.cancelledAt).not.toBeNull();
  });
});

describe("DELETE /visit-bookings/:id (D62)", () => {
  it("le rendez-vous d'un AUTRE client → 404 indistinct, comme un id inconnu ou malformé", async () => {
    const f = await setup();
    const other = await book(f.client2Token, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    const res = await api()
      .delete(`/api/v1/visit-bookings/${(other.body as VisitBookingDTO).id}`)
      .set(authH(f.clientToken))
      .expect(404);
    expect(res.body.message).toEqual({
      code: "VISIT_BOOKING_NOT_FOUND",
      message: "venue.errors.visitBookingNotFound"
    });

    await api().delete("/api/v1/visit-bookings/pas-un-uuid").set(authH(f.clientToken)).expect(404);
  });

  it("annuler DEUX fois rend 204 sans réécrire cancelledAt", async () => {
    const f = await setup();
    const mine = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
    const id = (mine.body as VisitBookingDTO).id;

    await api().delete(`/api/v1/visit-bookings/${id}`).set(authH(f.clientToken)).expect(204);
    const first = await ctx.prisma.visitBooking.findUniqueOrThrow({ where: { id } });

    await api().delete(`/api/v1/visit-bookings/${id}`).set(authH(f.clientToken)).expect(204);
    const second = await ctx.prisma.visitBooking.findUniqueOrThrow({ where: { id } });

    expect(second.cancelledAt?.getTime()).toBe(first.cancelledAt?.getTime());
  });

  it("un rendez-vous déjà PASSÉ ne s'annule plus → 409 VISIT_BOOKING_PAST", async () => {
    const f = await setup();
    const client = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email } });
    const past = await ctx.prisma.visitBooking.create({
      data: { venueId: f.venueA.id, clientId: client.id, scheduledAt: new Date(Date.now() - 3 * 86_400_000) }
    });

    const res = await api().delete(`/api/v1/visit-bookings/${past.id}`).set(authH(f.clientToken)).expect(409);
    expect(res.body.message).toEqual({ code: "VISIT_BOOKING_PAST", message: "venue.errors.visitBookingPast" });
  });
});

describe("Notifications (D60, D63)", () => {
  it("par défaut : 1 e-mail au pro, 1 confirmation au client, 2 lignes Notification", async () => {
    const f = await setup();
    ctx.emails.length = 0;
    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    const rows = await ctx.prisma.notification.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.map((row) => [row.type, row.channel, row.status])).toEqual([
      ["visit.booked", "EMAIL", "SENT"],
      ["visit.confirmed", "EMAIL", "SENT"]
    ]);
    expect(ctx.emails.map((mail) => mail.to)).toEqual([PRO.email, CLIENT.email]);
    // Le message du pro dit QUI, QUAND et COMMENT rappeler.
    expect(ctx.emails[0]!.text).toContain("Amina Bensalem");
    expect(ctx.emails[0]!.text).toContain("09:20");
    expect(ctx.emails[0]!.text).toContain(CLIENT.email); // pas de téléphone → repli e-mail
    expect(ctx.whatsapps).toHaveLength(0);
  });

  it("pro en notifyBySms : un WhatsApp part sur SON numéro, en plus de l'e-mail", async () => {
    const f = await setup();
    await ctx.prisma.proProfile.updateMany({ data: { notifyBySms: true } });
    await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);

    expect(ctx.whatsapps).toHaveLength(1);
    expect(ctx.whatsapps[0]!.to).toBe(PRO.phone);
    const rows = await ctx.prisma.notification.findMany();
    expect(rows.filter((row) => row.channel === "SMS")).toHaveLength(1);
    expect(rows).toHaveLength(3);
  });

  it("l'annulation notifie le pro que le créneau est libéré", async () => {
    const f = await setup();
    const mine = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
    ctx.emails.length = 0;

    await api()
      .delete(`/api/v1/visit-bookings/${(mine.body as VisitBookingDTO).id}`)
      .set(authH(f.clientToken))
      .expect(204);

    const cancelled = await ctx.prisma.notification.findMany({ where: { type: "visit.cancelled" } });
    expect(cancelled).toHaveLength(1);
    expect(ctx.emails[0]!.to).toBe(PRO.email);
  });

  it("transport en PANNE : le rendez-vous est confirmé quand même, la ligne passe FAILED (D63)", async () => {
    const f = await setup();
    ctx.senders.failEmail = true;

    const res = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
    expect((res.body as VisitBookingDTO).status).toBe("CONFIRMED");

    const stored = await ctx.prisma.visitBooking.findUniqueOrThrow({
      where: { id: (res.body as VisitBookingDTO).id }
    });
    expect(stored.status).toBe("CONFIRMED");

    const rows = await ctx.prisma.notification.findMany();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "FAILED")).toBe(true);
    expect(rows[0]!.error).toContain("panne de transport");
  });
});

describe("Repère civil (D48, D51)", () => {
  it("09:20 à Alger est stocké à 08:20 UTC, et relu 09:20 — le décalage n'apparaît nulle part dans le DTO", async () => {
    const f = await setup();
    const res = await book(f.clientToken, f.venueA.slug, { date: DIMANCHE, startMinutes: SLOT_1 }).expect(201);
    const dto = res.body as VisitBookingDTO;

    expect(dto.scheduledAt).toBe("2027-08-15T08:20:00.000Z");
    expect(dto.date).toBe(DIMANCHE);
    expect(dto.startMinutes).toBe(SLOT_1);

    const stored = await ctx.prisma.visitBooking.findUniqueOrThrow({ where: { id: dto.id } });
    expect(stored.scheduledAt.toISOString()).toBe("2027-08-15T08:20:00.000Z");
  });
});
