// Intégration Lot A4 — médias des salles sur base PostgreSQL réelle + VRAI
// pipeline sharp + VRAI adapter disque (racine jetable, setup-env). Ce qui ne
// se prouve QU'ICI : le webp ré-encodé servi par GET /media/:key, l'ordre de
// déclaration des routes (« order » AVANT :photoId), et les trois surfaces de
// lecture enrichies.
//
// Lot A6a / D45 : les scènes 360°, leurs liaisons et les trois renforts SQL de
// D34 ont été SUPPRIMÉS avec leurs tables. Ce qui les remplace et se prouve
// ici : PATCH /venues/:id/virtual-tour, l'unicité SQL de matterport_model_id,
// et une NON-RÉGRESSION explicite du volet VenuePhoto après la migration.
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenuePhotoDTO, VenueProDTO, VenuePublicDTO, VenueSummaryDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO_A = {
  role: "PRO",
  email: "pro-a@example.dz",
  password: "Motdepasse1",
  businessName: "Salles A",
  phone: "+213550000001"
};
const PRO_B = {
  role: "PRO",
  email: "pro-b@example.dz",
  password: "Motdepasse1",
  businessName: "Salles B",
  phone: "+213550000002"
};
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };

const api = () => request(ctx.app.getHttpServer());
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function proSession(account: typeof PRO_A): Promise<string> {
  await registerUser(ctx, account);
  await verifyLastRegistered(ctx);
  return loginAs(ctx, account.email, account.password);
}

async function adminSession(): Promise<string> {
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  return loginAs(ctx, ADMIN.email, ADMIN.password);
}

async function seedCity(): Promise<string> {
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  return city.id;
}

async function createVenue(token: string, cityId: string, nameFr = "Salle El Ferdous"): Promise<VenueProDTO> {
  const res = await api()
    .post("/api/v1/venues")
    .set(auth(token))
    .send({ cityId, nameFr, nameAr: "قاعة الفردوس", capacityMax: 450, basePriceCents: 18_000_000 });
  if (res.status !== 201) throw new Error(`création de test a échoué (${res.status}) : ${JSON.stringify(res.body)}`);

  // D46 (B1) — toute salle destinée à être PUBLIÉE doit avoir au moins un
  // créneau actif : la garde de publication le refuse sinon. Une soirée
  // 20h → 02h (1200 → 1560) FRANCHIT MINUIT — cas normal d'un mariage
  // algérien, autorisé par slot_templates_minutes_valid.
  const seededSlot = await api()
    .post(`/api/v1/venues/${(res.body as VenueProDTO).id}/slot-templates`)
    .set(auth(token))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 18_000_000 });
  if (seededSlot.status !== 201) throw new Error(`seed slot: ${seededSlot.status} ${JSON.stringify(seededSlot.body)}`);
  return res.body as VenueProDTO;
}

// ── Images générées en mémoire (vrai pipeline sharp exercé) ──────────────────
const jpeg = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r: 180, g: 120, b: 60 } } })
    .jpeg({ quality: 80 })
    .toBuffer();

let PHOTO_OK: Buffer; // 1200×900 ≥ 800×600
let PHOTO_TOO_SMALL: Buffer; // 400×300
const NOT_AN_IMAGE = Buffer.from("ceci n'est pas une image, c'est du texte");

const uploadPhoto = (token: string, venueId: string, file: Buffer) =>
  api().post(`/api/v1/venues/${venueId}/photos`).set(auth(token)).attach("file", file, "photo.jpg");
const setTour = (token: string, venueId: string, matterportInput: string) =>
  api().patch(`/api/v1/venues/${venueId}/virtual-tour`).set(auth(token)).send({ matterportInput });

/** Clé de stockage depuis l'URL publique relative (/api/v1/media/<clé>). */
const keyOf = (url: string): string => url.slice(url.lastIndexOf("/") + 1);

/** Insertion DIRECTE de lignes photo (bourrage de plafond sans 29 encodages). */
async function stuffPhotos(venueId: string, count: number, offset = 0): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await ctx.prisma.venuePhoto.create({
      data: {
        venueId,
        storageKey: `vp-bourrage-${offset + i}.webp`,
        thumbKey: `vp-bourrage-${offset + i}-thumb.webp`,
        width: 1600,
        height: 1200,
        sortOrder: 1000 + offset + i
      }
    });
  }
}

