// D306 — SONDE ADVERSE de 23a (rang 23). JETABLE, versée en pièce ; elle n'entre dans AUCUNE suite.
// La session adverse ne corrige rien : cette sonde MESURE le comportement de `HEAD` (b715943) sur des
// cas que la suite de 23a ne joue pas. Chaque verdict passe par `expect` de vitest.
//
// COMMENT (depuis `apps/api`, base de développement lancée, configuration d'intégration RÉELLE — `zwadj_test`
// est RECRÉÉE VIDE par le `globalSetup`) :
//     node node_modules/vitest/vitest.mjs run -c vitest.config.int.ts --dir <racine>/docs/preuves/D306/sondes adverse-23a
//
// ⛔ PostgreSQL fait l'ordonnanceur (patron de `payment-intent-race` et de 23a) : un rival `pg` BRUT écrit et ne
// commite pas ; la requête HTTP réelle part ; on PROUVE qu'elle attend CE rival (`pg_blocking_pids`) ; puis on
// commite. Une course qui n'a pas eu lieu LÈVE. Prédicats et cibles IMPORTÉS de `booking-transitions.ts`.
// ⛔ Chemin de sortie de chaque connexion brute en `finally` : une fuite se voit dans le test SUIVANT.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BookingStatus, type BookingDTO, type VenueProDTO } from "@zwadj/types";
import {
  createTestApp,
  loginAs,
  registerUser,
  truncateAll,
  verifyLastRegistered,
  type TestContext
} from "../../../../../../apps/api/test/int/helpers";
import {
  BOOKING_TRANSITIONS,
  BookingCommand,
  allowedFrom,
  decideBookingTransition,
  targetOf,
  writableFrom
} from "../../../../../../apps/api/src/venues/booking-transitions";
import { PAYMENT_WINDOW_HOURS } from "../../../../../../apps/api/src/venues/bookings.service";

interface Pg {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  end(): Promise<void>;
}
interface Res {
  status: number;
  body: { message?: { code?: string; message?: string; status?: string } } & Record<string, unknown>;
}
const requireApi = createRequire(join(process.cwd(), "package.json"));
const { Client } = requireApi("pg") as { Client: new (o: { connectionString: string }) => Pg };
const request = requireApi("supertest") as (app: unknown) => {
  post(u: string): Req;
  delete(u: string): Req;
  get(u: string): Req;
  patch(u: string): Req;
};
interface Req extends PromiseLike<Res> {
  set(h: Record<string, string>): Req;
  send(b: unknown): Req;
}

const SORTIE = join(process.cwd(), "..", "..", "docs", "preuves", "D306", "sondes", "sorties");
const journal: string[] = [];
const noter = (l: string): void => {
  journal.push(l);
  console.log(l);
};

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer());
const authH = (t: string) => ({ Authorization: `Bearer ${t}` });
const EVENT_DATE = "2027-08-15";
const SLOT_PRICE = 20_000_000;
const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Amina", lastName: "Bensalem" };
const CAC = BookingCommand.CANCEL_AS_CLIENT;

interface Fixture {
  proToken: string;
  clientToken: string;
  venue: VenueProDTO;
  slotId: string;
}

async function setup(): Promise<Fixture> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const proToken = await loginAs(ctx, PRO.email, PRO.password);
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const created = await api()
    .post("/api/v1/venues")
    .set(authH(proToken))
    .send({ cityId: city.id, nameFr: "Salle El Ryad", nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" });
  if (created.status !== 201) throw new Error(`venue ${created.status}`);
  const venue = created.body as unknown as VenueProDTO;
  const slot = await api()
    .post(`/api/v1/venues/${venue.id}/slot-templates`)
    .set(authH(proToken))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: SLOT_PRICE });
  if (slot.status !== 201) throw new Error(`slot ${slot.status}`);
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  const adminToken = await loginAs(ctx, ADMIN.email, ADMIN.password);
  const pub = await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(adminToken)).send({});
  if (pub.status !== 200) throw new Error(`publish ${pub.status}`);
  await registerUser(ctx, CLIENT);
  await verifyLastRegistered(ctx);
  const clientToken = await loginAs(ctx, CLIENT.email, CLIENT.password);
  return { proToken, clientToken, venue, slotId: (slot.body as unknown as { id: string }).id };
}

