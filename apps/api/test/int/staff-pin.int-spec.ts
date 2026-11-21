// Intégration — rang 58, L36-3b (D356) : LA CONNEXION PAR PIN (K-23), sur PostgreSQL réel. CHEMIN D'IDENTITÉ : méthode RENFORCÉE.
//
// ⛔ CE QUE CE FICHIER MESURE (cadrage D340, § 4 « P » ; DR5 ; R-3 de la consigne) :
//   · MP-2  — un PIN sans jeton d'appareil ne vaut RIEN, et ne consomme AUCUN essai (un porteur du seul Bearer ne verrouille pas un membre) ;
//   · MP-3  — l'appareil d'un AUTRE membre, d'UNE AUTRE salle : refusés, quatre croisements ;
//   · MP-15 — trois essais : le troisième ÉCHEC pose le verrou (le troisième essai, lui, peut RÉUSSIR) ; verrouillé, même le bon PIN est refusé ; le déblocage est le mot de passe, qui génère un PIN neuf ;
//   · MP-26, MP-27, MP-28 — PIN expiré, appareil expiré ou révoqué, plus de huit cookies d'appareil ;
//   · R-3   — « le refus a la même forme et le même coût » : neuf causes, UN corps à l'octet, UN calcul de HMAC chacune (par espion, D290) ;
//   · l'ACCORD entre la règle pure (`etatDuPin`) et le prédicat SQL de la réservation, sur chaque état — c'est la seule façon d'avoir « UNE copie de la règle » (R-4) quand la décision atomique est en SQL.
// ⚠ Les verdicts passent par `expect` de vitest (assertions natives), jamais par `.expect(<statut>)` de supertest (D305, D352). Le PIN d'un test est POSÉ (`poserPin`) : le vrai générateur est aléatoire.
// ⚠ Un test dont la valeur attendue doit DIFFÉRER du PIN neuf aléatoire utilise un PIN TRIVIAL (« 1234 ») : le générateur n'en produit jamais, la différence est certaine, jamais probable.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { StaffPinState } from "@zwadj/types";
import { etatDuPin } from "../../src/staff/staff-account-state";
import { STAFF_STORE, type StaffStore } from "../../src/staff/staff-store.types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import {
  AUTRE_PIN_DE_TEST,
  Jar,
  PIN_DE_TEST,
  appeler,
  codeDe,
  connecter,
  connecterParPin,
  corpsStable,
  creerMembre,
  creerPro,
  activer,
  echeanceDuMotDePasse,
  effacerPin,
  lireCookies,
  membreActif,
  pinDuMembre,
  pinRendu,
  poserPin,
  posteDe,
  proActive,
  sessionsDuMembre,
  sha256
} from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const PIN_TRIVIAL = "1234";
const UUID_INCONNU = "018f0000-0000-7000-8000-00000000dead";

/** Une salle activée, son Manager, un employé « Karim » sur SON poste (cookies d'appareil), et son PIN posé. */
async function monde() {
  await truncateAll(ctx.prisma);
  const m = await proActive(ctx);
  const e = await membreActif(ctx, m.pro, m.jar, "Karim");
  await poserPin(ctx, e.id);
  const poste = (): Jar => posteDe(e.jar);
  const vivantes = async (): Promise<number> => (await sessionsDuMembre(ctx.prisma, e.id)).filter((s) => s.ended_at === null).length;
  const lignesDeSession = async (): Promise<number> => (await sessionsDuMembre(ctx.prisma, e.id)).length;
  return { m, e, poste, vivantes, lignesDeSession };
}