beforeAll(async () => {
  ctx = await createTestApp();
  [PHOTO_OK, PHOTO_TOO_SMALL] = await Promise.all([jpeg(1200, 900), jpeg(400, 300)]);
}, 120_000);

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await truncateAll(ctx.prisma);
  ctx.emails.length = 0;
});

describe("POST /venues/:id/photos — upload réel", () => {
  it("201 : webp large + thumb servis par GET /media/:key (immutable), dimensions du large persistées, append sortOrder", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());

    const first = await uploadPhoto(token, venue.id, PHOTO_OK).expect(201);
    const photo = first.body as VenuePhotoDTO;
    expect(photo.sortOrder).toBe(0);
    expect(photo.width).toBe(1200); // ≤ 1920 : dimensions source conservées
    expect(photo.height).toBe(900);
    expect(photo.altFr).toBeNull();

    // Les DEUX variantes existent réellement et sortent en webp ré-encodé.
    for (const url of [photo.url, photo.thumbUrl]) {
      const served = await api().get(url).expect(200);
      expect(served.headers["content-type"]).toBe("image/webp");
      expect(served.headers["cache-control"]).toContain("immutable");
    }
    const thumbMeta = await sharp((await api().get(photo.thumbUrl)).body as Buffer).metadata();
    expect(Math.max(thumbMeta.width ?? 0, thumbMeta.height ?? 0)).toBeLessThanOrEqual(480);

    const second = await uploadPhoto(token, venue.id, PHOTO_OK).expect(201);
    expect((second.body as VenuePhotoDTO).sortOrder).toBe(1); // append en fin
  });

  it("400 typés : illisible → MEDIA_UNSUPPORTED_FORMAT, trop petite → MEDIA_TOO_SMALL, sans fichier → MEDIA_FILE_REQUIRED", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());

    const bad = await uploadPhoto(token, venue.id, NOT_AN_IMAGE).expect(400);
    expect(bad.body.message).toEqual({ code: "MEDIA_UNSUPPORTED_FORMAT", message: "media.errors.unsupportedFormat" });

    const small = await uploadPhoto(token, venue.id, PHOTO_TOO_SMALL).expect(400);
    expect(small.body.message).toEqual({ code: "MEDIA_TOO_SMALL", message: "media.errors.tooSmall" });

    const empty = await api().post(`/api/v1/venues/${venue.id}/photos`).set(auth(token)).expect(400);
    expect(empty.body.message).toEqual({ code: "MEDIA_FILE_REQUIRED", message: "media.errors.fileRequired" });

    expect(await ctx.prisma.venuePhoto.count()).toBe(0); // aucun refus n'a écrit de ligne
  });

  it("plafond 30 : le 30ᵉ passe, le 31ᵉ → 400 MEDIA_PHOTO_LIMIT_REACHED", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    await stuffPhotos(venue.id, 29);

    await uploadPhoto(token, venue.id, PHOTO_OK).expect(201); // 30ᵉ
    const over = await uploadPhoto(token, venue.id, PHOTO_OK).expect(400); // 31ᵉ
    expect(over.body.message).toEqual({ code: "MEDIA_PHOTO_LIMIT_REACHED", message: "media.errors.photoLimitReached" });
    expect(await ctx.prisma.venuePhoto.count({ where: { venueId: venue.id } })).toBe(30);
  });

  it("ownership 404 indistinct : la salle d'un autre pro est « introuvable » (jamais un 403)", async () => {
    const tokenA = await proSession(PRO_A);
    const tokenB = await proSession(PRO_B);
    const venueA = await createVenue(tokenA, await seedCity());

    const res = await uploadPhoto(tokenB, venueA.id, PHOTO_OK).expect(404);
    expect(res.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });
  });
});

