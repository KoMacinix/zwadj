// Intégration — rang 58, L36-3b (D356) : L'ÉMISSION ET L'EFFACEMENT DU PIN, sur PostgreSQL réel. CHEMIN D'IDENTITÉ : méthode RENFORCÉE.
//
// ⛔ CE QUE CE FICHIER MESURE : le PIN est rendu UNE fois (`Cache-Control: no-store`) par l'activation (K-14), par la connexion par mot de passe (K-15) et par le changement de mot de passe (K-18) — UNE règle : un PIN
// neuf quand le membre n'en a pas de VALABLE (absent, expiré, verrouillé), jamais sinon ; la réinitialisation (K-21) et la désactivation (K-22) l'EFFACENT ; un appareil n'est jamais valable au-delà du PIN ;
// le plafond d'essais de la constante est celui de la `CHECK` de la base.
// ⚠ Les verdicts passent par `expect` de vitest (assertions natives). Le PIN d'un test se POSE (`poserPin`) ; un PIN qui doit DIFFÉRER du neuf aléatoire est TRIVIAL (« 1234 »), que le générateur ne produit jamais.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STAFF_LIMITS } from "@zwadj/types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import {
  Jar,
  MOT_DE_PASSE_MEMBRE_2,
  PIN_DE_TEST,
  activer,
  appareilsAvecEcheance,
  appeler,
  changerMotDePasse,
  connecter,
  connecterParPin,
  creerMembre,
  creerPro,
  effacerPin,
  estTrivial,
  hacherPin,
  lignesAudit,
  membreActif,
  pinDe,
  pinDuMembre,
  pinRendu,
  poserPin,
  posteDe,
  proActive,
  sessionsDuMembre,
  texteDeTousLesAudits
} from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});

const PIN_TRIVIAL = "1234";

/** Le texte de TOUTES les lignes des tables du personnel : ce que « le PIN en clair n'est stocké nulle part » doit chercher (le PIN s'y chercherait entre guillemets : une chaîne JSON). */
async function texteDesTablesDuPersonnel(): Promise<string> {
  const morceaux: string[] = [];
  for (const table of ["pro_staff_members", "pro_staff_devices", "pro_staff_sessions", "audit_logs"]) {
    const lignes = await ctx.prisma.$queryRawUnsafe<Array<{ t: string }>>(`SELECT row_to_json(x)::text AS t FROM ${table} x`);
    morceaux.push(...lignes.map((l) => l.t));
  }
  return morceaux.join("\n");
}

const dureeDuPin = async (memberId: string): Promise<boolean> => {
  const r = await ctx.prisma.$queryRaw<Array<{ ok: boolean }>>`
    SELECT (pin_expires_at - pin_generated_at = make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int)) AS ok FROM pro_staff_members WHERE id = ${memberId}::uuid`;
  return r[0]!.ok;
};

describe("⛔ K-14 — l'activation rend le PIN du Manager UNE fois, `no-store`", () => {
  it("201 : un PIN de quatre chiffres non trivial dans la réponse, `Cache-Control: no-store`, rien d'autre ne change de forme (le membre est rendu comme avant)", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    const { res } = await activer(ctx, pro);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const pin = pinRendu(res);
    expect(estTrivial(pin), "un PIN trivial n'est jamais rendu").toBe(false);
    expect(res.headers["cache-control"], "le PIN se rend UNE fois, jamais mis en cache").toBe("no-store");
    expect(Object.keys(res.body as object).sort()).toEqual(["member", "pin"]);
  });

  it("⛔ le PIN est STOCKÉ en HMAC avec le secret (le haché que le hacheur de l'application calcule), jamais en clair : 64 hexadécimaux, la durée de 90 jours, le compteur à zéro, aucun verrou — et le PIN n'est NULLE PART dans les tables du personnel ni dans l'audit", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    const { res } = await activer(ctx, pro);
    const pin = pinRendu(res);
    const membreId = (res.body as { member: { id: string } }).member.id;
    const ligne = await pinDuMembre(ctx.prisma, membreId);
    expect(ligne.pin_hash).toBe(hacherPin(pin));
    expect(ligne.pin_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(ligne.pin_generated_at).not.toBeNull();
    expect(await dureeDuPin(membreId), "l'échéance est PIN_VALIDITY_DAYS après la génération").toBe(true);
    expect(ligne.pin_failed_count).toBe(0);
    expect(ligne.pin_locked_at).toBeNull();
    const tout = await texteDesTablesDuPersonnel();
    expect(tout.includes(`"${pin}"`), "le PIN en clair figure dans une table du personnel ou l'audit").toBe(false);
    expect(await texteDeTousLesAudits(ctx.prisma), "ni dans l'audit").not.toContain(`"${pin}"`);
  });

  it("⛔ l'appareil créé à l'activation n'est jamais valable au-delà du PIN : leurs échéances sont ÉGALES (même transaction, même `now()`)", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const appareils = await appareilsAvecEcheance(ctx.prisma, m.membreId);
    const ligne = await pinDuMembre(ctx.prisma, m.membreId);
    expect(appareils).toHaveLength(1);
    expect(appareils[0]!.expires_at.getTime()).toBe(ligne.pin_expires_at!.getTime());
  });

  it("l'état (K-17) ne rend JAMAIS le PIN : sa forme est celle d'avant (`enabled`, `member`, `knownMembers`)", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const etat = await appeler(ctx, m.pro.token, m.jar, "get", "/api/v1/pro/staff/session");
    expect(Object.keys(etat.body as object).sort()).toEqual(["enabled", "knownMembers", "member"]);
    expect(Object.keys((etat.body as { member: object }).member).sort()).toEqual(["accountName", "id", "mustChangePassword", "role"]);
  });
});