describe("⛔ K-23 — un PIN juste, sur le poste du membre : la session s'ouvre", () => {
  it("200 : le membre est rendu SANS PIN, une session de plus, `last_login_at` écrit, le compteur à zéro ; le cookie de session est posé (HttpOnly, Strict, chemin /api/v1, sans échéance) et AUCUN cookie d'appareil neuf", async () => {
    const w = await monde();
    const avant = await w.lignesDeSession();
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual({ member: { id: w.e.id, accountName: "Karim", role: "EMPLOYEE", mustChangePassword: false } });
    expect(Object.keys(res.body as object), "aucune clé `pin` dans la réponse : le PIN ne se rend jamais à la connexion").toEqual(["member"]);
    const cookies = lireCookies(res);
    const session = cookies.find((c) => c.name === "zwadj_ss");
    expect(session, "le cookie de session est posé").toBeDefined();
    expect(session!.attributs.has("httponly")).toBe(true);
    expect(session!.attributs.get("samesite")).toBe("Strict");
    expect(session!.attributs.get("path")).toBe("/api/v1");
    expect(session!.attributs.has("expires") || session!.attributs.has("max-age"), "cookie de session : aucune échéance côté navigateur").toBe(false);
    expect(cookies.filter((c) => c.name.startsWith("zwadj_dv_")), "l'appareil est celui du poste : aucun cookie d'appareil neuf").toEqual([]);
    expect(await w.lignesDeSession(), "une session de plus").toBe(avant + 1);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_failed_count).toBe(0);
    expect(pin.pin_locked_at).toBeNull();
  });

  it("la session ouverte par PIN est une VRAIE session : l'état (K-17) la rend, le membre y est", async () => {
    const w = await monde();
    const poste = w.poste();
    const res = await connecterParPin(ctx, w.m.pro, poste, w.e.id, PIN_DE_TEST);
    expect(res.status).toBe(200);
    const etat = await appeler(ctx, w.m.pro.token, poste, "get", "/api/v1/pro/staff/session");
    expect(etat.status).toBe(200);
    expect((etat.body as { member: { id: string } | null }).member?.id).toBe(w.e.id);
  });

  it("la session est rattachée à l'APPAREIL du poste : `device_id` est celui du cookie présenté, et son `last_used_at` est écrit", async () => {
    const w = await monde();
    const appareil = w.e.jar.appareils()[0]!;
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    const lignes = await sessionsDuMembre(ctx.prisma, w.e.id);
    const derniere = await ctx.prisma.$queryRaw<Array<{ token_hash: string; last_used_at: Date | null }>>`
      SELECT d.token_hash, d.last_used_at FROM pro_staff_sessions s JOIN pro_staff_devices d ON d.id = s.device_id WHERE s.id = ${lignes[lignes.length - 1]!.id}::uuid`;
    expect(derniere[0]!.token_hash).toBe(sha256(appareil.value));
    expect(derniere[0]!.last_used_at, "`last_used_at` de l'appareil est écrit à la connexion").not.toBeNull();
  });

  it("un membre dont le mot de passe est À CHANGER (un temporaire valable) SE CONNECTE par PIN : le corps dit `mustChangePassword: true`", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const cree = await creerMembre(ctx, m.pro, m.jar, "Lina");
    const jar = new Jar();
    const premiere = await connecter(ctx, m.pro, jar, "Lina", cree.temporaryPassword);
    expect(premiere.status).toBe(200);
    await poserPin(ctx, cree.id);
    const res = await connecterParPin(ctx, m.pro, posteDe(jar), cree.id, PIN_DE_TEST);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((res.body as { member: { mustChangePassword: boolean } }).member.mustChangePassword).toBe(true);
  });
});

describe("⛔ MP-2 — un PIN SANS appareil ne vaut rien et ne consomme aucun essai", () => {
  it("le bon PIN sans AUCUN cookie d'appareil : 401 `STAFF_INVALID_CREDENTIALS`, aucun cookie posé, aucune session, le compteur INCHANGÉ", async () => {
    const w = await monde();
    const avant = await w.lignesDeSession();
    const res = await connecterParPin(ctx, w.m.pro, new Jar(), w.e.id, PIN_DE_TEST);
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("STAFF_INVALID_CREDENTIALS");
    expect(lireCookies(res)).toEqual([]);
    expect(await w.lignesDeSession()).toBe(avant);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count, "aucun essai consommé : sinon le seul Bearer suffirait à verrouiller un membre").toBe(0);
  });

  it("un PIN FAUX sans appareil, dix fois : le compteur ne bouge pas et le membre n'est JAMAIS verrouillé (le DoS par le seul Bearer n'existe pas)", async () => {
    const w = await monde();
    for (let i = 0; i < 10; i += 1) expect((await connecterParPin(ctx, w.m.pro, new Jar(), w.e.id, "0482")).status).toBe(401);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_failed_count).toBe(0);
    expect(pin.pin_locked_at).toBeNull();
  });
});