describe("PATCH photos/order + PATCH photos/:photoId + DELETE", () => {
  it("réordonnancement atomique ; la route statique « order » n'est PAS avalée par :photoId", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    const p1 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const p2 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const p3 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;

    const res = await api()
      .patch(`/api/v1/venues/${venue.id}/photos/order`)
      .set(auth(token))
      .send({ photoIds: [p3.id, p1.id, p2.id] })
      .expect(200);
    expect((res.body as VenuePhotoDTO[]).map((p) => p.id)).toEqual([p3.id, p1.id, p2.id]);

    // Le détail pro reflète l'ordre — et p3 devient la couverture publique.
    const detail = await api().get(`/api/v1/pro/venues/${venue.id}`).set(auth(token)).expect(200);
    expect((detail.body as VenueProDTO).photos.map((p) => p.id)).toEqual([p3.id, p1.id, p2.id]);
  });

  it("ensemble incomplet OU photo d'une autre salle → 400 PHOTO_ORDER_MISMATCH, ordre stocké INTACT", async () => {
    const token = await proSession(PRO_A);
    const cityId = await seedCity();
    const venue = await createVenue(token, cityId);
    const autre = await createVenue(token, cityId, "Autre Salle");
    const p1 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const p2 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const px = (await uploadPhoto(token, autre.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;

    for (const photoIds of [[p1.id], [p2.id, px.id]]) {
      const res = await api().patch(`/api/v1/venues/${venue.id}/photos/order`).set(auth(token)).send({ photoIds });
      expect(res.status).toBe(400);
      expect(res.body.message).toEqual({ code: "PHOTO_ORDER_MISMATCH", message: "venue.errors.photoOrderMismatch" });
    }
    const detail = await api().get(`/api/v1/pro/venues/${venue.id}`).set(auth(token)).expect(200);
    expect((detail.body as VenueProDTO).photos.map((p) => p.id)).toEqual([p1.id, p2.id]);
  });

  it("PATCH alt (null = effacement) ; doublons Zod refusés sur order (orderDuplicate)", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    const p1 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;

    const patched = await api()
      .patch(`/api/v1/venues/${venue.id}/photos/${p1.id}`)
      .set(auth(token))
      .send({ altFr: "Vue de la grande salle", altAr: "منظر القاعة الكبرى" })
      .expect(200);
    expect((patched.body as VenuePhotoDTO).altFr).toBe("Vue de la grande salle");

    const erased = await api()
      .patch(`/api/v1/venues/${venue.id}/photos/${p1.id}`)
      .set(auth(token))
      .send({ altFr: null })
      .expect(200);
    expect((erased.body as VenuePhotoDTO).altFr).toBeNull();
    expect((erased.body as VenuePhotoDTO).altAr).toBe("منظر القاعة الكبرى"); // PATCH partiel réel

    const dup = await api()
      .patch(`/api/v1/venues/${venue.id}/photos/order`)
      .set(auth(token))
      .send({ photoIds: [p1.id, p1.id] })
      .expect(400);
    expect(JSON.stringify(dup.body.message)).toContain("venue.validation.orderDuplicate");
  });

  it("DELETE : 204, la ligne ET les deux objets disparaissent ; re-DELETE → 404 PHOTO_NOT_FOUND", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    const photo = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;

    await api().delete(`/api/v1/venues/${venue.id}/photos/${photo.id}`).set(auth(token)).expect(204);
    await api().get(photo.url).expect(404);
    await api().get(photo.thumbUrl).expect(404);

    const again = await api().delete(`/api/v1/venues/${venue.id}/photos/${photo.id}`).set(auth(token)).expect(404);
    expect(again.body.message).toEqual({ code: "PHOTO_NOT_FOUND", message: "venue.errors.photoNotFound" });
  });
});

