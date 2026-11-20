// Intégration — rang 57 (D355), R-1 : « CONNEXION ‖ RÉINITIALISATION » et « CONNEXION ‖ DÉSACTIVATION », sur PostgreSQL réel. CHEMIN D'IDENTITÉ : méthode RENFORCÉE.
//
// ⛔ LE DÉFAUT (D354, mesuré, rapporté, non corrigé ; pièce `docs/preuves/D354/mesures/course-connexion-reinitialisation.int-spec.ts`, ICI PROMUE EN TEST) : `StaffSessionService.login` enchaîne
// « chercher le membre → RÉSERVER la tentative (qui rend le hachage lu) → VÉRIFIER le mot de passe (argon2, ~100 ms) → `openSession` ». Une réinitialisation (K-21) ou un changement de mot de passe (K-18)
// qui tombe ENTRE la réservation et `openSession` remplace le hachage et met fin à toutes les sessions — et la connexion qui avait vérifié l'ANCIEN mot de passe ouvrait alors une session que RIEN n'avait révoquée.
// Le correctif conditionne l'ouverture au hachage lu à la réservation, DANS le CAS de la transaction qui ouvre la session (la ligne du membre, L2 : ordre des verrous S-101).
//
// ⛔ CE QUE CE FICHIER MESURE, ET POURQUOI IL Y A TROIS FORMES (D117, D121 : « le cas SÉQUENTIEL peut rendre un refus correct pendant que le cas CONCURRENT passe ») :
//   · SÉQUENTIELLE (la pièce de D354) — l'événement intercalé est TERMINÉ avant l'ouverture : un contrôle fait AVANT la transaction suffirait à la rendre verte ;
//   · ENTRELACEMENT FORCÉ (patron S-243, `row-lock.ts`) — le changement est écrit par une transaction tenue HORS du service et NON validée, l'ouverture part et ATTEND derrière le verrou de la ligne, puis le
//     verrou tombe : seul un prédicat évalué DANS le CAS, sur la ligne verrouillée, refuse ici — un contrôle préalable a déjà lu l'ancien hachage et laisserait passer ;
//   · PAR LA ROUTE — la vraie `POST /pro/staff/login`, la réinitialisation tombant PENDANT la vérification de l'argon2 (la vérification est enveloppée d'un crochet de test : elle rend son vrai verdict, puis
//     la vraie route K-21 passe, puis le service reprend) — c'est la séquence que le défaut décrit, de bout en bout.
// ⛔ UN TÉMOIN POSITIF (sans événement intercalé, la connexion s'ouvre) : une garde qui refuserait TOUT passerait tous les cas négatifs ci-dessus.
//
// ⚠ Les verdicts passent par `expect` de vitest (assertions natives), jamais par `.expect(<statut>)` de supertest : celui-ci lève une `Error`, pas une `AssertionError` (D305, S-192 refusée, D352).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PasswordService } from "../../src/auth/password.service";
import { STAFF_STORE, type OpenSessionResult, type PasswordReservation, type StaffStore } from "../../src/staff/staff-store.types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { holdRow, waitBlocked } from "./row-lock";
import {
  Jar,
  appeler,
  changerMotDePasse,
  codeDe,
  connecter,
  corpsStable,
  lignesAudit,
  lireCookies,
  membreActif,
  membreParId,
  proActive,
  sessionsDuMembre,
  sha256,
  MOT_DE_PASSE_MEMBRE_2
} from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
afterEach(() => {
  // Un crochet laissé sur `PasswordService` se verrait dans le test SUIVANT, et on chercherait au mauvais endroit : il est restauré quoi qu'il arrive.
  vi.restoreAllMocks();
});

/** Un hachage qui n'est pas celui du membre : le remplacement que fait une réinitialisation ou un changement, sans en refaire un (aucun argon2 ici). */
const HACHAGE_DE_REMPLACEMENT = "$argon2id$v=19$m=65536,t=3,p=4$cmVtcGxhY2VtZW50$aGFjaGFnZS1kZS1yZW1wbGFjZW1lbnQ";