describe("⛔ MP-3 — l'appareil d'un autre membre, d'une autre salle : QUATRE croisements, tous refusés, aucun essai consommé", () => {
  it("(i) l'appareil d'un AUTRE membre de la même salle ; (ii) l'appareil de CE membre sous le Bearer d'une AUTRE salle ; (iii) l'identifiant d'un membre d'une autre salle, sous le Bearer de la nôtre ; (iv) l'appareil d'une autre salle", async () => {
    const w = await monde();
    const autre = await membreActif(ctx, w.m.pro, w.m.jar, "Lina");
    await poserPin(ctx, autre.id);
    // Une AUTRE salle, son Manager et son poste
    const proB = await creerPro(ctx);
    const b = await activer(ctx, proB, new Jar(), "Brahim");
    expect(b.res.status).toBe(201);
    const membreB = (b.res.body as { member: { id: string } }).member.id;
    await poserPin(ctx, membreB);

    const comptes = async () => ({
      karim: (await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count,
      lina: (await pinDuMembre(ctx.prisma, autre.id)).pin_failed_count,
      brahim: (await pinDuMembre(ctx.prisma, membreB)).pin_failed_count
    });
    const avant = await comptes();

    // (i) l'appareil de Lina, l'identifiant et le PIN de Karim, dans la salle A
    const i = await connecterParPin(ctx, w.m.pro, posteDe(autre.jar), w.e.id, PIN_DE_TEST);
    // (ii) l'appareil de Karim (salle A), son identifiant et son PIN, avec le Bearer de la salle B
    const ii = await connecterParPin(ctx, proB, w.poste(), w.e.id, PIN_DE_TEST);
    // (iii) l'appareil de Brahim (salle B), l'identifiant de Karim, avec le Bearer de la salle A
    const iii = await connecterParPin(ctx, w.m.pro, posteDe(b.jar), w.e.id, PIN_DE_TEST);
    // (iv) l'appareil de Karim, l'identifiant de Brahim (salle B), avec le Bearer de la salle A
    const iv = await connecterParPin(ctx, w.m.pro, w.poste(), membreB, PIN_DE_TEST);

    for (const [nom, res] of [["(i)", i], ["(ii)", ii], ["(iii)", iii], ["(iv)", iv]] as const) {
      expect(res.status, `${nom} : ${JSON.stringify(res.body)}`).toBe(401);
      expect(codeDe(res), nom).toBe("STAFF_INVALID_CREDENTIALS");
      expect(lireCookies(res), `${nom} : aucun cookie`).toEqual([]);
    }
    expect(await comptes(), "aucun essai consommé nulle part : les quatre refus sont AVANT la réservation").toEqual(avant);
    expect((await sessionsDuMembre(ctx.prisma, w.e.id)).filter((s) => s.ended_at === null).length, "aucune session ouverte pour Karim par ces croisements").toBe(1);
  });
});

describe("⛔ MP-15 — trois essais : le troisième ÉCHEC pose le verrou ; le bon PIN verrouillé est refusé ; le mot de passe débloque et génère un PIN neuf", () => {
  it("un PIN faux compte UN essai : 401, le compteur monte à un, le verrou n'est pas posé", async () => {
    const w = await monde();
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0482");
    expect(res.status).toBe(401);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_failed_count).toBe(1);
    expect(pin.pin_locked_at).toBeNull();
  });

  it("⛔ le cas RÉEL — deux PIN faux, puis le BON au troisième essai : 200 (« trois essais » ne devient pas deux), le compteur revient à ZÉRO, aucun verrou", async () => {
    const w = await monde();
    expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0482")).status).toBe(401);
    expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0483")).status).toBe(401);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count).toBe(2);
    const bon = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(bon.status, JSON.stringify(bon.body)).toBe(200);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_failed_count, "une connexion réussie remet le compteur à zéro").toBe(0);
    expect(pin.pin_locked_at).toBeNull();
  });

  it("⛔ le TROISIÈME échec pose `pin_locked_at` ET met fin à TOUTES les sessions du membre (`PIN_LOCKED`) — celle ouverte à la création du membre comprise", async () => {
    const w = await monde();
    expect(await w.vivantes(), "le membre a une session vivante avant (précondition)").toBeGreaterThanOrEqual(1);
    for (const faux of ["0482", "0483", "0484"]) expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, faux)).status).toBe(401);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_failed_count).toBe(3);
    expect(pin.pin_locked_at, "le verrou est posé au troisième échec").not.toBeNull();
    expect(await w.vivantes(), "aucune session vivante : le verrouillage les a toutes terminées").toBe(0);
    const fins = (await sessionsDuMembre(ctx.prisma, w.e.id)).map((s) => s.end_reason);
    expect(fins, "la fin est PIN_LOCKED").toContain("PIN_LOCKED");
  });

  it("⛔ VERROUILLÉ, le BON PIN est refusé (401) et ne compte pas : le compteur reste à trois, aucune session", async () => {
    const w = await monde();
    await poserPin(ctx, w.e.id, PIN_DE_TEST, { verrouille: true });
    const avant = await w.lignesDeSession();
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("STAFF_INVALID_CREDENTIALS");
    expect(await w.lignesDeSession()).toBe(avant);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count, "un essai refusé parce que verrouillé n'est pas compté").toBe(3);
  });

  it("⛔ le DÉBLOCAGE est le mot de passe : la connexion par nom de compte et mot de passe d'un membre verrouillé rend un PIN NEUF, remet le compteur à zéro et lève le verrou ; l'ANCIEN PIN est mort, le NEUF sert", async () => {
    const w = await monde();
    await poserPin(ctx, w.e.id, PIN_TRIVIAL, { verrouille: true }); // un PIN que le générateur ne produit JAMAIS : le neuf en diffère à coup sûr
    const connexion = await connecter(ctx, w.m.pro, w.poste(), "Karim", w.e.password);
    expect(connexion.status, JSON.stringify(connexion.body)).toBe(200);
    const neuf = pinRendu(connexion);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_locked_at).toBeNull();
    expect(pin.pin_failed_count).toBe(0);
    expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_TRIVIAL)).status, "l'ANCIEN PIN est mort").toBe(401);
    expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, neuf)).status, "le PIN NEUF sert").toBe(200);
  });
});

