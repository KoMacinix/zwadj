// Le SERVICE de la fiche client — la TRADUCTION des résultats du port en réponses HTTP, et l'ordre des décisions. Rang 41 (D336, L35-4 amendé).
// ⚠ Ce n'est pas le filet : `test/int/pro-clients.int-spec.ts`, contre PostgreSQL, prouve la concurrence, l'unicité et l'égalité stricte de M-4.
// ⚠ Double typé par `satisfies` (jamais `as unknown as`) : un port qui change fait tomber le typecheck ici.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProClientsService } from "./pro-clients.service";
import type { FicheRow, ProClientStore } from "./pro-client-store.types";

const USER_ID = "018f0000-0000-7000-8000-00000000aaaa";
const PP_ID = "018f0000-0000-7000-8000-00000000bbbb";
const FICHE_ID = "018f0000-0000-7000-8000-00000000cccc";
const CONTACT_DU_PRO = { proProfileId: PP_ID, phone: "+213550000009", phone2: "+213770000009", email: "pro@example.dz" };

const ligne = (over: Partial<FicheRow> = {}): FicheRow => ({
  id: FICHE_ID,
  proProfileId: PP_ID,
  phone: "+213555123456",
  email: null,
  nameAr: null,
  nameLatin: "Amina Bensalem",
  linkedUserId: null,
  linkedAt: null,
  createdAt: new Date("2026-10-22T10:00:00.000Z"),
  updatedAt: new Date("2026-10-22T10:00:00.000Z"),
  ...over
});

function build() {
  const store = {
    contactDuPro: vi.fn(async (_userId: string) => CONTACT_DU_PRO as typeof CONTACT_DU_PRO | null),
    rechercher: vi.fn(async (_userId: string, _critere: { phone: string } | { email: string }) => null as FicheRow | null),
    creerSiAbsente: vi.fn(
      async (_proProfileId: string, _donnees: { phone: string | null; email: string | null; nameAr: string | null; nameLatin: string | null }) =>
        ({ cree: true, fiche: ligne() }) as Awaited<ReturnType<ProClientStore["creerSiAbsente"]>>
    ),
    completerNoms: vi.fn(
      async (_userId: string, _id: string, _noms: { nameAr?: string; nameLatin?: string }) =>
        ({ ok: true, fiche: ligne() }) as Awaited<ReturnType<ProClientStore["completerNoms"]>>
    ),
    modifier: vi.fn(
      async (_userId: string, _id: string, _champs: { phone?: string; email?: string; nameAr?: string; nameLatin?: string }) =>
        ({ ok: true, fiche: ligne() }) as Awaited<ReturnType<ProClientStore["modifier"]>>
    )
  } satisfies ProClientStore;
  return { service: new ProClientsService(store), store };
}

const code = (e: unknown) => (e as { getResponse: () => { code?: string } }).getResponse().code;

/** Le REFUS, lu en assertions NATIVES (D304, D316) : `rejects.toSatisfy` échoue par une `Error`, que la lecture fermée des harnais ne compte pas comme une
 *  morsure. La promesse doit être REJETÉE (sinon `expect.unreachable`, une `AssertionError`) ; la classe et le code du refus se jugent ensuite par `toBe`. */
async function refus(promesse: Promise<unknown>): Promise<unknown> {
  try {
    await promesse;
  } catch (e) {
    return e;
  }
  return expect.unreachable("la promesse devait être REFUSÉE");
}
function estRefus(e: unknown, classe: abstract new (...args: never[]) => unknown, attendu: string): void {
  expect(e instanceof classe, `classe du refus : ${String(e)}`).toBe(true);
  expect(code(e)).toBe(attendu);
}