async function monde() {
  await truncateAll(ctx.prisma);
  const m = await proActive(ctx);
  const e = await membreActif(ctx, m.pro, m.jar, "Karim");
  const magasin = ctx.app.get<StaffStore>(STAFF_STORE);
  const vivantes = async (): Promise<number> => (await sessionsDuMembre(ctx.prisma, e.id)).filter((s) => s.ended_at === null).length;
  const lignesDeSession = async (): Promise<number> => (await sessionsDuMembre(ctx.prisma, e.id)).length;
  const connexionsEcrites = async (): Promise<number> => (await lignesAudit(ctx.prisma, "staff.login")).filter((l) => l.actor_member_id === e.id).length;
  /** La RÉSERVATION de la tentative, telle que `login` la fait : elle rend le hachage lu. Un refus de réserver n'est pas le cas mesuré ici : c'est une assertion. */
  const reserver = async (): Promise<string> => {
    const reservation: PasswordReservation = await magasin.reservePasswordAttempt(e.id);
    expect(reservation.reserved, "la réservation de la tentative devait être accordée").toBe(true);
    return reservation.reserved ? reservation.passwordHash : "";
  };
  /** `openSession` avec le hachage lu à la réservation — exactement l'appel que `login` fait après la vérification. */
  const ouvrir = (hachageLu: string, jeton: string): Promise<OpenSessionResult> =>
    magasin.openSession({
      actor: { userId: m.pro.userId, role: "PRO" },
      proProfileId: m.pro.proProfileId,
      memberId: e.id,
      sessionTokenHash: sha256(jeton),
      candidateDeviceHashes: [],
      newDeviceTokenHash: sha256(`${jeton}-appareil`),
      deviceLabel: "Poste",
      expectedPasswordHash: hachageLu
    });
  return { m, e, magasin, vivantes, lignesDeSession, connexionsEcrites, reserver, ouvrir };
}

