// Intégration Lot A4 — médias des salles sur base PostgreSQL réelle + VRAI
// pipeline sharp + VRAI adapter disque (racine jetable, setup-env). Ce qui ne
// se prouve QU'ICI : le webp ré-encodé servi par GET /media/:key, les renforts
// SQL D34 (FK composites, CHECK, index LEAST/GREATEST), la cascade des
// liaisons à la suppression d'une scène, l'ordre de déclaration des routes
// (« order » AVANT :photoId), et les trois surfaces de lecture enrichies.
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
  return res.body as VenueProDTO;
}

// ── Images générées en mémoire (vrai pipeline sharp exercé) ──────────────────
const jpeg = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r: 180, g: 120, b: 60 } } })
    .jpeg({ quality: 80 })
    .toBuffer();

let PHOTO_OK: Buffer; // 1200×900 ≥ 800×600
let PHOTO_TOO_SMALL: Buffer; // 400×300
let SCENE_OK: Buffer; // 4096×2048 = 2:1 exact
let SCENE_BAD_RATIO: Buffer; // ≈1,46:1, hors ±2 %
const NOT_AN_IMAGE = Buffer.from("ceci n'est pas une image, c'est du texte");

const uploadPhoto = (token: string, venueId: string, file: Buffer) =>
  api().post(`/api/v1/venues/${venueId}/photos`).set(auth(token)).attach("file", file, "photo.jpg");
const uploadScene = (token: string, venueId: string, file: Buffer) =>
  api().post(`/api/v1/venues/${venueId}/photos-360`).set(auth(token)).attach("file", file, "scene.jpg");

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
  [PHOTO_OK, PHOTO_TOO_SMALL, SCENE_OK, SCENE_BAD_RATIO] = await Promise.all([
    jpeg(1200, 900),
    jpeg(400, 300),
    jpeg(4096, 2048),
    jpeg(3000, 2048)
  ]);
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

describe("Scènes 360° + liaisons (D34)", () => {
  it("upload scène 2:1 → 201 ; ratio faux → 400 MEDIA_BAD_ASPECT_RATIO ; plafond 12 → 400", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());

    await uploadScene(token, venue.id, SCENE_OK).expect(201);
    const bad = await uploadScene(token, venue.id, SCENE_BAD_RATIO).expect(400);
    expect(bad.body.message).toEqual({ code: "MEDIA_BAD_ASPECT_RATIO", message: "media.errors.badAspectRatio" });

    for (let i = 0; i < 11; i += 1) {
      await ctx.prisma.venuePhoto360.create({
        data: { venueId: venue.id, storageKey: `vs-bourrage-${i}.webp`, thumbKey: `vs-bourrage-${i}-thumb.webp` }
      });
    }
    const over = await uploadScene(token, venue.id, SCENE_OK).expect(400); // 13ᵉ
    expect(over.body.message).toEqual({ code: "MEDIA_SCENE_LIMIT_REACHED", message: "media.errors.sceneLimitReached" });
  });

  it("liaison : A=B → 400 Zod ; paire inversée → 409 LINK_ALREADY_EXISTS ; scène d'une AUTRE salle → 404 SCENE_NOT_FOUND", async () => {
    const token = await proSession(PRO_A);
    const cityId = await seedCity();
    const venue = await createVenue(token, cityId);
    const autre = await createVenue(token, cityId, "Autre Salle");
    const s1 = (await uploadScene(token, venue.id, SCENE_OK).expect(201)).body as { id: string };
    const s2 = (await uploadScene(token, venue.id, SCENE_OK).expect(201)).body as { id: string };
    const sx = (await uploadScene(token, autre.id, SCENE_OK).expect(201)).body as { id: string };
    const coords = { yawA: 10, pitchA: -5, yawB: -170, pitchB: 3 };

    const same = await api()
      .post(`/api/v1/venues/${venue.id}/photo-360-links`)
      .set(auth(token))
      .send({ photoAId: s1.id, photoBId: s1.id, ...coords })
      .expect(400);
    expect(JSON.stringify(same.body.message)).toContain("venue.validation.linkSamePhoto");

    await api()
      .post(`/api/v1/venues/${venue.id}/photo-360-links`)
      .set(auth(token))
      .send({ photoAId: s1.id, photoBId: s2.id, ...coords })
      .expect(201);
    const reversed = await api()
      .post(`/api/v1/venues/${venue.id}/photo-360-links`)
      .set(auth(token))
      .send({ photoAId: s2.id, photoBId: s1.id, ...coords })
      .expect(409); // index LEAST/GREATEST : la paire inversée EST la même liaison
    expect(reversed.body.message).toEqual({ code: "LINK_ALREADY_EXISTS", message: "venue.errors.linkAlreadyExists" });

    const foreign = await api()
      .post(`/api/v1/venues/${venue.id}/photo-360-links`)
      .set(auth(token))
      .send({ photoAId: s1.id, photoBId: sx.id, ...coords })
      .expect(404);
    expect(foreign.body.message).toEqual({ code: "SCENE_NOT_FOUND", message: "venue.errors.sceneNotFound" });
  });

  it("DELETE scène : ses liaisons tombent en CASCADE et ses objets disparaissent ; DELETE liaison seule → 204 puis 404", async () => {
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, await seedCity());
    const s1 = (await uploadScene(token, venue.id, SCENE_OK).expect(201)).body as { id: string; url: string; thumbUrl: string };
    const s2 = (await uploadScene(token, venue.id, SCENE_OK).expect(201)).body as { id: string };
    const link = (
      await api()
        .post(`/api/v1/venues/${venue.id}/photo-360-links`)
        .set(auth(token))
        .send({ photoAId: s1.id, photoBId: s2.id, yawA: 0, pitchA: 0, yawB: 0, pitchB: 0 })
        .expect(201)
    ).body as { id: string };

    await api().delete(`/api/v1/venues/${venue.id}/photos-360/${s1.id}`).set(auth(token)).expect(204);
    expect(await ctx.prisma.venuePhoto360Link.count()).toBe(0); // cascade FK
    await api().get(s1.url).expect(404);
    await api().get(s1.thumbUrl).expect(404);

    const gone = await api().delete(`/api/v1/venues/${venue.id}/photo-360-links/${link.id}`).set(auth(token)).expect(404);
    expect(gone.body.message).toEqual({ code: "LINK_NOT_FOUND", message: "venue.errors.linkNotFound" });
  });
});