async function demande(f: Fixture): Promise<BookingDTO> {
  const r = await api()
    .post(`/api/v1/venues/${f.venue.slug}/bookings`)
    .set(authH(f.clientToken))
    .send({
      eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 250, paymentMethod: "ONLINE",
      contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: "+213550000001",
      contactEmail: "amina@example.dz", expectedTotalCents: SLOT_PRICE, expectedDepositCents: SLOT_PRICE * 0.3
    });
  if (r.status !== 201) throw new Error(`demande ${r.status} ${JSON.stringify(r.body)}`);
  return r.body as unknown as BookingDTO;
}

const accepter = (f: Fixture, id: string) => api().post(`/api/v1/pro/bookings/${id}/accept`).set(authH(f.proToken)).send({});
const refuser = (f: Fixture, id: string) => api().post(`/api/v1/pro/bookings/${id}/decline`).set(authH(f.proToken)).send({});
const annulerPro = (f: Fixture, id: string) =>
  api().post(`/api/v1/pro/bookings/${id}/cancel`).set(authH(f.proToken)).send({ reason: "Dégât des eaux" });
const annulerClient = (f: Fixture, id: string, corps: Record<string, unknown>) =>
  api().delete(`/api/v1/bookings/${id}`).set(authH(f.clientToken)).send(corps);

async function connecter(): Promise<Pg> {
  const c = new Client({ connectionString: process.env.DATABASE_URL ?? "" });
  await c.connect();
  return c;
}

async function pidDe(c: Pg): Promise<number> {
  return Number((await c.query("SELECT pg_backend_pid() AS pid")).rows[0]?.pid);
}