describe("⛔ R-1 — « connexion ‖ réinitialisation » : un mot de passe vérifié AVANT une réinitialisation n'ouvre AUCUNE session APRÈS elle", () => {
  it("la pièce de D354, PROMUE : réservation → réinitialisation par la VRAIE route K-21 → ouverture avec le hachage lu : REFUSÉE, aucune session vivante, aucune ligne `staff.login`, `last_login_at` intact", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await membreParId(ctx.prisma, w.e.id);
    const lignesAvant = await w.lignesDeSession();
    const ecritesAvant = await w.connexionsEcrites();

    const reset = await appeler(ctx, w.m.pro.token, w.m.jar, "post", `/api/v1/pro/staff/members/${w.e.id}/reset-password`);
    expect(reset.status, "la réinitialisation par le Manager devait réussir (précondition de la mesure)").toBe(200);
    expect((await sessionsDuMembre(ctx.prisma, w.e.id)).every((s) => s.ended_at !== null), "la réinitialisation a mis fin à TOUTES les sessions du membre (précondition)").toBe(true);

    const ouverte = await w.ouvrir(lu, "jeton-apres-reinitialisation");
    expect(ouverte.ok, "l'ouverture, avec le hachage de l'ANCIEN mot de passe, doit être refusée").toBe(false);
    expect(await w.vivantes(), "aucune session vivante : rien n'a été ouvert après la réinitialisation").toBe(0);
    expect(await w.lignesDeSession(), "aucune ligne de session de plus").toBe(lignesAvant);
    expect(await w.connexionsEcrites(), "aucune ligne `staff.login` : la trace n'existe pas pour une action qui n'a pas eu lieu").toBe(ecritesAvant);
    expect((await membreParId(ctx.prisma, w.e.id)).last_login_at?.getTime() ?? null, "`last_login_at` n'est pas écrit par une ouverture refusée").toBe(avant.last_login_at?.getTime() ?? null);
  });

  it("la même séquence avec un CHANGEMENT de mot de passe par le membre (K-18, vraie route) à la place de la réinitialisation : ouverture REFUSÉE, aucune session de plus", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const lignesAvant = await w.lignesDeSession();
    const vivantesAvant = await w.vivantes();

    const changement = await changerMotDePasse(ctx, w.m.pro, w.e.jar, w.e.password, MOT_DE_PASSE_MEMBRE_2);
    expect(changement.status, "le changement de mot de passe devait réussir (précondition de la mesure)").toBe(200);

    const ouverte = await w.ouvrir(lu, "jeton-apres-changement");
    expect(ouverte.ok, "l'ouverture, avec le hachage de l'ancien mot de passe, doit être refusée").toBe(false);
    expect(await w.lignesDeSession(), "aucune ligne de session de plus (la session courante du changement reste, les autres ont pris fin)").toBe(lignesAvant);
    expect(await w.vivantes(), "le nombre de sessions vivantes est celui d'avant l'ouverture").toBe(vivantesAvant);
  });

  it("⛔ ENTRELACEMENT FORCÉ — le hachage est remplacé par une transaction tenue hors du service ; l'ouverture part, ATTEND derrière le verrou de la ligne, puis est REFUSÉE à la libération (le prédicat est dans le CAS, pas avant)", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const lignesAvant = await w.lignesDeSession();

    const verrou = holdRow(ctx.prisma, "pro_staff_members", w.e.id, async (tx) => {
      await tx.$executeRaw`UPDATE pro_staff_members SET password_hash = ${HACHAGE_DE_REMPLACEMENT}, password_changed_at = now() WHERE id = ${w.e.id}::uuid`;
    });
    await verrou.ready;
    const ouverture = w.ouvrir(lu, "jeton-entrelace-hachage");
    try {
      await waitBlocked(ctx.prisma, 1);
    } finally {
      verrou.release();
    }
    await verrou.done;
    const resultat = await ouverture;
    expect(resultat.ok, "l'ouverture, qui attendait derrière la transaction qui remplaçait le hachage, doit relire la ligne et être REFUSÉE").toBe(false);
    expect(await w.lignesDeSession(), "aucune ligne de session de plus").toBe(lignesAvant);
  });

  it("⛔ PAR LA ROUTE — `POST /pro/staff/login` dont la vérification de l'argon2 est interrompue par une réinitialisation : 401 STAFF_INVALID_CREDENTIALS, aucun cookie de session, aucune session vivante, le MÊME corps qu'un mauvais mot de passe, UN seul argon2 réel", async () => {
    const w = await monde();
    await membreActif(ctx, w.m.pro, w.m.jar, "Lina"); // un second membre, qui servira de témoin « mauvais mot de passe »
    const mots = ctx.app.get(PasswordService);
    const verifierReellement = mots.verify.bind(mots);
    const factice = vi.spyOn(mots, "verifyAgainstDummy");
    let statutDeLaReinitialisation: number | null = null;
    const espion = vi.spyOn(mots, "verify").mockImplementation(async (hash: string, clair: string) => {
      const juste = await verifierReellement(hash, clair); // le vrai verdict : l'ANCIEN mot de passe est le bon
      const reset = await appeler(ctx, w.m.pro.token, w.m.jar, "post", `/api/v1/pro/staff/members/${w.e.id}/reset-password`);
      statutDeLaReinitialisation = reset.status;
      return juste;
    });
    const vivantesAvant = await w.vivantes();
    const connexion = await connecter(ctx, w.m.pro, new Jar(), "Karim", w.e.password);
    const verificationsReelles = espion.mock.calls.length;
    const appelsFactices = factice.mock.calls.length;
    espion.mockRestore();

    expect(statutDeLaReinitialisation, "la réinitialisation est bien tombée pendant la vérification (précondition)").toBe(200);
    expect(connexion.status, JSON.stringify(connexion.body)).toBe(401);
    expect(codeDe(connexion)).toBe("STAFF_INVALID_CREDENTIALS");
    expect(lireCookies(connexion).find((c) => c.name === "zwadj_ss"), "aucun cookie de session n'est posé").toBeUndefined();
    expect(await w.vivantes(), "aucune session vivante : la réinitialisation les avait toutes terminées, la connexion n'en a pas rouvert").toBe(0);
    expect(vivantesAvant, "(témoin) le membre avait bien une session vivante avant la connexion").toBeGreaterThan(0);
    expect(verificationsReelles, "UN seul argon2 sur le vrai hachage — le coût d'un mauvais mot de passe").toBe(1);
    expect(appelsFactices, "aucun hachage factice : le refus a payé la vraie vérification").toBe(0);

    // Le MÊME refus qu'un mauvais mot de passe, à l'octet (aucune fuite d'état : le client ne sait pas POURQUOI).
    const mauvais = await connecter(ctx, w.m.pro, new Jar(), "Lina", "Mauvais-mot-de-passe-1");
    expect(mauvais.status).toBe(401);
    expect(corpsStable(connexion), "le refus d'ouverture et le refus d'un mauvais mot de passe sont identiques à l'octet").toBe(corpsStable(mauvais));
  });
});