describe("K-1 — la recherche : la fiche du pro, ou `{ found: false }` — et RIEN d'autre n'est lu", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("⛔ M-4 — sans fiche : EXACTEMENT `{ found: false }`, quel que soit l'identifiant", async () => {
    for (const critere of [{ phone: "+213555123456" }, { email: "amina@example.dz" }]) {
      const r = await ctx.service.lookup(USER_ID, critere);
      expect(r).toEqual({ found: false });
      expect(Object.keys(r)).toEqual(["found"]);
    }
  });

  it("⛔ M-4 — la recherche n'appelle QUE `rechercher` : jamais le contact du pro (qui lit `users`), jamais une écriture", async () => {
    await ctx.service.lookup(USER_ID, { phone: "+213555123456" });
    expect(ctx.store.rechercher).toHaveBeenCalledWith(USER_ID, { phone: "+213555123456" });
    expect(ctx.store.contactDuPro).not.toHaveBeenCalled();
    expect(ctx.store.creerSiAbsente).not.toHaveBeenCalled();
  });

  it("une fiche trouvée : `{ found: true, record }` ; la fiche expose `linked` (un booléen), JAMAIS l'identifiant du compte ni le profil (S-53)", async () => {
    ctx.store.rechercher.mockResolvedValue(ligne({ linkedUserId: "018f0000-0000-7000-8000-0000000000ff", linkedAt: new Date() }));
    const r = await ctx.service.lookup(USER_ID, { phone: "+213555123456" });
    expect(r.found).toBe(true);
    if (!r.found) throw new Error("la fiche trouvée n'est pas rendue");
    const record = r.record as unknown as Record<string, unknown>;
    expect(Object.keys(record).sort()).toEqual(["createdAt", "email", "id", "linked", "nameAr", "nameLatin", "phone", "updatedAt"]);
    expect(record.linked).toBe(true);
    expect(JSON.stringify(r)).not.toContain("018f0000-0000-7000-8000-0000000000ff");
    expect(JSON.stringify(r)).not.toContain(PP_ID);
  });
});

describe("K-2 — créer ou RENDRE ; le contact du pro refusé AVANT toute écriture", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("⛔ MD-4 — le numéro, le second numéro ou l'e-mail du pro : 400 CLIENT_IS_PRO_CONTACT, et le port n'écrit RIEN", async () => {
    for (const contact of [{ phone: "+213550000009" }, { phone: "+213770000009" }, { email: "pro@example.dz" }]) {
      estRefus(await refus(ctx.service.create(USER_ID, { ...contact, nameLatin: "Amina" })), BadRequestException, "CLIENT_IS_PRO_CONTACT");
    }
    expect(ctx.store.creerSiAbsente).not.toHaveBeenCalled();
  });

  it("une fiche créée : `{ created: true, record }`, et le port reçoit le PROFIL du pro, les valeurs telles que le contrat les a rendues", async () => {
    const r = await ctx.service.create(USER_ID, { phone: "+213555123456", nameLatin: "Amina Bensalem" });
    expect(r.created).toBe(true);
    expect(r.record.id).toBe(FICHE_ID);
    expect(ctx.store.creerSiAbsente).toHaveBeenCalledWith(PP_ID, { phone: "+213555123456", email: null, nameAr: null, nameLatin: "Amina Bensalem" });
  });

  it("rien n'a été inséré, la fiche du numéro existe : `{ created: false, record }` — la fiche EXISTANTE, telle quelle", async () => {
    const existante = ligne({ nameLatin: "Premier Nom" });
    ctx.store.creerSiAbsente.mockResolvedValue({ cree: false, parTelephone: existante, parEmail: null });
    const r = await ctx.service.create(USER_ID, { phone: "+213555123456", nameLatin: "Autre Nom" });
    expect(r).toEqual({ created: false, record: expect.objectContaining({ id: FICHE_ID, nameLatin: "Premier Nom" }) });
  });

  it("⛔ MD-2 — le numéro et l'e-mail sur DEUX fiches : 409 CLIENT_RECORD_IDENTIFIERS_CONFLICT", async () => {
    ctx.store.creerSiAbsente.mockResolvedValue({ cree: false, parTelephone: ligne({ id: "a" }), parEmail: ligne({ id: "b" }) });
    estRefus(await refus(ctx.service.create(USER_ID, { phone: "+213555123456", email: "karim@example.dz", nameLatin: "X" })), ConflictException, "CLIENT_RECORD_IDENTIFIERS_CONFLICT");
  });

  it("rien inséré ET rien relu (une modification simultanée a déplacé l'identifiant) : 409 plutôt qu'une fiche inventée", async () => {
    ctx.store.creerSiAbsente.mockResolvedValue({ cree: false, parTelephone: null, parEmail: null });
    estRefus(await refus(ctx.service.create(USER_ID, { phone: "+213555123456", nameLatin: "X" })), ConflictException, "CLIENT_RECORD_IDENTIFIERS_CONFLICT");
  });
});