describe("⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois", () => {
  it("la PREMIÈRE connexion d'un membre (aucun PIN) rend un PIN, `no-store`, stocké en HMAC, valable 90 jours ; la SECONDE (PIN valable) rend `pin: null` et ne touche à aucune colonne", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const cree = await creerMembre(ctx, m.pro, m.jar, "Karim");
    expect((await pinDuMembre(ctx.prisma, cree.id)).pin_hash, "un membre fraîchement créé n'a pas de PIN").toBeNull();
    const premiere = await connecter(ctx, m.pro, new Jar(), "Karim", cree.temporaryPassword);
    expect(premiere.status, JSON.stringify(premiere.body)).toBe(200);
    const pin = pinRendu(premiere);
    expect(premiere.headers["cache-control"]).toBe("no-store");
    const apres = await pinDuMembre(ctx.prisma, cree.id);
    expect(apres.pin_hash).toBe(hacherPin(pin));
    expect(await dureeDuPin(cree.id)).toBe(true);

    const seconde = await connecter(ctx, m.pro, new Jar(), "Karim", cree.temporaryPassword);
    expect(seconde.status).toBe(200);
    expect((seconde.body as { pin: unknown }).pin, "la clé `pin` est PRÉSENTE et nulle : le PIN n'est jamais relisible").toBeNull();
    expect(Object.prototype.hasOwnProperty.call(seconde.body, "pin")).toBe(true);
    expect(seconde.headers["cache-control"], "`no-store` même quand aucun PIN n'est rendu (une réponse de cette route ne se met jamais en cache)").toBe("no-store");
    const encore = await pinDuMembre(ctx.prisma, cree.id);
    expect(encore.pin_hash, "le PIN valable n'est pas remplacé").toBe(apres.pin_hash);
    expect(encore.pin_generated_at?.getTime()).toBe(apres.pin_generated_at?.getTime());
  });

  it("⛔ un PIN EXPIRÉ est remplacé par un PIN NEUF (l'ancien ne sert plus, l'échéance repart pour 90 jours) — et ce n'est PAS un déblocage : aucune ligne `staff.pin_unlock`", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_TRIVIAL, { valideSecondes: -10 });
    const res = await connecter(ctx, m.pro, new Jar(), "Karim", e.password);
    expect(res.status).toBe(200);
    const neuf = pinRendu(res);
    expect(neuf).not.toBe(PIN_TRIVIAL);
    expect(await dureeDuPin(e.id)).toBe(true);
    expect((await pinDuMembre(ctx.prisma, e.id)).pin_hash).toBe(hacherPin(neuf));
    expect((await lignesAudit(ctx.prisma, "staff.pin_unlock")).length, "un PIN expiré n'est pas un PIN verrouillé : pas de ligne de déblocage").toBe(0);
  });

  it("⛔ un PIN VERROUILLÉ est remplacé : compteur à zéro, verrou levé, et UNE ligne `staff.pin_unlock` pour ce membre — le déblocage par le mot de passe", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_TRIVIAL, { verrouille: true });
    const res = await connecter(ctx, m.pro, new Jar(), "Karim", e.password);
    expect(res.status).toBe(200);
    const neuf = pinRendu(res);
    expect(neuf.length).toBe(STAFF_LIMITS.PIN_LENGTH);
    const ligne = await pinDuMembre(ctx.prisma, e.id);
    expect(ligne.pin_locked_at).toBeNull();
    expect(ligne.pin_failed_count).toBe(0);
    const unlock = await lignesAudit(ctx.prisma, "staff.pin_unlock");
    expect(unlock).toHaveLength(1);
    expect(unlock[0]!.actor_member_id).toBe(e.id);
  });

  it("le compte au PLAFOND sans verrou posé (un arrêt entre la 3ᵉ réservation et l'écriture du verrou) est aussi un PIN verrouillé : la connexion le remplace et écrit le déblocage", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_TRIVIAL, { echecs: STAFF_LIMITS.PIN_MAX_FAILURES, verrouille: false });
    const res = await connecter(ctx, m.pro, new Jar(), "Karim", e.password);
    pinRendu(res);
    expect((await pinDuMembre(ctx.prisma, e.id)).pin_failed_count).toBe(0);
    expect((await lignesAudit(ctx.prisma, "staff.pin_unlock")).length).toBe(1);
  });

  it("⛔ un mot de passe FAUX ne rend AUCUN PIN et ne touche à aucune colonne du PIN", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_TRIVIAL, { verrouille: true });
    const avant = await pinDuMembre(ctx.prisma, e.id);
    const res = await connecter(ctx, m.pro, new Jar(), "Karim", "Mauvais-mot-de-passe-1");
    expect(res.status).toBe(401);
    expect(Object.prototype.hasOwnProperty.call(res.body, "pin")).toBe(false);
    expect(await pinDuMembre(ctx.prisma, e.id)).toEqual(avant);
  });
});

