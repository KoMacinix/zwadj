// Intégration de la FICHE CLIENT d'un pro — rang 41 (D336, L35-4 amendé). Méthode : NORMALE, avec la garde d'égalité stricte de M-4.
//
// Ce qui ne se prouve QU'ICI, contre PostgreSQL et les vraies routes (modes de défaillance : `docs/preuves/D336/modes-de-defaillance.md`) :
//   - MD-10 (M-4) — la recherche (K-1) rend la MÊME réponse, octet pour octet, pour un identifiant porté par un compte Zwadj et pour un identifiant inconnu ;
//   - MD-11 — la fiche d'un AUTRE pro n'est ni trouvée, ni modifiable (404 indistinct) ;
//   - MD-1 — dix créations SIMULTANÉES du même numéro : UNE ligne, dix réponses du même identifiant (`INSERT … ON CONFLICT DO NOTHING`, puis relecture) ;
//   - MD-2 — le numéro et l'e-mail sur deux fiches différentes : refus typé, RIEN n'est fusionné ;
//   - MD-3 — l'e-mail se normalise par UNE fonction (rogné, NFKC, minuscules) : une autre casse retrouve la même fiche ;
//   - MD-4 — le numéro du pro, son second numéro et son e-mail de compte sont refusés comme contact d'un client ;
//   - MD-5 — un numéro fixe, étranger ou écrit TOUT en chiffres arabo-indiens est refusé par le contrat partagé ;
//   - MD-6, MD-7 — une fiche LIÉE n'est pas modifiable ; un nom présent n'est jamais remplacé (K-3) ;
//   - MD-14 — la base refuse un numéro non canonique, et l'expression de son `CHECK` accepte et refuse exactement ce que `DZ_MOBILE_E164` accepte et refuse.
//
// ⚠ Les verdicts s'écrivent par `expect` de vitest (D305) : `.expect(<statut>)` de supertest lève une `Error`, pas une `AssertionError`.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DZ_MOBILE_E164 } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;
const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const AUTRE_PRO = { role: "PRO", email: "autre-pro@example.dz", password: "Motdepasse1", businessName: "Autre Salle", phone: "+213550000008" };
/** Un CLIENT qui a un COMPTE Zwadj : son numéro et son e-mail existent dans `users` — jamais dans une fiche du pro. */
const CLIENT = { role: "CLIENT", email: "yasmine@example.dz", password: "Motdepasse1", firstName: "Yasmine", lastName: "Belkacem", phone: "+213661234567", locale: "fr" };
const api = () => request(ctx.app.getHttpServer());
const authH = (t: string) => ({ Authorization: `Bearer ${t}` });

/** Le corps d'une fiche telle que la route la rend (S-53 : `linked` est un booléen, jamais un identifiant de compte). */
interface Fiche {
  id: string;
  phone: string | null;
  email: string | null;
  nameAr: string | null;
  nameLatin: string | null;
  linked: boolean;
  createdAt: string;
  updatedAt: string;
}

const rechercher = (token: string, corps: Record<string, unknown>) => api().post("/api/v1/pro/clients/lookup").set(authH(token)).send(corps);
const creer = (token: string, corps: Record<string, unknown>) => api().post("/api/v1/pro/clients").set(authH(token)).send(corps);
const completer = (token: string, id: string, corps: Record<string, unknown>) => api().patch(`/api/v1/pro/clients/${id}/names`).set(authH(token)).send(corps);
const modifier = (token: string, id: string, corps: Record<string, unknown>) => api().patch(`/api/v1/pro/clients/${id}`).set(authH(token)).send(corps);

async function connecter(compte: Record<string, unknown> & { email: string; password: string }): Promise<string> {
  await registerUser(ctx, compte);
  await verifyLastRegistered(ctx);
  return loginAs(ctx, compte.email, compte.password);
}

/** Crée une fiche et rend son corps — échoue par une ASSERTION si la route ne la crée pas. */
async function fiche(token: string, corps: Record<string, unknown>): Promise<Fiche> {
  const res = await creer(token, corps);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  expect(res.body.created).toBe(true);
  return res.body.record as Fiche;
}

