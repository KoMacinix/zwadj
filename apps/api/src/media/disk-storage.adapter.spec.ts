// Tests de l'adapter disque du port MEDIA_STORAGE (Lot A0) — racine temporaire
// par suite, aucun état partagé entre workers.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DiskStorageAdapter } from "./disk-storage.adapter";
import { InvalidMediaKeyError } from "./media.types";

let root: string;
let adapter: DiskStorageAdapter;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "zwadj-media-unit-"));
  adapter = new DiskStorageAdapter(root);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("DiskStorageAdapter", () => {
  it("put → fichier écrit sous la racine, get → mêmes octets + content-type déduit de l'extension", async () => {
    const body = Buffer.from("webp-bytes");
    await adapter.put({ key: "0198aaaa-large.webp", body, contentType: "image/webp" });

    expect(await readFile(join(root, "0198aaaa-large.webp"))).toEqual(body);
    const object = await adapter.get("0198aaaa-large.webp");
    expect(object?.body).toEqual(body);
    expect(object?.contentType).toBe("image/webp");
  });

  it("publicUrl : chemin RELATIF /api/v1/media/<clé> (les fronts préfixent leur base API)", () => {
    expect(adapter.publicUrl("0198aaaa-thumb.webp")).toBe("/api/v1/media/0198aaaa-thumb.webp");
  });

  it("get d'une clé absente : null (cas nominal), jamais une exception", async () => {
    expect(await adapter.get("0198zzzz-large.webp")).toBeNull();
  });

  it("delete : supprime, puis reste silencieux sur la même clé (idempotent)", async () => {
    await adapter.put({ key: "0198bbbb-large.webp", body: Buffer.from("x"), contentType: "image/webp" });
    await adapter.delete("0198bbbb-large.webp");
    expect(await adapter.get("0198bbbb-large.webp")).toBeNull();
    await expect(adapter.delete("0198bbbb-large.webp")).resolves.toBeUndefined();
  });

  it("clés hors motif (traversée, séparateur, casse, extension inconnue) : rejet SUR TOUTES les opérations", async () => {
    for (const key of ["../evil.webp", "a/b.webp", "UPPER.webp", "note.txt", ".webp", "a..webp"]) {
      await expect(adapter.put({ key, body: Buffer.from("x"), contentType: "image/webp" })).rejects.toBeInstanceOf(
        InvalidMediaKeyError
      );
      await expect(adapter.get(key)).rejects.toBeInstanceOf(InvalidMediaKeyError);
      await expect(adapter.delete(key)).rejects.toBeInstanceOf(InvalidMediaKeyError);
      expect(() => adapter.publicUrl(key)).toThrow(InvalidMediaKeyError);
    }
  });
});