describe("PATCH /venues/:id/virtual-tour — D45", () => {
  it("URL de partage ⇒ ID canonique stocké ; chaîne vide ⇒ null ; l'ID brut donne le même résultat", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());

    const set = await setTour(token, venue.id, "https://my.matterport.com/show/?m=SxQL3iGyoDo").expect(200);
    expect(set.body).toEqual({ matterportModelId: "SxQL3iGyoDo" });
    // Ce qui compte : la BASE porte l'ID, pas l'URL brute saisie.
    const stored = await ctx.prisma.venue.findUniqueOrThrow({
      where: { id: venue.id },
      select: { matterportModelId: true }
    });
    expect(stored.matterportModelId).toBe("SxQL3iGyoDo");

    // Désactivation : NULL en base, jamais une chaîne vide.
    await setTour(token, venue.id, "   ").expect(200).expect({ matterportModelId: null });
    expect(
      (await ctx.prisma.venue.findUniqueOrThrow({ where: { id: venue.id }, select: { matterportModelId: true } }))
        .matterportModelId
    ).toBeNull();

    // ID brut : même issue que l'URL.
    await setTour(token, venue.id, "SxQL3iGyoDo").expect(200).expect({ matterportModelId: "SxQL3iGyoDo" });
  });

  it("format invalide → 400 INVALID_MATTERPORT_LINK, la valeur précédente INTACTE", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    await setTour(token, venue.id, "SxQL3iGyoDo").expect(200);

    const bad = await setTour(token, venue.id, "https://exemple.dz/show/?m=SxQL3iGyoDo").expect(400);
    expect(bad.body.message).toMatchObject({ code: "INVALID_MATTERPORT_LINK" });

    expect(
      (await ctx.prisma.venue.findUniqueOrThrow({ where: { id: venue.id }, select: { matterportModelId: true } }))
        .matterportModelId
    ).toBe("SxQL3iGyoDo"); // un refus n'efface rien
  });

  it("unicité EN BASE : le même modèle sur une seconde salle → 409 MATTERPORT_ALREADY_LINKED", async () => {
    const token = await proSession(PRO_A);
    const cityId = await seedCity();
    const a = await createVenue(token, cityId, "Salle Une");
    const b = await createVenue(token, cityId, "Salle Deux");

    await setTour(token, a.id, "SxQL3iGyoDo").expect(200);
    const conflict = await setTour(token, b.id, "https://my.matterport.com/show/?m=SxQL3iGyoDo").expect(409);
    expect(conflict.body.message).toMatchObject({ code: "MATTERPORT_ALREADY_LINKED" });

    // Deux salles SANS scan cohabitent : Postgres autorise plusieurs NULL dans
    // un index unique — sinon la 2ᵉ salle sans visite serait rejetée.
    const c = await createVenue(token, cityId, "Salle Trois");
    expect(c.matterportModelId).toBeNull();
    expect(b.matterportModelId).toBeNull();
  });

  it("ownership 404 indistinct : la salle d'un autre pro est « introuvable », jamais un 400 de format", async () => {
    const tokenA = await proSession(PRO_A);
    const venue = await createVenue(tokenA, await seedCity());
    const tokenB = await proSession(PRO_B);

    // Saisie volontairement INVALIDE : si le parse passait avant l'ownership,
    // la réponse serait 400 et distinguerait « salle existante » de « inexistante ».
    await setTour(tokenB, venue.id, "garbage!!!").expect(404);
    await setTour(tokenB, "pas-un-uuid", "SxQL3iGyoDo").expect(404);
  });

  it("D33 : aucune gate sur `status` — un pro règle la visite d'une salle HIDDEN", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    await api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send({ status: "HIDDEN" }).expect(200);
    await setTour(token, venue.id, "SxQL3iGyoDo").expect(200);
  });

  it("NON-RÉGRESSION après migration : upload, réordonnancement et DELETE de VenuePhoto intacts", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    const p1 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const p2 = (await uploadPhoto(token, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    expect([p1.sortOrder, p2.sortOrder]).toEqual([0, 1]);

    await api()
      .patch(`/api/v1/venues/${venue.id}/photos/order`)
      .set(auth(token))
      .send({ photoIds: [p2.id, p1.id] })
      .expect(200);
    const pro = (await api().get(`/api/v1/pro/venues/${venue.id}`).set(auth(token)).expect(200)).body as VenueProDTO;
    expect(pro.photos.map((p) => p.id)).toEqual([p2.id, p1.id]);

    await api().delete(`/api/v1/venues/${venue.id}/photos/${p1.id}`).set(auth(token)).expect(204);
    await api().get(keyOf(p1.url) ? `/api/v1/media/${keyOf(p1.url)}` : "").expect(404);
  });
});