describe("⛔ R-1 — « connexion ‖ désactivation » : un membre désactivé entre la réservation et l'ouverture n'ouvre AUCUNE session", () => {
  it("séquentiel : réservation → désactivation par la VRAIE route K-22 → ouverture : REFUSÉE, aucune session de plus, le membre reste désactivé", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const lignesAvant = await w.lignesDeSession();

    const desactivation = await appeler(ctx, w.m.pro.token, w.m.jar, "post", `/api/v1/pro/staff/members/${w.e.id}/disable`);
    expect(desactivation.status, "la désactivation par le Manager devait réussir (précondition)").toBe(200);

    const ouverte = await w.ouvrir(lu, "jeton-apres-desactivation");
    expect(ouverte.ok, "un membre désactivé ne se connecte pas").toBe(false);
    expect(await w.lignesDeSession(), "aucune ligne de session de plus").toBe(lignesAvant);
    expect(await w.vivantes(), "aucune session vivante").toBe(0);
    expect((await membreParId(ctx.prisma, w.e.id)).status).toBe("DISABLED");
  });

  it("⛔ ENTRELACEMENT FORCÉ — le statut est éteint par une transaction tenue hors du service ; l'ouverture ATTEND derrière le verrou, puis est REFUSÉE à la libération", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const lignesAvant = await w.lignesDeSession();

    const verrou = holdRow(ctx.prisma, "pro_staff_members", w.e.id, async (tx) => {
      await tx.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${w.e.id}::uuid`;
    });
    await verrou.ready;
    const ouverture = w.ouvrir(lu, "jeton-entrelace-desactivation");
    try {
      await waitBlocked(ctx.prisma, 1);
    } finally {
      verrou.release();
    }
    await verrou.done;
    const resultat = await ouverture;
    expect(resultat.ok, "l'ouverture, qui attendait derrière la désactivation, doit relire le statut et être REFUSÉE").toBe(false);
    expect(await w.lignesDeSession(), "aucune ligne de session de plus").toBe(lignesAvant);
  });
});

describe("⛔ le TÉMOIN POSITIF — sans événement intercalé, la connexion s'ouvre (une garde qui refuserait TOUT passerait les cas négatifs)", () => {
  it("réservation → ouverture avec le hachage lu : acceptée, UNE session de plus, une ligne `staff.login` pour ce membre", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const lignesAvant = await w.lignesDeSession();
    const ecritesAvant = await w.connexionsEcrites();

    const ouverte = await w.ouvrir(lu, "jeton-temoin-positif");
    expect(ouverte.ok, "sans événement intercalé, l'ouverture est acceptée").toBe(true);
    expect(await w.lignesDeSession(), "une session de plus").toBe(lignesAvant + 1);
    expect(await w.connexionsEcrites(), "une ligne `staff.login` de plus").toBe(ecritesAvant + 1);
  });

  it("par la route : un mot de passe juste, rien d'intercalé : 200, un cookie de session, une session vivante de plus", async () => {
    const w = await monde();
    const vivantesAvant = await w.vivantes();
    const connexion = await connecter(ctx, w.m.pro, new Jar(), "Karim", w.e.password);
    expect(connexion.status, JSON.stringify(connexion.body)).toBe(200);
    expect(lireCookies(connexion).find((c) => c.name === "zwadj_ss"), "le cookie de session est posé").toBeDefined();
    expect(await w.vivantes()).toBe(vivantesAvant + 1);
  });
});