describe("K-3 — compléter un nom : le refus du port devient le BON code", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("un identifiant hors motif UUID : 404 SANS toucher le port", async () => {
    estRefus(await refus(ctx.service.completeNames(USER_ID, "pas-un-uuid", { nameAr: "آمنة" })), NotFoundException, "CLIENT_RECORD_NOT_FOUND");
    expect(ctx.store.completerNoms).not.toHaveBeenCalled();
  });

  it("refus, fiche introuvable (absente, ou d'un autre pro) : 404 CLIENT_RECORD_NOT_FOUND", async () => {
    ctx.store.completerNoms.mockResolvedValue({ ok: false, actuelle: null });
    estRefus(await refus(ctx.service.completeNames(USER_ID, FICHE_ID, { nameAr: "آمنة" })), NotFoundException, "CLIENT_RECORD_NOT_FOUND");
  });

  it("⛔ MD-6 — refus, fiche LIÉE : 409 CLIENT_RECORD_LINKED", async () => {
    ctx.store.completerNoms.mockResolvedValue({ ok: false, actuelle: ligne({ linkedUserId: "u1", linkedAt: new Date() }) });
    estRefus(await refus(ctx.service.completeNames(USER_ID, FICHE_ID, { nameAr: "آمنة" })), ConflictException, "CLIENT_RECORD_LINKED");
  });

  it("⛔ MD-7 — refus, le nom est déjà là : 409 CLIENT_RECORD_NAME_ALREADY_SET", async () => {
    ctx.store.completerNoms.mockResolvedValue({ ok: false, actuelle: ligne({ nameAr: "آمنة" }) });
    estRefus(await refus(ctx.service.completeNames(USER_ID, FICHE_ID, { nameAr: "أمينة" })), ConflictException, "CLIENT_RECORD_NAME_ALREADY_SET");
  });
});

describe("K-3b — modifier une fiche : contact du pro, unicité, fiche liée", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("⛔ MD-4 — le contact du pro : 400 CLIENT_IS_PRO_CONTACT, et le port n'écrit RIEN", async () => {
    estRefus(await refus(ctx.service.update(USER_ID, FICHE_ID, { phone: "+213770000009" })), BadRequestException, "CLIENT_IS_PRO_CONTACT");
    expect(ctx.store.modifier).not.toHaveBeenCalled();
  });

  it("⛔ MD-2 — l'unicité refusée par la base : 409 CLIENT_RECORD_IDENTIFIERS_CONFLICT", async () => {
    ctx.store.modifier.mockResolvedValue({ ok: false, raison: "unicite" });
    estRefus(await refus(ctx.service.update(USER_ID, FICHE_ID, { phone: "+213661234567" })), ConflictException, "CLIENT_RECORD_IDENTIFIERS_CONFLICT");
  });

  it("⛔ MD-6 — la fiche LIÉE : 409 CLIENT_RECORD_LINKED ; introuvable : 404", async () => {
    ctx.store.modifier.mockResolvedValue({ ok: false, raison: "absenteOuLiee", actuelle: ligne({ linkedUserId: "u1", linkedAt: new Date() }) });
    estRefus(await refus(ctx.service.update(USER_ID, FICHE_ID, { nameLatin: "X" })), ConflictException, "CLIENT_RECORD_LINKED");
    ctx.store.modifier.mockResolvedValue({ ok: false, raison: "absenteOuLiee", actuelle: null });
    estRefus(await refus(ctx.service.update(USER_ID, FICHE_ID, { nameLatin: "X" })), NotFoundException, "CLIENT_RECORD_NOT_FOUND");
  });

  it("la fiche modifiée est rendue en DTO", async () => {
    ctx.store.modifier.mockResolvedValue({ ok: true, fiche: ligne({ nameLatin: "Nouveau Nom" }) });
    const r = await ctx.service.update(USER_ID, FICHE_ID, { nameLatin: "Nouveau Nom" });
    expect(r.nameLatin).toBe("Nouveau Nom");
    expect(r.linked).toBe(false);
  });
});