describe("⛔ K-18 — le changement de mot de passe suit la MÊME règle d'émission", () => {
  it("PIN valable : `pin: null`, colonnes inchangées, `no-store` ; PIN ABSENT : un PIN neuf est rendu et installé, `no-store`", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    const avant = await pinDuMembre(ctx.prisma, e.id);
    expect(avant.pin_hash, "le membre a reçu son PIN à sa première connexion (précondition)").not.toBeNull();
    const valable = await changerMotDePasse(ctx, m.pro, e.jar, e.password, MOT_DE_PASSE_MEMBRE_2);
    expect(valable.status, JSON.stringify(valable.body)).toBe(200);
    expect(pinDe(valable)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(valable.body, "pin")).toBe(true);
    expect(valable.headers["cache-control"]).toBe("no-store");
    expect((await pinDuMembre(ctx.prisma, e.id)).pin_hash, "le PIN valable est conservé").toBe(avant.pin_hash);

    await effacerPin(ctx.prisma, e.id);
    const absent = await changerMotDePasse(ctx, m.pro, e.jar, MOT_DE_PASSE_MEMBRE_2, e.password);
    expect(absent.status, JSON.stringify(absent.body)).toBe(200);
    const neuf = pinRendu(absent);
    expect(absent.headers["cache-control"]).toBe("no-store");
    expect((await pinDuMembre(ctx.prisma, e.id)).pin_hash).toBe(hacherPin(neuf));
  });

  it("un changement REFUSÉ (mot de passe actuel faux) ne rend aucun PIN", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await effacerPin(ctx.prisma, e.id);
    const res = await changerMotDePasse(ctx, m.pro, e.jar, "Mauvais-actuel-1", MOT_DE_PASSE_MEMBRE_2);
    expect(res.status).toBe(400);
    expect(Object.prototype.hasOwnProperty.call(res.body, "pin")).toBe(false);
    expect((await pinDuMembre(ctx.prisma, e.id)).pin_hash).toBeNull();
  });
});