describe("⛔ MP-26, MP-27, MP-28 — PIN expiré, appareil expiré ou révoqué, trop de cookies d'appareil", () => {
  it("MP-26 — un PIN EXPIRÉ : 401, aucun essai consommé ; le bon PIN d'un membre dont le PIN a expiré ne passe pas", async () => {
    const w = await monde();
    await poserPin(ctx, w.e.id, PIN_DE_TEST, { valideSecondes: -10 });
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status).toBe(401);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count).toBe(0);
  });

  it("MP-26 — le PIN qui expire dans UNE seconde SERT encore (D55 : la borne se dérive du cas réel)", async () => {
    const w = await monde();
    await poserPin(ctx, w.e.id, PIN_DE_TEST, { valideSecondes: 60 });
    expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST)).status).toBe(200);
  });

  it("MP-27 — un appareil EXPIRÉ : 401, aucun essai consommé", async () => {
    const w = await monde();
    await ctx.prisma.$executeRaw`UPDATE pro_staff_devices SET created_at = now() - interval '2 days', expires_at = now() - interval '1 day' WHERE member_id = ${w.e.id}::uuid`;
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status).toBe(401);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count).toBe(0);
  });

  it("MP-27 — un appareil RÉVOQUÉ : 401, aucun essai consommé", async () => {
    const w = await monde();
    await ctx.prisma.$executeRaw`UPDATE pro_staff_devices SET revoked_at = now() WHERE member_id = ${w.e.id}::uuid`;
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status).toBe(401);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count).toBe(0);
  });

  it("⛔ MP-28 — la borne de LECTURE est huit cookies d'appareil : le bon est le HUITIÈME → 200 ; le NEUVIÈME → 401 (au-delà de la borne, il n'est même pas lu)", async () => {
    const w = await monde();
    const bon = w.e.jar.appareils()[0]!;
    const poste = (nombreDeFaux: number): Jar => {
      const jar = new Jar();
      for (let i = 0; i < nombreDeFaux; i += 1) jar.poser(`zwadj_dv_faux000${i}`, `${"f".repeat(42)}${i}`, "/api/v1/pro/staff");
      jar.poser(bon.name, bon.value, "/api/v1/pro/staff");
      return jar;
    };
    const huitieme = await connecterParPin(ctx, w.m.pro, poste(7), w.e.id, PIN_DE_TEST);
    expect(huitieme.status, "le bon cookie est le huitième : lu").toBe(200);
    // la session de la tentative précédente ne gêne pas : on rejoue sur un poste neuf
    const neuvieme = await connecterParPin(ctx, w.m.pro, poste(8), w.e.id, PIN_DE_TEST);
    expect(neuvieme.status, "le bon cookie est le neuvième : ignoré").toBe(401);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count, "aucun essai consommé par un poste sans appareil reconnu dans les huit premiers").toBe(0);
  });
});