async function quelquUnAttend(pid: number): Promise<boolean> {
  const r = await ctx.prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE ${pid}::int = ANY(pg_blocking_pids(pid))`;
  return Number(r[0]?.n ?? 0) > 0;
}

async function attendreQueQuelquUnAttende(pid: number): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    if (await quelquUnAttend(pid)) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("LA COURSE N'A PAS EU LIEU : personne n'attend le rival. Mesure invalide.");
}

// Les rivaux : les prédicats sont ceux de `transition` et d'`acceptUnderVenueLock`, cibles et statuts importés.
const SQL_REFUS = `UPDATE bookings SET status = $2::"BookingStatus", declined_at = now(), decline_reason = NULL, updated_at = now()
  WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`;
const SQL_ACCEPT = `UPDATE bookings SET status = $2::"BookingStatus", accepted_at = now(),
  payment_due_at = now() + make_interval(hours => $4::int), updated_at = now()
  WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`;
const paramsRefus = (id: string) => [id, targetOf(BookingCommand.DECLINE), [...allowedFrom(BookingCommand.DECLINE)]];
const paramsAccept = (id: string) => [id, targetOf(BookingCommand.ACCEPT), [...allowedFrom(BookingCommand.ACCEPT)], PAYMENT_WINDOW_HOURS];

/** Rival non commité ; lance la requête ; prouve l'attente ; commite ; rend la réponse. */
async function course(etapes: [string, unknown[]][], requete: () => PromiseLike<Res>): Promise<Res> {
  const c = await connecter();
  let fini = false;
  try {
    await c.query("BEGIN");
    const pid = await pidDe(c);
    let lignes = 0;
    for (const [sql, p] of etapes) {
      const r = await c.query(sql, p);
      if (/^\s*UPDATE/i.test(sql)) lignes += r.rowCount ?? 0;
    }
    if (lignes !== 1) throw new Error(`RIVAL : ${lignes} ligne(s) écrite(s), 1 attendue — course sans objet.`);
    const enVol = Promise.resolve(requete());
    try {
      await attendreQueQuelquUnAttende(pid);
    } catch (e) {
      await enVol.then(() => undefined, () => undefined);
      throw e;
    }
    await c.query("COMMIT");
    fini = true;
    return await enVol;
  } finally {
    if (!fini) await c.query("ROLLBACK").catch(() => undefined);
    await c.end();
  }
}

async function ligne(id: string) {
  return ctx.prisma.booking.findUniqueOrThrow({
    where: { id },
    select: { status: true, acceptedAt: true, declinedAt: true, cancelledAt: true, cancellationReason: true }
  });
}

const vers = (r: Res) => `${r.status} ${JSON.stringify(r.body?.message ?? r.body)}`;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
  mkdirSync(SORTIE, { recursive: true });
  // L'étiquette distingue la passe à `HEAD` des passes sous mutation (neutraliser.py la pose).
  writeFileSync(join(SORTIE, `journal-sonde-${process.env.D306_ETIQUETTE ?? "HEAD"}.txt`), journal.join("\n") + "\n", "utf-8");
});

beforeEach(async () => {
  await truncateAll(ctx.prisma);
  ctx.emails.length = 0;
  ctx.whatsapps.length = 0;
});

describe("D306 — sonde adverse de 23a", () => {
  // ── MD-F5-3 / MD-F5-4 : annulation client face à un REFUS ────────────────────────────────────
  it("P1 — séquentiel : refus, PUIS annulation client SANS motif — 409 statusConflict avec DECLINED (statut avant motif)", async () => {
    const f = await setup();
    const a = await demande(f);
    expect((await refuser(f, a.id)).status).toBe(201);
    const res = await annulerClient(f, a.id, {});
    noter(`P1 réponse : ${vers(res)}`);
    expect(res.status).toBe(409);
    expect(res.body.message?.message).toBe("booking.errors.statusConflict");
    expect(res.body.message?.status).toBe(targetOf(BookingCommand.DECLINE));
    expect((await ligne(a.id)).status).toBe(targetOf(BookingCommand.DECLINE));
  });

  it("P1b — séquentiel : refus, PUIS annulation client AVEC motif — 409 avec DECLINED", async () => {
    const f = await setup();
    const a = await demande(f);
    expect((await refuser(f, a.id)).status).toBe(201);
    const res = await annulerClient(f, a.id, { reason: "Changement de plan" });
    noter(`P1b réponse : ${vers(res)}`);
    expect(res.status).toBe(409);
    expect(res.body.message?.status).toBe(targetOf(BookingCommand.DECLINE));
  });

  it("P2 — concurrent : un REFUS commite pendant l'annulation client SANS motif — 409 avec DECLINED, pas 400", async () => {
    const f = await setup();
    const a = await demande(f);
    const res = await course([[SQL_REFUS, paramsRefus(a.id)]], () => annulerClient(f, a.id, {}));
    noter(`P2 réponse : ${vers(res)}`);
    expect(res.status).toBe(409);
    expect(res.body.message?.message).toBe("booking.errors.statusConflict");
    expect(res.body.message?.status).toBe(targetOf(BookingCommand.DECLINE));
    const l = await ligne(a.id);
    noter(`P2 ligne : ${JSON.stringify(l)}`);
    expect(l.status).toBe(targetOf(BookingCommand.DECLINE));
    expect(l.cancelledAt).toBeNull();
  });

  it("P3 — concurrent : un REFUS commite pendant l'annulation client AVEC motif — 409 avec DECLINED", async () => {
    const f = await setup();
    const a = await demande(f);
    const res = await course([[SQL_REFUS, paramsRefus(a.id)]], () => annulerClient(f, a.id, { reason: "Changement de plan" }));
    noter(`P3 réponse : ${vers(res)}`);
    expect(res.status).toBe(409);
    expect(res.body.message?.status).toBe(targetOf(BookingCommand.DECLINE));
    expect((await ligne(a.id)).cancelledAt).toBeNull();
  });

  // ── MD-F5-2 : AVEC motif, l'annulation d'une demande devenue ACCEPTED reste admise ──────────
  it("P4 — concurrent : une ACCEPTATION commite pendant l'annulation client AVEC motif — 200, annulée avec son motif", async () => {
    const f = await setup();
    const a = await demande(f);
    const res = await course(
      [
        [`SELECT id FROM venues WHERE id = $1::uuid FOR UPDATE`, [f.venue.id]],
        [SQL_ACCEPT, paramsAccept(a.id)]
      ],
      () => annulerClient(f, a.id, { reason: "Changement de date de mariage" })
    );
    noter(`P4 réponse : ${vers(res)}`);
    expect(res.status).toBe(200);
    const l = await ligne(a.id);
    noter(`P4 ligne : ${JSON.stringify(l)}`);
    expect(l.status).toBe(targetOf(CAC));
    expect(l.cancellationReason).toBe("Changement de date de mariage");
  });

  // ── F1 dans l'autre sens, et « le perdant publie-t-il ? » ───────────────────────────────────
  it("P5 — concurrent : une ACCEPTATION commite pendant le REFUS — 409 avec ACCEPTED, aucun e-mail ni notification de refus", async () => {
    const f = await setup();
    const a = await demande(f);
    ctx.emails.length = 0;
    const res = await course(
      [
        [`SELECT id FROM venues WHERE id = $1::uuid FOR UPDATE`, [f.venue.id]],
        [SQL_ACCEPT, paramsAccept(a.id)]
      ],
      () => refuser(f, a.id)
    );
    noter(`P5 réponse : ${vers(res)}`);
    expect(res.status).toBe(409);
    expect(res.body.message?.status).toBe(targetOf(BookingCommand.ACCEPT));
    const l = await ligne(a.id);
    expect(l.status).toBe(targetOf(BookingCommand.ACCEPT));
    expect(l.declinedAt).toBeNull();
    const notifs = await ctx.prisma.notification.findMany({ where: { type: "booking.declined" } });
    noter(`P5 e-mails au client : ${ctx.emails.filter((m) => m.to === CLIENT.email).length} · notifications booking.declined : ${notifs.length}`);
    expect(ctx.emails.filter((m) => m.to === CLIENT.email)).toHaveLength(0);
    expect(notifs).toHaveLength(0);
  });

  it("P5b — le PERDANT d'accept (contre un refus) n'écrit AUCUNE notification booking.accepted", async () => {
    const f = await setup();
    const a = await demande(f);
    ctx.emails.length = 0;
    const res = await course([[SQL_REFUS, paramsRefus(a.id)]], () => accepter(f, a.id));
    noter(`P5b réponse : ${vers(res)}`);
    expect(res.status).toBe(409);
    const notifs = await ctx.prisma.notification.findMany({ where: { type: "booking.accepted" } });
    noter(`P5b notifications booking.accepted : ${notifs.length} · e-mails : ${ctx.emails.length} · whatsapps : ${ctx.whatsapps.length}`);
    expect(notifs).toHaveLength(0);
    expect(ctx.emails).toHaveLength(0);
    expect(ctx.whatsapps).toHaveLength(0);
  });

  // ── MD-F1-6 : l'interblocage, FORCÉ par un rival qui prend la LIGNE puis la SALLE ────────────
  // Aucun chemin du code ne prend cet ordre (relevé au source, section D306). La sonde le force pour mesurer
  // ce que la phrase du cadrage affirme : « Un 40P01 sortirait en 500 ».
  for (const [nom, delaiMs] of [["P6a — rival qui demande la salle AUSSITÔT", 0], ["P6b — rival qui demande la salle après 1 500 ms", 1500]] as const) {
    it(`${nom} : ordre inverse forcé, qui PostgreSQL désigne-t-il, et que rend accept ?`, async () => {
      const f = await setup();
      const a = await demande(f);
      const c = await connecter();
      try {
        await c.query("BEGIN");
        const pid = await pidDe(c);
        const r = await c.query(SQL_REFUS, paramsRefus(a.id));
        expect(r.rowCount).toBe(1);
        const dt = await c.query("SHOW deadlock_timeout");
        const enVol = Promise.resolve(accepter(f, a.id));
        await attendreQueQuelquUnAttende(pid);
        if (delaiMs > 0) await new Promise((x) => setTimeout(x, delaiMs));
        const t0 = Date.now();
        let rival = "salle obtenue";
        try {
          await c.query(`SELECT id FROM venues WHERE id = $1::uuid FOR UPDATE`, [f.venue.id]);
        } catch (e) {
          rival = `ERREUR ${(e as { code?: string }).code ?? "?"}`;
        }
        const tRival = Date.now() - t0;
        const res = await enVol;
        noter(`${nom} : deadlock_timeout=${String(dt.rows[0]?.deadlock_timeout)} · rival=${rival} (${tRival} ms) · accept=${vers(res)}`);
        await c.query("ROLLBACK").catch(() => undefined);
        const l = await ligne(a.id);
        noter(`${nom} : ligne finale ${l.status}`);
        // Exactement une des deux transactions est la victime.
        const victimeAccept = res.status >= 500;
        const victimeRival = rival.includes("40P01");
        expect(Number(victimeAccept) + Number(victimeRival)).toBe(1);
        if (victimeAccept) expect(res.status).toBe(500);
      } finally {
        await c.query("ROLLBACK").catch(() => undefined);
        await c.end();
      }
    });
  }

  // ── La relecture après un compte 0 peut voir un état qui a ENCORE changé ─────────────────────
  // P10a : le compte 0 vient APRÈS une ATTENTE (le cas de F5). P10b : le compte 0 vient SANS attente (la ligne était déjà
  // ACCEPTED, commitée). Dans les deux cas, une annulation PRO part ensuite avec `lock_timeout` 2 s : on MESURE si la
  // requête à 0 garde un verrou sur la ligne (⇒ 55P03), et ce que sa relecture lit.
  for (const [nom, attente] of [["P10a — compte 0 APRÈS attente", true], ["P10b — compte 0 SANS attente", false]] as const) {
    it(`${nom} : la relecture peut-elle voir un état qui a ENCORE changé, et quel code en sort ?`, async () => {
      const f = await setup();
      const a = await demande(f);
      const r1 = await connecter();
      const req = await connecter();
      const r2 = await connecter();
      const PRED_CAC = `UPDATE bookings SET status = $2::"BookingStatus", cancelled_at = now(), updated_at = now()
          WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`;
      try {
        let compte: number | null;
        if (attente) {
          await r1.query("BEGIN");
          const pid1 = await pidDe(r1);
          expect((await r1.query(SQL_ACCEPT, paramsAccept(a.id))).rowCount).toBe(1);
          await req.query("BEGIN");
          const enAttente = req.query(PRED_CAC, [a.id, targetOf(CAC), [...writableFrom(CAC, undefined)]]);
          await attendreQueQuelquUnAttende(pid1);
          await r1.query("COMMIT");
          compte = (await enAttente).rowCount;
        } else {
          expect((await r1.query(SQL_ACCEPT, paramsAccept(a.id))).rowCount).toBe(1); // autocommit
          await req.query("BEGIN");
          compte = (await req.query(PRED_CAC, [a.id, targetOf(CAC), [...writableFrom(CAC, undefined)]])).rowCount;
        }
        await r2.query("BEGIN");
        await r2.query("SET LOCAL lock_timeout = '2000ms'");
        let annulPro = "";
        try {
          const r = await r2.query(
            `UPDATE bookings SET status = $2::"BookingStatus", cancelled_at = now(), cancellation_reason = 'Dégât', updated_at = now()
              WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`,
            [a.id, targetOf(BookingCommand.CANCEL_AS_PRO), [...allowedFrom(BookingCommand.CANCEL_AS_PRO)]]
          );
          await r2.query("COMMIT");
          annulPro = `commitée (${r.rowCount} ligne)`;
        } catch (e) {
          annulPro = `ERREUR ${(e as { code?: string }).code ?? "?"}`;
          await r2.query("ROLLBACK").catch(() => undefined);
        }
        const relu = String((await req.query(`SELECT status FROM bookings WHERE id = $1::uuid`, [a.id])).rows[0]?.status);
        await req.query("ROLLBACK");
        const d = decideBookingTransition(CAC, relu, undefined).outcome;
        const code = d === "REASON_REQUIRED" ? 400 : d === "STATUS_CONFLICT" ? 409 : "ALLOWED";
        noter(`${nom} : compte=${compte} · annulation pro pendant que la requête est ouverte : ${annulPro} · relu=${relu} · décision=${d} ⇒ ${code}`);
        expect(compte).toBe(0);
        // Cohérence : si l'annulation pro a commité, la relecture DOIT la voir (READ COMMITTED) et rendre 409 ;
        // si elle a été bloquée (55P03), la relecture lit ACCEPTED et rend 400.
        if (annulPro.startsWith("commitée")) {
          expect(relu).toBe(targetOf(BookingCommand.CANCEL_AS_PRO));
          expect(code).toBe(409);
        } else {
          expect(annulPro).toBe("ERREUR 55P03");
          expect(relu).toBe(targetOf(BookingCommand.ACCEPT));
          expect(code).toBe(400);
        }
      } finally {
        for (const c of [r1, req, r2]) {
          await c.query("ROLLBACK").catch(() => undefined);
          await c.end().catch(() => undefined);
        }
      }
    });
  }

  it("P11 — séquentiel, même état que P10 : accept, annulation PRO, PUIS annulation client SANS motif — 409 CANCELLED, pas 400", async () => {
    const f = await setup();
    const a = await demande(f);
    expect((await accepter(f, a.id)).status).toBe(201);
    expect((await annulerPro(f, a.id)).status).toBe(201);
    const res = await annulerClient(f, a.id, {});
    noter(`P11 réponse : ${vers(res)}`);
    expect(res.status).toBe(409);
    expect(res.body.message?.message).toBe("booking.errors.statusConflict");
    expect(res.body.message?.status).toBe(targetOf(CAC));
  });

  // ── writableFrom et decideBookingTransition, sur TOUS les couples ───────────────────────────
  it("P9 — writableFrom(c, r) contient s ⇔ decideBookingTransition(c, s, r) = ALLOWED, pour toute commande, tout statut, tout motif", () => {
    const statuts = Object.values(BookingStatus);
    const commandes = Object.values(BookingCommand);
    const motifs: (string | undefined)[] = [undefined, "", " ", "motif", null as unknown as string];
    let couples = 0;
    const ecarts: string[] = [];
    for (const c of commandes)
      for (const r of motifs)
        for (const s of statuts) {
          couples += 1;
          const w = writableFrom(c, r).includes(s);
          const d = decideBookingTransition(c, s, r).outcome === "ALLOWED";
          if (w !== d) ecarts.push(`${c}/${JSON.stringify(r)}/${s} : writableFrom=${w} décision=${d}`);
        }
    noter(`P9 : ${couples} couples examinés (${commandes.length} commandes × ${motifs.length} motifs × ${statuts.length} statuts) · écarts ${ecarts.length} (attendu 0)`);
    expect(couples).toBe(commandes.length * motifs.length * statuts.length);
    expect(ecarts).toEqual([]);
  });

  it("P9b — après un compte 0, un statut INSCRIPTIBLE est-il ATTEIGNABLE par le tableau ? (ALLOWED après 0 ⇒ 409 là où l'ordre séquentiel rend 200)", () => {
    const statuts = Object.values(BookingStatus) as string[];
    const aretes = Object.values(BOOKING_TRANSITIONS).flatMap((t) => t.from.map((de) => [de as string, t.to as string]));
    const atteignables = (s: string): Set<string> => {
      const vus = new Set<string>([s]);
      let front = [s];
      while (front.length) {
        const suivant: string[] = [];
        for (const x of front) for (const [de, vers2] of aretes) if (de === x && !vus.has(vers2)) (vus.add(vers2), suivant.push(vers2));
        front = suivant;
      }
      return vus;
    };
    const lignes: string[] = [];
    const trous: string[] = [];
    for (const r of [undefined, "motif"]) {
      const w = new Set<string>(writableFrom(CAC, r));
      for (const s of statuts.filter((x) => !w.has(x))) {
        const att = [...atteignables(s)];
        const inscriptibles = att.filter((x) => w.has(x));
        const codes = att.map((x) => {
          const d = decideBookingTransition(CAC, x, r).outcome;
          return `${x}→${d === "REASON_REQUIRED" ? 400 : d === "STATUS_CONFLICT" ? 409 : "ALLOWED"}`;
        });
        lignes.push(`motif=${JSON.stringify(r)} · écrit refusé depuis ${s} · relecture possible ${codes.join(", ")}`);
        if (inscriptibles.length) trous.push(`${JSON.stringify(r)}/${s} → ${inscriptibles.join(",")}`);
      }
    }
    noter(`P9b : ${aretes.length} arêtes du tableau : ${aretes.map(([x, y]) => `${x}→${y}`).join(" ")}`);
    for (const l of lignes) noter(`P9b ${l}`);
    noter(`P9b : cas examinés ${lignes.length} · statut inscriptible atteignable ${trous.length} (attendu 0)`);
    expect(lignes.length).toBeGreaterThan(0);
    expect(trous).toEqual([]);
  });
});