describe("Les trois surfaces de lecture (A4-②)", () => {
  it("GET /venues : coverThumbUrl = thumb de la 1ʳᵉ photo par sortOrder + photoCount ; GET /venues/:slug : galerie ordonnée + matterportModelId ; détail pro : mêmes données", async () => {
    const proToken = await proSession(PRO_A);
    const venue = await createVenue(proToken, await seedCity());
    const p1 = (await uploadPhoto(proToken, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const p2 = (await uploadPhoto(proToken, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    await setTour(proToken, venue.id, "https://my.matterport.com/show/?m=SxQL3iGyoDo").expect(200);
    // p2 passe en tête : elle devient la couverture (règle A4 verrouillée).
    await api().patch(`/api/v1/venues/${venue.id}/photos/order`).set(auth(proToken)).send({ photoIds: [p2.id, p1.id] }).expect(200);

    const adminToken = await adminSession();
    await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(auth(adminToken)).expect(200);

    // 1. Liste publique.
    const list = await api().get("/api/v1/venues").expect(200);
    const card = (list.body.items as VenueSummaryDTO[])[0];
    expect(card?.photoCount).toBe(2);
    expect(card?.coverThumbUrl).toBe(p2.thumbUrl);
    await api().get(card?.coverThumbUrl ?? "").expect(200);
    // La liste NE porte PAS la visite : le résumé reste lean (Android bas de gamme).
    expect(card).not.toHaveProperty("matterportModelId");

    // 2. Détail public : galerie dans l'ordre + l'ID Matterport, rien de plus.
    const pub = (await api().get(`/api/v1/venues/${venue.slug}`).expect(200)).body as VenuePublicDTO;
    expect(pub.photos.map((p) => p.id)).toEqual([p2.id, p1.id]);
    expect(pub.photos[0]?.width).toBe(1200);
    expect(pub.matterportModelId).toBe("SxQL3iGyoDo");

    // 3. Détail pro : même valeur canonique que le public.
    const pro = (await api().get(`/api/v1/pro/venues/${venue.id}`).set(auth(proToken)).expect(200))
      .body as VenueProDTO;
    expect(pro.matterportModelId).toBe("SxQL3iGyoDo");
    expect(pro.photos.map((p) => p.id)).toEqual([p2.id, p1.id]);
  });

  it("salle sans média : coverThumbUrl null, photoCount 0, photos [], matterportModelId null", async () => {
    const proToken = await proSession(PRO_A);
    const venue = await createVenue(proToken, await seedCity());
    const adminToken = await adminSession();
    await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(auth(adminToken)).expect(200);

    const card = ((await api().get("/api/v1/venues").expect(200)).body.items as VenueSummaryDTO[])[0];
    expect(card?.coverThumbUrl).toBeNull();
    expect(card?.photoCount).toBe(0);

    const pub = (await api().get(`/api/v1/venues/${venue.slug}`).expect(200)).body as VenuePublicDTO;
    expect(pub.photos).toEqual([]);
    expect(pub.matterportModelId).toBeNull();
  });
});

describe("D45 en base : la migration n'a laissé AUCUN résidu, et n'a touché à rien d'autre", () => {
  it("les deux tables 360° et TOUS leurs objets SQL manuels ont disparu", async () => {
    const tables = await ctx.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename IN ('venue_photos_360', 'venue_photo_360_links')`;
    expect(tables).toEqual([]);

    // Les renforts D34 étaient posés en SQL MANUEL : Prisma ne les connaît pas,
    // seul un DROP TABLE correct les emporte. On le prouve nommément plutôt que
    // de faire confiance au SQL généré (leçon A9).
    const residus = await ctx.prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint WHERE conname LIKE '%photo_360%' OR conname LIKE '%photos_360%'`;
    expect(residus).toEqual([]);
    const index = await ctx.prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%360%'`;
    expect(index).toEqual([]);
  });

  it("les contraintes manuelles des AUTRES tables sont intactes (aucun dommage collatéral)", async () => {
    const rows = await ctx.prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conname IN (
        'venues_capacity_valid',
        'venues_cashback_rate_range',
        'venues_commission_rate_range',
        'venues_base_price_positive',
        'bookings_no_overlap_accepted_confirmed'
      )`;
    const noms = rows.map((r) => r.conname).sort();
    expect(noms).toContain("venues_capacity_valid");
    expect(noms).toContain("venues_cashback_rate_range");
    expect(noms).toContain("venues_commission_rate_range");
    expect(noms).toContain("venues_base_price_positive");
    // L'EXCLUDE gist anti-double-réservation : la garantie la plus chère du
    // schéma, et la plus facile à emporter par accident.
    expect(noms).toContain("bookings_no_overlap_accepted_confirmed");
  });

  it("unicité de matterport_model_id garantie PAR LA BASE, pas seulement par le service", async () => {
    const token = await proSession(PRO_A);
    const cityId = await seedCity();
    const a = await createVenue(token, cityId, "Salle Une");
    const b = await createVenue(token, cityId, "Salle Deux");
    await setTour(token, a.id, "SxQL3iGyoDo").expect(200);

    // Écriture DIRECTE, sous l'application : c'est l'index unique qui refuse.
    await expect(
      ctx.prisma.$executeRawUnsafe(
        `UPDATE venues SET matterport_model_id = 'SxQL3iGyoDo' WHERE id = '${b.id}'`
      )
    ).rejects.toThrow();
  });
});