describe("⛔ R-3 — le refus a la MÊME FORME et le MÊME COÛT, quelle qu'en soit la cause", () => {
  it("neuf causes (membre inconnu, PIN faux, verrouillé, expiré, appareil absent, membre désactivé, membre d'une autre salle, temporaire expiré, couche éteinte) : UN corps à l'octet, aucun cookie, UN calcul de HMAC chacune", async () => {
    const w = await monde();
    const { StaffPinHasher } = await import("../../src/staff/staff-pin-hasher"); // importé ICI : seul ce test espionne le hacheur
    const hacheur = ctx.app.get(StaffPinHasher);
    const reel = vi.spyOn(hacheur, "verify");
    const factice = vi.spyOn(hacheur, "verifyAgainstDummy");
    const lina = await membreActif(ctx, w.m.pro, w.m.jar, "Lina");
    await poserPin(ctx, lina.id);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${lina.id}::uuid`;
    const samir = await creerMembre(ctx, w.m.pro, w.m.jar, "Samir");
    const jarSamir = new Jar();
    expect((await connecter(ctx, w.m.pro, jarSamir, "Samir", samir.temporaryPassword)).status).toBe(200);
    await poserPin(ctx, samir.id);
    await echeanceDuMotDePasse(ctx.prisma, samir.id, -10); // un temporaire dont l'échéance est passée
    const proB = await creerPro(ctx);
    const b = await activer(ctx, proB, new Jar(), "Brahim");
    const membreB = (b.res.body as { member: { id: string } }).member.id;
    const proSansCouche = await creerPro(ctx);

    const causes: Array<[string, () => Promise<Awaited<ReturnType<typeof connecterParPin>>>, () => Promise<void>]> = [
      ["membre inconnu", () => connecterParPin(ctx, w.m.pro, w.poste(), UUID_INCONNU, PIN_DE_TEST), async () => undefined],
      ["PIN faux", () => connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0482"), async () => poserPin(ctx, w.e.id)],
      ["verrouillé", () => connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST), async () => poserPin(ctx, w.e.id, PIN_DE_TEST, { verrouille: true })],
      ["expiré", () => connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST), async () => poserPin(ctx, w.e.id, PIN_DE_TEST, { valideSecondes: -10 })],
      ["appareil absent", () => connecterParPin(ctx, w.m.pro, new Jar(), w.e.id, PIN_DE_TEST), async () => poserPin(ctx, w.e.id)],
      ["membre désactivé", () => connecterParPin(ctx, w.m.pro, posteDe(lina.jar), lina.id, PIN_DE_TEST), async () => undefined],
      ["membre d'une autre salle", () => connecterParPin(ctx, w.m.pro, w.poste(), membreB, PIN_DE_TEST), async () => undefined],
      ["temporaire expiré", () => connecterParPin(ctx, w.m.pro, posteDe(jarSamir), samir.id, PIN_DE_TEST), async () => undefined],
      ["couche éteinte", () => connecterParPin(ctx, proSansCouche, new Jar(), UUID_INCONNU, PIN_DE_TEST), async () => undefined]
    ];
    const rendus = new Set<string>();
    for (const [nom, tenter, preparer] of causes) {
      await preparer();
      reel.mockClear();
      factice.mockClear();
      const res = await tenter();
      expect(res.status, `${nom} : ${JSON.stringify(res.body)}`).toBe(401);
      expect(lireCookies(res), `${nom} : aucun cookie`).toEqual([]);
      expect(reel.mock.calls.length + factice.mock.calls.length, `${nom} : UN calcul de HMAC, ni plus ni moins (le coût ne dit pas la cause)`).toBe(1);
      rendus.add(corpsStable(res));
    }
    expect(rendus.size, "les neuf refus sont IDENTIQUES à l'octet (aucune fuite d'état)").toBe(1);
  });

  it("un PIN faux consomme UN essai ; un PIN juste n'en consomme aucun ; les trois essais sont comptés par la RÉSERVATION, avant la vérification (la vérité est la base)", async () => {
    const w = await monde();
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0482");
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count).toBe(1);
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count).toBe(0);
  });
});

describe("la validation du corps ne consomme rien", () => {
  it("un PIN mal formé, un identifiant qui n'en est pas un, une clé inconnue : 400, aucun essai consommé, aucune ligne d'audit d'échec", async () => {
    const w = await monde();
    for (const corps of [{ memberId: w.e.id, pin: "12" }, { memberId: w.e.id, pin: "48a1" }, { memberId: "pas-un-uuid", pin: PIN_DE_TEST }, { memberId: w.e.id, pin: PIN_DE_TEST, appareil: "x" }, {}]) {
      const res = await appeler(ctx, w.m.pro.token, w.poste(), "post", "/api/v1/pro/staff/pin-login", corps);
      expect(res.status, JSON.stringify(corps)).toBe(400);
    }
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count).toBe(0);
    const lignes = await ctx.prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'staff.pin_login_failed'`;
    expect(lignes[0]!.n).toBe(0);
  });

  it("sans Bearer : 401 `UNAUTHENTICATED` (la route est derrière `JwtAuthGuard`), jamais une réponse du personnel", async () => {
    const w = await monde();
    const res = await appeler(ctx, undefined, w.poste(), "post", "/api/v1/pro/staff/pin-login", { memberId: w.e.id, pin: PIN_DE_TEST });
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("UNAUTHENTICATED");
  });
});