/** La ligne en base, lue en SQL (aucun modèle Prisma n'est supposé ici : la table est l'autorité, D186). */
async function ligne(id: string) {
  const rows = await ctx.prisma.$queryRaw<
    { phone: string | null; email: string | null; name_ar: string | null; name_latin: string | null; linked_user_id: string | null }[]
  >`SELECT phone, email, name_ar, name_latin, linked_user_id::text FROM pro_client_records WHERE id = ${id}::uuid`;
  return rows[0] ?? null;
}
const nombreDeFiches = async () => Number((await ctx.prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pro_client_records`)[0]?.n ?? -1);

/** Lie une fiche à un compte — ce que la FUSION (L35-6) fera ; aucun code de ce lot ne l'écrit, seul le test le pose. */
async function lier(ficheId: string, email: string): Promise<string> {
  const compte = await ctx.prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  await ctx.prisma.$executeRaw`UPDATE pro_client_records SET linked_user_id = ${compte.id}::uuid, linked_at = now() WHERE id = ${ficheId}::uuid`;
  return compte.id;
}

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("K-1 — la recherche ne regarde QUE les fiches du pro, et sa réponse ne dit RIEN d'un compte (M-4)", () => {
  it("une fiche absente : 200 et `{ found: false }`, sans aucune autre clé", async () => {
    const token = await connecter(PRO);
    const res = await rechercher(token, { phone: "0555123456" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ found: false });
    expect(Object.keys(res.body)).toEqual(["found"]);
  });

  it("⛔ MD-10 — ÉGALITÉ STRICTE : le numéro d'un COMPTE Zwadj et un numéro inconnu rendent la même réponse (statut, type, corps à l'octet)", async () => {
    const token = await connecter(PRO);
    await registerUser(ctx, CLIENT);
    const compte = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email }, select: { phone: true } });
    expect(compte.phone, "le numéro du compte doit exister en base, sinon le test ne compare rien").toBe(CLIENT.phone);

    const connu = await rechercher(token, { phone: CLIENT.phone });
    const inconnu = await rechercher(token, { phone: "+213771112233" });
    expect(connu.status).toBe(200);
    expect({ statut: connu.status, type: connu.headers["content-type"], corps: connu.text }).toEqual({
      statut: inconnu.status,
      type: inconnu.headers["content-type"],
      corps: inconnu.text
    });
  });

  it("⛔ MD-10 — ÉGALITÉ STRICTE pour l'e-mail : celui d'un COMPTE et un inconnu rendent la même réponse", async () => {
    const token = await connecter(PRO);
    await registerUser(ctx, CLIENT);
    const connu = await rechercher(token, { email: CLIENT.email });
    const inconnu = await rechercher(token, { email: "personne@example.dz" });
    expect(connu.status).toBe(200);
    expect({ statut: connu.status, type: connu.headers["content-type"], corps: connu.text }).toEqual({
      statut: inconnu.status,
      type: inconnu.headers["content-type"],
      corps: inconnu.text
    });
  });

  it("⛔ MD-11 — la fiche d'un AUTRE pro n'est pas trouvée : la réponse est celle d'un numéro inconnu", async () => {
    const tokenA = await connecter(PRO);
    const tokenB = await connecter(AUTRE_PRO);
    await fiche(tokenB, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    const chezA = await rechercher(tokenA, { phone: "0555123456" });
    const inconnu = await rechercher(tokenA, { phone: "+213771112233" });
    expect(chezA.status).toBe(200);
    expect(chezA.text).toBe(inconnu.text);
  });

  it("une fiche du pro est trouvée par son numéro (sous toute forme normalisable) et par son e-mail (sous toute casse)", async () => {
    const token = await connecter(PRO);
    const creee = await fiche(token, { phone: "0555 12 34 56", email: "Amina@Mail.DZ", nameLatin: "Amina Bensalem" });
    for (const corps of [{ phone: "+213555123456" }, { phone: "0555123456" }, { email: "amina@mail.dz" }, { email: "  AMINA@MAIL.DZ " }]) {
      const res = await rechercher(token, corps);
      expect(res.status, JSON.stringify(corps)).toBe(200);
      expect(res.body.found, JSON.stringify(corps)).toBe(true);
      expect((res.body.record as Fiche).id, JSON.stringify(corps)).toBe(creee.id);
    }
  });

  it("EXACTEMENT un identifiant : les deux, aucun, ou une clé inconnue sont refusés (400)", async () => {
    const token = await connecter(PRO);
    for (const corps of [{ phone: "0555123456", email: "a@example.dz" }, {}, { name: "Amina" }, { phone: "0555123456", extra: 1 }]) {
      expect((await rechercher(token, corps)).status, JSON.stringify(corps)).toBe(400);
    }
  });

  it("⛔ MD-5 — un numéro fixe, étranger, ou écrit TOUT en chiffres arabo-indiens est refusé (400), à la recherche comme à la création", async () => {
    const token = await connecter(PRO);
    for (const phone of ["+21321234567", "021234567", "+33612345678", "٠٥٥٥١٢٣٤٥٦"]) {
      expect((await rechercher(token, { phone })).status, phone).toBe(400);
      expect((await creer(token, { phone, nameLatin: "Amina Bensalem" })).status, phone).toBe(400);
    }
    expect(await nombreDeFiches()).toBe(0);
  });

  it("une fiche LIÉE se trouve, `linked` vaut vrai — et RIEN du compte n'apparaît dans la réponse (S-53, consigne v3 § 2 d)", async () => {
    const token = await connecter(PRO);
    await registerUser(ctx, CLIENT);
    const creee = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    const compteId = await lier(creee.id, CLIENT.email);
    const res = await rechercher(token, { phone: "0555123456" });
    expect(res.status).toBe(200);
    expect(res.body.record.linked).toBe(true);
    for (const trace of [compteId, CLIENT.email, CLIENT.firstName, CLIENT.lastName, CLIENT.phone]) {
      expect(res.text.includes(trace), `la réponse porte « ${trace} », une donnée du COMPTE`).toBe(false);
    }
    expect(Object.keys(res.body.record as object).sort()).toEqual(["createdAt", "email", "id", "linked", "nameAr", "nameLatin", "phone", "updatedAt"]);
  });
});

describe("K-2 — crée ou REND la fiche, idempotent sur (pro, numéro) et sur (pro, e-mail)", () => {
  it("crée la fiche : le numéro sous sa forme CANONIQUE, l'e-mail normalisé, les noms rognés, non liée", async () => {
    const token = await connecter(PRO);
    const res = await creer(token, { phone: "0555 12 34 56", email: "  Amina@Mail.DZ ", nameAr: " آمنة بن سالم ", nameLatin: " Amina Bensalem " });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(true);
    const f = res.body.record as Fiche;
    expect({ phone: f.phone, email: f.email, nameAr: f.nameAr, nameLatin: f.nameLatin, linked: f.linked }).toEqual({
      phone: "+213555123456",
      email: "amina@mail.dz",
      nameAr: "آمنة بن سالم",
      nameLatin: "Amina Bensalem",
      linked: false
    });
    expect(await ligne(f.id)).toEqual({ phone: "+213555123456", email: "amina@mail.dz", name_ar: "آمنة بن سالم", name_latin: "Amina Bensalem", linked_user_id: null });
  });

  it("une fiche par e-mail SEUL et une fiche par numéro SEUL sont admises (au moins l'un des deux)", async () => {
    const token = await connecter(PRO);
    const parEmail = await fiche(token, { email: "amina@example.dz", nameLatin: "Amina Bensalem" });
    const parNumero = await fiche(token, { phone: "0661234567", nameAr: "يوسف" });
    expect(parEmail.phone).toBeNull();
    expect(parNumero.email).toBeNull();
    // Deux fiches SANS numéro coexistent : l'unicité (pro, numéro) est PARTIELLE (`WHERE phone IS NOT NULL`).
    await fiche(token, { email: "autre@example.dz", nameLatin: "Karim Haddad" });
    expect(await nombreDeFiches()).toBe(3);
  });

  it("refuse une fiche sans identifiant, ou sans aucun nom (400) — et n'écrit rien", async () => {
    const token = await connecter(PRO);
    expect((await creer(token, { nameLatin: "Amina Bensalem" })).status).toBe(400);
    expect((await creer(token, { phone: "0555123456" })).status).toBe(400);
    expect((await creer(token, { phone: "0555123456", nameLatin: "Amina123" })).status).toBe(400);
    expect((await creer(token, { phone: "0555123456", nameLatin: "Amina", clientId: "x" })).status).toBe(400);
    expect(await nombreDeFiches()).toBe(0);
  });

  it("⚠ IDEMPOTENT : la même fiche est RENDUE, et une fiche rendue n'est PAS modifiée (ni nom, ni e-mail)", async () => {
    const token = await connecter(PRO);
    const premiere = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    const res = await creer(token, { phone: "+213555123456", email: "amina@example.dz", nameLatin: "Autre Nom" });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
    expect((res.body.record as Fiche).id).toBe(premiere.id);
    expect(await ligne(premiere.id)).toEqual({ phone: "+213555123456", email: null, name_ar: null, name_latin: "Amina Bensalem", linked_user_id: null });
    expect(await nombreDeFiches()).toBe(1);
  });

  it("⛔ MD-1 — DIX créations SIMULTANÉES du même numéro : UNE ligne, dix réponses qui portent le MÊME identifiant, une seule « créée »", async () => {
    const token = await connecter(PRO);
    const reponses = await Promise.all(Array.from({ length: 10 }, (_, i) => creer(token, { phone: "0555123456", nameLatin: `Amina Bensalem ${"x".repeat(i)}`.trim() })));
    expect(reponses.map((r) => r.status)).toEqual(Array.from({ length: 10 }, () => 200));
    expect(new Set(reponses.map((r) => (r.body.record as Fiche).id)).size).toBe(1);
    expect(reponses.filter((r) => r.body.created === true)).toHaveLength(1);
    expect(await nombreDeFiches()).toBe(1);
  });

  it("⛔ MD-1 — dix créations SIMULTANÉES du même e-mail, sous des casses différentes : UNE ligne", async () => {
    const token = await connecter(PRO);
    const casses = ["amina@example.dz", "AMINA@example.dz", "Amina@Example.DZ", " amina@EXAMPLE.dz "];
    const reponses = await Promise.all(Array.from({ length: 10 }, (_, i) => creer(token, { email: casses[i % casses.length], nameLatin: "Amina Bensalem" })));
    expect(reponses.map((r) => r.status)).toEqual(Array.from({ length: 10 }, () => 200));
    expect(new Set(reponses.map((r) => (r.body.record as Fiche).id)).size).toBe(1);
    expect(await nombreDeFiches()).toBe(1);
  });

  it("⛔ MD-2 — le numéro et l'e-mail désignent DEUX fiches différentes : 409 CLIENT_RECORD_IDENTIFIERS_CONFLICT, et RIEN n'est fusionné", async () => {
    const token = await connecter(PRO);
    const parNumero = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    const parEmail = await fiche(token, { email: "karim@example.dz", nameLatin: "Karim Haddad" });
    const res = await creer(token, { phone: "0555123456", email: "karim@example.dz", nameLatin: "Quelqu'un" });
    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("CLIENT_RECORD_IDENTIFIERS_CONFLICT");
    expect(await ligne(parNumero.id)).toEqual({ phone: "+213555123456", email: null, name_ar: null, name_latin: "Amina Bensalem", linked_user_id: null });
    expect(await ligne(parEmail.id)).toEqual({ phone: null, email: "karim@example.dz", name_ar: null, name_latin: "Karim Haddad", linked_user_id: null });
    expect(await nombreDeFiches()).toBe(2);
  });

  it("⛔ MD-3 — l'e-mail est normalisé par UNE fonction (rogné, NFKC, minuscules) : la casse et la pleine chasse retrouvent la même fiche", async () => {
    const token = await connecter(PRO);
    const creee = await fiche(token, { email: "Amina@Mail.DZ", nameLatin: "Amina Bensalem" });
    expect(creee.email).toBe("amina@mail.dz");
    // « ＡＭＩＮＡ＠ＭＡＩＬ．ＤＺ » en caractères pleine chasse : NFKC les ramène aux caractères ordinaires.
    const pleineChasse = "ＡＭＩＮＡ＠ＭＡＩＬ．ＤＺ";
    const res = await creer(token, { email: pleineChasse, nameLatin: "Amina Bensalem" });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
    expect((res.body.record as Fiche).id).toBe(creee.id);
    expect(await nombreDeFiches()).toBe(1);
  });

  it("⛔ MD-4 — le numéro du pro, son SECOND numéro et son e-mail de compte sont refusés : 400 CLIENT_IS_PRO_CONTACT, rien n'est écrit", async () => {
    const token = await connecter(PRO);
    await ctx.prisma.proProfile.updateMany({ where: { user: { email: PRO.email } }, data: { phone2: "+213770000009" } });
    const refus = [
      { phone: PRO.phone },
      { phone: "0550000009" },
      { phone: "0770 00 00 09" },
      { email: PRO.email },
      { email: "PRO@Example.DZ" },
      { phone: "0661234567", email: PRO.email }
    ];
    for (const contact of refus) {
      const res = await creer(token, { ...contact, nameLatin: "Amina Bensalem" });
      expect(res.status, JSON.stringify(contact)).toBe(400);
      expect(res.body.message.code, JSON.stringify(contact)).toBe("CLIENT_IS_PRO_CONTACT");
    }
    expect(await nombreDeFiches()).toBe(0);
    // Contrôle NÉGATIF : le numéro d'un AUTRE pro n'est pas « le numéro du pro » (DB-8 refuse le sien) — la garde ne refuse pas tout.
    expect((await creer(token, { phone: AUTRE_PRO.phone, nameLatin: "Amina Bensalem" })).status).toBe(200);
  });
});

describe("K-3 — COMPLÈTE un nom manquant, ne remplace jamais", () => {
  it("complète le nom arabe d'une fiche qui n'avait que le latin : 200, le latin intact", async () => {
    const token = await connecter(PRO);
    const f = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    const res = await completer(token, f.id, { nameAr: "آمنة بن سالم" });
    expect(res.status).toBe(200);
    expect((res.body as Fiche).nameAr).toBe("آمنة بن سالم");
    expect(await ligne(f.id)).toEqual({ phone: "+213555123456", email: null, name_ar: "آمنة بن سالم", name_latin: "Amina Bensalem", linked_user_id: null });
  });

  it("⛔ MD-7 — un nom PRÉSENT n'est jamais remplacé : 409 CLIENT_RECORD_NAME_ALREADY_SET, la fiche intacte (même si l'autre nom manquait)", async () => {
    const token = await connecter(PRO);
    const f = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    for (const corps of [{ nameLatin: "Autre Nom" }, { nameLatin: "Autre Nom", nameAr: "آمنة" }]) {
      const res = await completer(token, f.id, corps);
      expect(res.status, JSON.stringify(corps)).toBe(409);
      expect(res.body.message.code).toBe("CLIENT_RECORD_NAME_ALREADY_SET");
    }
    expect(await ligne(f.id)).toEqual({ phone: "+213555123456", email: null, name_ar: null, name_latin: "Amina Bensalem", linked_user_id: null });
  });

  it("⛔ MD-6 — une fiche LIÉE ne se complète pas : 409 CLIENT_RECORD_LINKED", async () => {
    const token = await connecter(PRO);
    await registerUser(ctx, CLIENT);
    const f = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    await lier(f.id, CLIENT.email);
    const res = await completer(token, f.id, { nameAr: "آمنة" });
    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("CLIENT_RECORD_LINKED");
    expect((await ligne(f.id))?.name_ar).toBeNull();
  });

  it("un corps sans nom, ou avec une clé inconnue, est refusé (400)", async () => {
    const token = await connecter(PRO);
    const f = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    expect((await completer(token, f.id, {})).status).toBe(400);
    expect((await completer(token, f.id, { phone: "0661234567" })).status).toBe(400);
  });
});

describe("K-3b — MODIFIE une fiche (DB-11) ; refusé pour une fiche liée ; jamais une fusion", () => {
  it("modifie le numéro, l'e-mail et un nom : 200, valeurs normalisées comme à la création", async () => {
    const token = await connecter(PRO);
    const f = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    const res = await modifier(token, f.id, { phone: "0661 23 45 67", email: " Amina@Example.DZ ", nameLatin: "Amina Bensalem-Haddad" });
    expect(res.status).toBe(200);
    expect(await ligne(f.id)).toEqual({ phone: "+213661234567", email: "amina@example.dz", name_ar: null, name_latin: "Amina Bensalem-Haddad", linked_user_id: null });
  });

  it("⛔ MD-6 — une fiche LIÉE n'est pas modifiable (champs grisés) : 409 CLIENT_RECORD_LINKED, la fiche intacte", async () => {
    const token = await connecter(PRO);
    await registerUser(ctx, CLIENT);
    const f = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    await lier(f.id, CLIENT.email);
    const res = await modifier(token, f.id, { nameLatin: "Autre Nom" });
    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("CLIENT_RECORD_LINKED");
    expect((await ligne(f.id))?.name_latin).toBe("Amina Bensalem");
  });

  it("⛔ MD-2 — le numéro ou l'e-mail d'une AUTRE fiche du pro : 409 CLIENT_RECORD_IDENTIFIERS_CONFLICT, rien n'est fusionné", async () => {
    const token = await connecter(PRO);
    const a = await fiche(token, { phone: "0555123456", email: "amina@example.dz", nameLatin: "Amina Bensalem" });
    const b = await fiche(token, { phone: "0661234567", nameLatin: "Karim Haddad" });
    for (const corps of [{ phone: "0555123456" }, { email: "AMINA@example.dz" }]) {
      const res = await modifier(token, b.id, corps);
      expect(res.status, JSON.stringify(corps)).toBe(409);
      expect(res.body.message.code).toBe("CLIENT_RECORD_IDENTIFIERS_CONFLICT");
    }
    expect(await ligne(a.id)).toEqual({ phone: "+213555123456", email: "amina@example.dz", name_ar: null, name_latin: "Amina Bensalem", linked_user_id: null });
    expect(await ligne(b.id)).toEqual({ phone: "+213661234567", email: null, name_ar: null, name_latin: "Karim Haddad", linked_user_id: null });
  });

  it("⛔ MD-4 — K-3b refuse aussi le contact du pro : 400 CLIENT_IS_PRO_CONTACT", async () => {
    const token = await connecter(PRO);
    await ctx.prisma.proProfile.updateMany({ where: { user: { email: PRO.email } }, data: { phone2: "+213770000009" } });
    const f = await fiche(token, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    for (const corps of [{ phone: PRO.phone }, { phone: "0770000009" }, { email: PRO.email.toUpperCase() }]) {
      const res = await modifier(token, f.id, corps);
      expect(res.status, JSON.stringify(corps)).toBe(400);
      expect(res.body.message.code).toBe("CLIENT_IS_PRO_CONTACT");
    }
    expect((await ligne(f.id))?.phone).toBe("+213555123456");
  });

  it("un corps vide, une valeur nulle ou une clé inconnue sont refusés (400) — K-3b change une valeur, il n'en retire aucune", async () => {
    const token = await connecter(PRO);
    const f = await fiche(token, { phone: "0555123456", email: "amina@example.dz", nameLatin: "Amina Bensalem" });
    for (const corps of [{}, { email: null }, { phone: null }, { nameAr: null }, { linkedUserId: f.id }]) {
      expect((await modifier(token, f.id, corps)).status, JSON.stringify(corps)).toBe(400);
    }
  });
});

describe("⛔ MD-11 — la fiche d'un AUTRE pro : ni complétée, ni modifiée — 404 indistinct d'un identifiant inexistant", () => {
  it("K-3 et K-3b sur la fiche d'un autre pro rendent le MÊME 404 qu'un identifiant inexistant, et la fiche reste intacte", async () => {
    const tokenA = await connecter(PRO);
    const tokenB = await connecter(AUTRE_PRO);
    const deB = await fiche(tokenB, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    const inexistant = "018f0000-0000-7000-8000-00000000abcd";
    for (const [geste, id] of [
      ["K-3", deB.id],
      ["K-3", inexistant],
      ["K-3", "pas-un-uuid"]
    ] as const) {
      const res = await completer(tokenA, id, { nameAr: "آمنة" });
      expect(res.status, `${geste} ${id}`).toBe(404);
      expect(res.body.message, `${geste} ${id}`).toEqual({ code: "CLIENT_RECORD_NOT_FOUND", message: "clientRecord.errors.notFound" });
    }
    for (const id of [deB.id, inexistant]) {
      const res = await modifier(tokenA, id, { nameLatin: "Autre Nom" });
      expect(res.status, `K-3b ${id}`).toBe(404);
      expect(res.body.message).toEqual({ code: "CLIENT_RECORD_NOT_FOUND", message: "clientRecord.errors.notFound" });
    }
    expect(await ligne(deB.id)).toEqual({ phone: "+213555123456", email: null, name_ar: null, name_latin: "Amina Bensalem", linked_user_id: null });
  });

  it("un CLIENT connecté n'atteint aucune route des fiches (403)", async () => {
    await connecter(PRO);
    await registerUser(ctx, CLIENT);
    await verifyLastRegistered(ctx);
    const tokenClient = await loginAs(ctx, CLIENT.email, CLIENT.password);
    expect((await rechercher(tokenClient, { phone: "0555123456" })).status).toBe(403);
    expect((await creer(tokenClient, { phone: "0555123456", nameLatin: "Amina" })).status).toBe(403);
  });
});

describe("Les garanties de la BASE (D186) — la migration est l'autorité, pas le service", () => {
  /** La contrainte telle que PostgreSQL la rend. */
  async function definition(nom: string): Promise<string> {
    const rows = await ctx.prisma.$queryRaw<{ def: string }[]>`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = ${nom}`;
    expect(rows, `la contrainte ${nom} n'existe pas`).toHaveLength(1);
    return rows[0]!.def;
  }
  async function proProfileId(): Promise<string> {
    const p = await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: PRO.email } }, select: { id: true } });
    return p.id;
  }

  it("⛔ MD-14 (S-50) — l'expression du CHECK de forme accepte et refuse EXACTEMENT ce que `DZ_MOBILE_E164` accepte et refuse", async () => {
    await connecter(PRO);
    const def = await definition("pro_client_records_phone_canonical");
    const motif = /~ '([^']+)'/u.exec(def)?.[1];
    expect(motif, `aucune expression régulière dans « ${def} »`).toBeDefined();
    // L'échantillon : chaque premier chiffre admis, ceux qui ne le sont pas, trop court, trop long, mis en forme, fixe, étranger, chiffres arabo-indiens.
    const echantillon = [
      "+213555123456",
      "+213661234567",
      "+213771234567",
      "+213455123456",
      "+213855123456",
      "+21355512345",
      "+2135551234567",
      "+213 555 123 456",
      "0555123456",
      "+21321234567",
      "+33612345678",
      "+213٥٥٥١٢٣٤٥٦",
      "+213555１２３４５６"
    ];
    let examines = 0;
    for (const valeur of echantillon) {
      const lu = await ctx.prisma.$queryRaw<{ ok: boolean }[]>`SELECT ${valeur}::text ~ ${motif}::text AS ok`;
      expect({ valeur, base: lu[0]?.ok }).toEqual({ valeur, base: DZ_MOBILE_E164.test(valeur) });
      examines += 1;
    }
    // Le contrat accepte au moins un échantillon et en refuse au moins un : la confrontation n'est pas vide d'un côté.
    expect(echantillon.filter((v) => DZ_MOBILE_E164.test(v)).length).toBeGreaterThan(0);
    expect(echantillon.filter((v) => !DZ_MOBILE_E164.test(v)).length).toBeGreaterThan(0);
    expect(examines).toBe(echantillon.length);
  });

  it("⛔ MD-14 — la base REFUSE une écriture non canonique, même hors de l'API", async () => {
    await connecter(PRO);
    const pp = await proProfileId();
    await expect(
      ctx.prisma.$executeRaw`INSERT INTO pro_client_records (pro_profile_id, phone, name_latin) VALUES (${pp}::uuid, '0555123456', 'Amina')`
    ).rejects.toThrow(/pro_client_records_phone_canonical/u);
    await expect(
      ctx.prisma.$executeRaw`INSERT INTO pro_client_records (pro_profile_id, phone, name_latin) VALUES (${pp}::uuid, '+213555123456', 'Amina')`
    ).resolves.toBe(1);
  });

  it("les CHECK : un identifiant au moins, un nom au moins, un lien cohérent (compte ET date, ou ni l'un ni l'autre)", async () => {
    await connecter(PRO);
    await registerUser(ctx, CLIENT);
    const pp = await proProfileId();
    const compte = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email }, select: { id: true } });
    await expect(ctx.prisma.$executeRaw`INSERT INTO pro_client_records (pro_profile_id, name_latin) VALUES (${pp}::uuid, 'Amina')`).rejects.toThrow(
      /pro_client_records_identifier_present/u
    );
    await expect(ctx.prisma.$executeRaw`INSERT INTO pro_client_records (pro_profile_id, phone) VALUES (${pp}::uuid, '+213555123456')`).rejects.toThrow(
      /pro_client_records_name_present/u
    );
    await expect(
      ctx.prisma.$executeRaw`INSERT INTO pro_client_records (pro_profile_id, phone, name_latin, linked_user_id) VALUES (${pp}::uuid, '+213555123456', 'Amina', ${compte.id}::uuid)`
    ).rejects.toThrow(/pro_client_records_link_coherent/u);
    await expect(
      ctx.prisma.$executeRaw`INSERT INTO pro_client_records (pro_profile_id, phone, name_latin, linked_at) VALUES (${pp}::uuid, '+213555123456', 'Amina', now())`
    ).rejects.toThrow(/pro_client_records_link_coherent/u);
  });

  it("les unicités sont PARTIELLES et PAR PRO : un même numéro chez deux pros, deux fiches sans e-mail ; jamais deux fois le même numéro chez un pro", async () => {
    const tokenA = await connecter(PRO);
    const tokenB = await connecter(AUTRE_PRO);
    await fiche(tokenA, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    await fiche(tokenB, { phone: "0555123456", nameLatin: "Amina Bensalem" });
    expect(await nombreDeFiches()).toBe(2);
    const pp = await proProfileId();
    await expect(
      ctx.prisma.$executeRaw`INSERT INTO pro_client_records (pro_profile_id, phone, name_latin) VALUES (${pp}::uuid, '+213555123456', 'Doublon')`
    ).rejects.toThrow(/pro_client_records_pro_phone_unique/u);
    const index = await ctx.prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'pro_client_records' AND indexname IN ('pro_client_records_pro_phone_unique', 'pro_client_records_pro_email_unique') ORDER BY indexname`;
    expect(index.map((i) => i.indexname)).toEqual(["pro_client_records_pro_email_unique", "pro_client_records_pro_phone_unique"]);
    expect(index[0]!.indexdef).toMatch(/UNIQUE INDEX .* WHERE \(email IS NOT NULL\)/u);
    expect(index[1]!.indexdef).toMatch(/UNIQUE INDEX .* WHERE \(phone IS NOT NULL\)/u);
  });
});