// ── ⛔ MD-10 (M-4) — GARDE DE SOURCE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Les tests ci-dessus prouvent que `lookup` n'appelle pas `contactDuPro` ; ils ne voient pas l'ADAPTATEUR, que le double remplace. Celui-ci pourrait
// sélectionner la relation du compte dans sa recherche, ou joindre la table `users` en SQL brut, et aucun double ne le dirait. La garde lit donc la SOURCE :
// le corps de `rechercher`, la sélection qu'il rend (`FICHE_SELECT`) et le corps de `lookup` — commentaires RETIRÉS, puisqu'ils nomment justement ce qui
// est interdit. L'intégration (`test/int/pro-clients.int-spec.ts`) mesure l'égalité stricte des réponses ; cette garde, la cause qui la tiendrait.
describe("⛔ MD-10 (M-4) — GARDE DE SOURCE : le chemin de la recherche ne nomme ni le compte, ni la table `users`, ni la relation `linkedUser`", () => {
  const sansCommentaires = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  /** Le texte entre deux repères, repères EXIGÉS : un repère introuvable fait échouer la garde au lieu de la laisser verte sur une chaîne vide (D290). */
  function entre(code: string, debut: string, fin: string): string {
    const i = code.indexOf(debut);
    expect(i, `repère « ${debut} »`).toBeGreaterThanOrEqual(0);
    const j = code.indexOf(fin, i + debut.length);
    expect(j, `repère « ${fin} »`).toBeGreaterThan(i);
    return code.slice(i, j);
  }
  /** Ce que le chemin de la recherche ne nomme jamais : le compte (modèle, table, relation), le contact du pro (qui lit le compte), et le SQL brut. */
  const INTERDIT = /\busers?\b|\bUser\b|\blinkedUser\b|\bcontactDuPro\b|\$queryRaw|\$executeRaw/;
  const lire = (fichier: string) => sansCommentaires(readFileSync(join(__dirname, fichier), "utf8"));

  it("l'adaptateur : `rechercher` lit `proClientRecord` SEUL — la propriété par `proProfile`, sans relation au compte, sans SQL brut", () => {
    const recherche = entre(lire("pro-client-store.prisma.ts"), "async rechercher(", "async creerSiAbsente(");
    expect(INTERDIT.exec(recherche)?.[0] ?? null).toBeNull();
    expect(recherche.match(/this\.prisma\.\w+/g)).toEqual(["this.prisma.proClientRecord"]);
    expect(recherche).toContain("select: FICHE_SELECT");
  });

  it("la sélection que la recherche rend (`FICHE_SELECT`) : des colonnes de la fiche, aucune relation", () => {
    const selection = entre(lire("pro-client-store.types.ts"), "export const FICHE_SELECT = {", "} satisfies Prisma.ProClientRecordSelect;");
    expect(INTERDIT.exec(selection)?.[0] ?? null).toBeNull();
    // Chaque entrée est `colonne: true` : une relation s'écrirait `relation: { select: … }`.
    const entrees = selection
      .replace("export const FICHE_SELECT = {", "")
      .split(",")
      .map((entree) => entree.trim())
      .filter((entree) => entree !== "");
    expect(entrees.length).toBeGreaterThan(0);
    for (const entree of entrees) expect(entree, entree).toMatch(/^\w+: true$/);
  });

  it("le service : `lookup` ne touche le port que par `rechercher`", () => {
    const recherche = entre(lire("pro-clients.service.ts"), "async lookup(", "async create(");
    expect(recherche.match(/this\.fiches\.\w+/g)).toEqual(["this.fiches.rechercher"]);
  });
});