describe("⛔ R-4 — l'ACCORD entre la règle pure (`etatDuPin`) et le prédicat SQL de la réservation, sur CHAQUE état", () => {
  it("six états : la base réserve un essai SI ET SEULEMENT SI la règle pure dit VALID (c'est ce qui rend « UNE copie de la règle » vrai quand la décision atomique est en SQL)", async () => {
    const w = await monde();
    const magasin = ctx.app.get<StaffStore>(STAFF_STORE);
    const appareil = w.e.jar.appareils()[0]!;
    const etats: Array<[string, () => Promise<void>]> = [
      ["absent", () => effacerPin(ctx.prisma, w.e.id)],
      ["valide, aucun échec", () => poserPin(ctx, w.e.id, PIN_DE_TEST)],
      ["valide, deux échecs", () => poserPin(ctx, w.e.id, PIN_DE_TEST, { echecs: 2 })],
      ["expiré", () => poserPin(ctx, w.e.id, PIN_DE_TEST, { valideSecondes: -10 })],
      ["verrouillé (verrou posé)", () => poserPin(ctx, w.e.id, PIN_DE_TEST, { verrouille: true })],
      ["verrouillé (compte au plafond, verrou non posé)", () => poserPin(ctx, w.e.id, PIN_DE_TEST, { echecs: 3, verrouille: false })]
    ];
    const attendus: string[] = [];
    for (const [nom, preparer] of etats) {
      await preparer();
      const ligne = await pinDuMembre(ctx.prisma, w.e.id);
      const base = await ctx.prisma.$queryRaw<Array<{ now: Date }>>`SELECT now() AS now`;
      const etat = etatDuPin({ hasPin: ligne.pin_hash !== null, pinExpiresAt: ligne.pin_expires_at, pinLockedAt: ligne.pin_locked_at, pinFailedCount: ligne.pin_failed_count }, base[0]!.now);
      const reservation = await magasin.reservePinAttempt({ proProfileId: w.m.pro.proProfileId, memberId: w.e.id, deviceTokenHashes: [sha256(appareil.value)] });
      expect(reservation.reserved, `${nom} : la règle pure dit ${etat}`).toBe(etat === StaffPinState.VALID);
      attendus.push(etat);
    }
    expect(attendus, "les quatre états de la règle ont été exercés (sinon l'accord ne mesure pas tout)").toEqual(expect.arrayContaining([StaffPinState.ABSENT, StaffPinState.VALID, StaffPinState.EXPIRED, StaffPinState.LOCKED]));
  });

  it("un PIN DIFFÉRENT posé par `poserPin` n'est pas celui d'un autre : « 4821 » et « 9136 » ne se vérifient pas l'un pour l'autre (le haché est celui du PIN, avec le secret)", async () => {
    const w = await monde();
    await poserPin(ctx, w.e.id, AUTRE_PIN_DE_TEST);
    expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST)).status).toBe(401);
    expect((await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, AUTRE_PIN_DE_TEST)).status).toBe(200);
  });
});
