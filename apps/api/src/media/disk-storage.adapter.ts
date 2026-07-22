// Adapter DISQUE LOCAL du port MEDIA_STORAGE (dev + MVP mono-instance).
// Construit avec une racine ABSOLUE (résolue par le module depuis
// MEDIA_DISK_ROOT). La validation de clé (segment unique) rend toute évasion
// hors racine impossible ; on la ré-affirme ici en défense en profondeur.
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { InvalidMediaKeyError, isValidMediaKey, type MediaObject, type MediaStorage } from "./media.types";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png"
};

function contentTypeFor(key: string): string {
  const extension = key.slice(key.lastIndexOf(".") + 1);
  // La clé est déjà validée : l'extension est forcément connue.
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export class DiskStorageAdapter implements MediaStorage {
  private rootEnsured = false;

  constructor(private readonly root: string) {}

  private assertKey(key: string): void {
    if (!isValidMediaKey(key)) throw new InvalidMediaKeyError(key);
  }

  private async ensureRoot(): Promise<void> {
    if (this.rootEnsured) return;
    await mkdir(this.root, { recursive: true });
    this.rootEnsured = true;
  }

  async put(input: { key: string; body: Buffer; contentType: string }): Promise<{ key: string }> {
    this.assertKey(input.key);
    await this.ensureRoot();
    await writeFile(join(this.root, input.key), input.body);
    return { key: input.key };
  }

  async get(key: string): Promise<MediaObject | null> {
    this.assertKey(key);
    try {
      const body = await readFile(join(this.root, key));
      return { body, contentType: contentTypeFor(key) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    this.assertKey(key);
    try {
      await unlink(join(this.root, key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return; // idempotent
      throw e;
    }
  }

  publicUrl(key: string): string {
    this.assertKey(key);
    return `/api/v1/media/${key}`;
  }
}