describe("Les trois surfaces de lecture (A4-②)", () => {
  it("GET /venues : coverThumbUrl = thumb de la 1ʳᵉ photo par sortOrder + photoCount ; GET /venues/:slug : galerie ordonnée + viewer360 ; détail pro : scènes AVEC vignettes", async () => {
    const proToken = await proSession(PRO_A);
    const venue = await createVenue(proToken, await seedCity());
    const p1 = (await uploadPhoto(proToken, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const p2 = (await uploadPhoto(proToken, venue.id, PHOTO_OK).expect(201)).body as VenuePhotoDTO;
    const s1 = (await uploadScene(proToken, venue.id, SCENE_OK).expect(201)).body as { id: string; url: string };
    const s2 = (await uploadScene(proToken, venue.id, SCENE_OK).expect(201)).body as { id: string };
    await api()
      .post(`/api/v1/venues/${venue.id}/photo-360-links`)
      .set(auth(proToken))
      .send({ photoAId: s1.id, photoBId: s2.id, yawA: 15, pitchA: -2, yawB: -160, pitchB: 4 })
      .expect(201);
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

    // 2. Détail public : galerie dans l'ordre + tour lean (pas de thumbUrl de scène).
    const pub = (await api().get(`/api/v1/venues/${venue.slug}`).expect(200)).body as VenuePublicDTO;
    expect(pub.photos.map((p) => p.id)).toEqual([p2.id, p1.id]);
    expect(pub.photos[0]?.width).toBe(1200);
    expect(pub.viewer360?.initialSceneId).toBe(s1.id); // 1ʳᵉ scène créée ouvre le tour
    expect(pub.viewer360?.scenes.map((s) => s.id)).toEqual([s1.id, s2.id]);
    expect(pub.viewer360?.scenes[0]).toEqual({ id: s1.id, url: s1.url }); // lean 1:1 Pannellum
    expect(pub.viewer360?.links).toEqual([
      { photoAId: s1.id, photoBId: s2.id, yawA: 15, pitchA: -2, yawB: -160, pitchB: 4 }
    ]);

    // 3. Détail pro : mêmes données + vignettes de scènes (A6b) + liens avec id.
    const pro = (await api().get(`/api/v1/pro/venues/${venue.id}`).set(auth(proToken)).expect(200))
      .body as VenueProDTO;
    expect(pro.photos360.map((s) => s.id)).toEqual([s1.id, s2.id]);
    expect(pro.photos360[0]?.thumbUrl).toMatch(/vs-.*-thumb\.webp$/);
    expect(pro.links360[0]?.id).toBeDefined();
    expect(pro.viewer360?.initialSceneId).toBe(s1.id);
  });

  it("tiebreak D34 prouvé en base : createdAt forcés ÉGAUX → initialSceneId = min(id) (uuidv7 ≈ plus ancienne)", async () => {
    const proToken = await proSession(PRO_A);
    const venue = await createVenue(proToken, await seedCity());
    const s1 = (await uploadScene(proToken, venue.id, SCENE_OK).expect(201)).body as { id: string };
    const s2 = (await uploadScene(proToken, venue.id, SCENE_OK).expect(201)).body as { id: string };
    const sameInstant = new Date("2026-07-22T10:00:00.000Z");
    await ctx.prisma.venuePhoto360.updateMany({ where: { venueId: venue.id }, data: { createdAt: sameInstant } });

    const adminToken = await adminSession();
    await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(auth(adminToken)).expect(200);

    const pub = (await api().get(`/api/v1/venues/${venue.slug}`).expect(200)).body as VenuePublicDTO;
    const expected = [s1.id, s2.id].sort()[0];
    expect(pub.viewer360?.initialSceneId).toBe(expected);
  });

  it("salle sans média : coverThumbUrl null, photoCount 0, photos [], viewer360 null — jamais un tour vide", async () => {
    const proToken = await proSession(PRO_A);
    const venue = await createVenue(proToken, await seedCity());
    const adminToken = await adminSession();
    await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(auth(adminToken)).expect(200);

    const card = ((await api().get("/api/v1/venues").expect(200)).body.items as VenueSummaryDTO[])[0];
    expect(card?.coverThumbUrl).toBeNull();
    expect(card?.photoCount).toBe(0);

    const pub = (await api().get(`/api/v1/venues/${venue.slug}`).expect(200)).body as VenuePublicDTO;
    expect(pub.photos).toEqual([]);
    expect(pub.viewer360).toBeNull();
  });
});

describe("Renforts SQL D34 (prouvés au niveau Postgres, sous l'application)", () => {
  it("FK composite : un INSERT direct de liaison inter-salles est refusé PAR LA BASE", async () => {
    const proToken = await proSession(PRO_A);
    const cityId = await seedCity();
    const venue = await createVenue(proToken, cityId);
    const autre = await createVenue(proToken, cityId, "Autre Salle");
    const s1 = (await uploadScene(proToken, venue.id, SCENE_OK).expect(201)).body as { id: string };
    const sx = (await uploadScene(proToken, autre.id, SCENE_OK).expect(201)).body as { id: string };

    await expect(
      ctx.prisma.$executeRawUnsafe(
        `INSERT INTO venue_photo_360_links (venue_id, photo_a_id, photo_b_id, yaw_a, pitch_a, yaw_b, pitch_b)
         VALUES ('${venue.id}', '${s1.id}', '${sx.id}', 0, 0, 0, 0)`
      )
    ).rejects.toThrow(); // FK composite (photo_b_id, venue_id) viole
  });

  it("CHECK bornes : un yaw de 500° est refusé PAR LA BASE (filet sous Zod)", async () => {
    const proToken = await proSession(PRO_A);
    const venue = await createVenue(proToken, await seedCity());
    const s1 = (await uploadScene(proToken, venue.id, SCENE_OK).expect(201)).body as { id: string };
    const s2 = (await uploadScene(proToken, venue.id, SCENE_OK).expect(201)).body as { id: string };

    await expect(
      ctx.prisma.$executeRawUnsafe(
        `INSERT INTO venue_photo_360_links (venue_id, photo_a_id, photo_b_id, yaw_a, pitch_a, yaw_b, pitch_b)
         VALUES ('${venue.id}', '${s1.id}', '${s2.id}', 500, 0, 0, 0)`
      )
    ).rejects.toThrow();
  });
});