describe("⛔ K-21 et K-22 EFFACENT le PIN (S-105, DR5)", () => {
  it("K-21 — la réinitialisation efface les CINQ colonnes (haché, génération, échéance, compteur, verrou), révoque les appareils, termine les sessions : l'ancien PIN ne sert plus", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_DE_TEST, { echecs: 2 });
    const reset = await appeler(ctx, m.pro.token, m.jar, "post", `/api/v1/pro/staff/members/${e.id}/reset-password`);
    expect(reset.status, JSON.stringify(reset.body)).toBe(200);
    expect(await pinDuMembre(ctx.prisma, e.id)).toEqual({ pin_hash: null, pin_generated_at: null, pin_expires_at: null, pin_failed_count: 0, pin_locked_at: null });
    expect((await connecterParPin(ctx, m.pro, posteDe(e.jar), e.id, PIN_DE_TEST)).status).toBe(401);
    expect((await sessionsDuMembre(ctx.prisma, e.id)).every((s) => s.ended_at !== null)).toBe(true);
  });

  it("K-21 sur un PIN VERROUILLÉ : le verrou est levé avec le PIN (le membre se reconnecte par son temporaire et reçoit un PIN neuf)", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_DE_TEST, { verrouille: true });
    const reset = await appeler(ctx, m.pro.token, m.jar, "post", `/api/v1/pro/staff/members/${e.id}/reset-password`);
    const temporaire = (reset.body as { temporaryPassword: string }).temporaryPassword;
    const connexion = await connecter(ctx, m.pro, new Jar(), "Karim", temporaire);
    expect(connexion.status).toBe(200);
    pinRendu(connexion); // après la réinitialisation le PIN est ABSENT : un PIN neuf est rendu
  });

  it("K-22 — la désactivation efface les CINQ colonnes du PIN", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_DE_TEST, { echecs: 1 });
    const res = await appeler(ctx, m.pro.token, m.jar, "post", `/api/v1/pro/staff/members/${e.id}/disable`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await pinDuMembre(ctx.prisma, e.id)).toEqual({ pin_hash: null, pin_generated_at: null, pin_expires_at: null, pin_failed_count: 0, pin_locked_at: null });
  });

  it("une désactivation RÉPÉTÉE (déjà désactivé) n'écrit rien : le PIN posé APRÈS la première désactivation n'est pas effacé par la seconde (aucune écriture)", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await appeler(ctx, m.pro.token, m.jar, "post", `/api/v1/pro/staff/members/${e.id}/disable`);
    await poserPin(ctx, e.id, PIN_DE_TEST);
    const encore = await appeler(ctx, m.pro.token, m.jar, "post", `/api/v1/pro/staff/members/${e.id}/disable`);
    expect(encore.status).toBe(200);
    expect((await pinDuMembre(ctx.prisma, e.id)).pin_hash, "la répétition n'a rien écrit").not.toBeNull();
  });
});

describe("⛔ MP-27 (R-6 de D341) — un appareil n'est JAMAIS valable au-delà du PIN", () => {
  it("un membre dont le PIN expire dans DIX jours se connecte depuis un poste NEUF : l'appareil créé expire AVEC le PIN, pas 90 jours plus tard", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    await poserPin(ctx, e.id, PIN_DE_TEST, { valideSecondes: 10 * 86_400 });
    const res = await connecter(ctx, m.pro, new Jar(), "Karim", e.password);
    expect(res.status).toBe(200);
    expect(pinDe(res), "le PIN est valable : aucun PIN neuf").toBeNull();
    const appareils = await appareilsAvecEcheance(ctx.prisma, e.id);
    const echeanceDuPin = (await pinDuMembre(ctx.prisma, e.id)).pin_expires_at!.getTime();
    expect(appareils.length, "un second appareil a été créé (poste neuf)").toBe(2);
    const neuf = appareils[appareils.length - 1]!;
    expect(neuf.expires_at.getTime(), "l'appareil neuf expire AU PLUS TARD avec le PIN").toBeLessThanOrEqual(echeanceDuPin);
    expect(neuf.expires_at.getTime()).toBe(echeanceDuPin);
  });

  it("un membre SANS PIN valable : le PIN neuf et l'appareil neuf naissent dans la même transaction, avec la même échéance", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const cree = await creerMembre(ctx, m.pro, m.jar, "Lina");
    const res = await connecter(ctx, m.pro, new Jar(), "Lina", cree.temporaryPassword);
    pinRendu(res);
    const appareils = await appareilsAvecEcheance(ctx.prisma, cree.id);
    expect(appareils).toHaveLength(1);
    expect(appareils[0]!.expires_at.getTime()).toBe((await pinDuMembre(ctx.prisma, cree.id)).pin_expires_at!.getTime());
  });
});

describe("⛔ le plafond d'essais est celui de la CHECK de la base (l'autorité est la migration, D186)", () => {
  it("`pin_failed_count = PIN_MAX_FAILURES` est ACCEPTÉ ; `PIN_MAX_FAILURES + 1` est REFUSÉ par la base (SQLSTATE 23514, `pro_staff_members_pin_failed_count_range`)", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const au = STAFF_LIMITS.PIN_MAX_FAILURES;
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET pin_failed_count = ${au}::int WHERE id = ${m.membreId}::uuid`;
    expect((await pinDuMembre(ctx.prisma, m.membreId)).pin_failed_count).toBe(au);
    let code: string | undefined;
    let message = "";
    try {
      await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET pin_failed_count = ${au + 1}::int WHERE id = ${m.membreId}::uuid`;
    } catch (e) {
      message = String((e as Error).message);
      code = (e as { meta?: { code?: string } }).meta?.code ?? (message.includes("23514") ? "23514" : undefined);
    }
    expect(code, `la base devait refuser : ${message}`).toBe("23514");
    expect(message).toContain("pin_failed_count_range");
  });
});
