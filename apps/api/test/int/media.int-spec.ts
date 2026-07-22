// Intégration Lot A0 : le port MEDIA_STORAGE réel (adapter disque, racine
// temporaire) traversé de bout en bout par la route publique GET /media/:key.
// La racine est posée AVANT la création de l'app — l'env est lue au boot.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MEDIA_STORAGE, type MediaStorage } from "../../src/media/media.types";
import { createTestApp, type TestContext } from "./helpers";

const mediaRoot = mkdtempSync(join(tmpdir(), "zwadj-media-int-"));
process.env.MEDIA_DISK_ROOT = mediaRoot;

let ctx: TestContext;
let storage: MediaStorage;

beforeAll(async () => {
  ctx = await createTestApp();
  storage = ctx.app.get<MediaStorage>(MEDIA_STORAGE);
});

afterAll(async () => {
  await ctx.app.close();
  await rm(mediaRoot, { recursive: true, force: true });
});

describe("GET /api/v1/media/:key (Lot A0)", () => {
  it("objet déposé via le PORT : servi 200, bons octets, content-type et cache immutable", async () => {
    const body = Buffer.from("octets-webp-de-preuve");
    await storage.put({ key: "0198cccc-large.webp", body, contentType: "image/webp" });

    const res = await request(ctx.app.getHttpServer()).get("/api/v1/media/0198cccc-large.webp").expect(200);
    expect(Buffer.from(res.body as ArrayBuffer)).toEqual(body);
    expect(res.headers["content-type"]).toContain("image/webp");
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("sans Bearer ET au-delà du throttle par défaut : la route reste servie (publique, non throttlée)", async () => {
    await storage.put({ key: "0198dddd-thumb.webp", body: Buffer.from("x"), contentType: "image/webp" });
    // 105 requêtes anonymes > la limite globale 100/min : toutes doivent passer.
    for (let i = 0; i < 105; i += 1) {
      await request(ctx.app.getHttpServer()).get("/api/v1/media/0198dddd-thumb.webp").expect(200);
    }
  });

  it("clé bien formée mais absente : 404", async () => {
    await request(ctx.app.getHttpServer()).get("/api/v1/media/0198eeee-large.webp").expect(404);
  });

  it("clés hors motif (traversée encodée, séparateur, casse, extension) : 404 indistinct du manquant", async () => {
    for (const path of [
      "/api/v1/media/..%2F..%2F.env.webp",
      "/api/v1/media/a%2Fb.webp",
      "/api/v1/media/UPPER.webp",
      "/api/v1/media/script.txt"
    ]) {
      await request(ctx.app.getHttpServer()).get(path).expect(404);
    }
  });
});
