// Intégration — rang 58, L36-3b (D356, R-3, MP-1) : LES COURSES DU PIN, sur PostgreSQL réel. CHEMIN D'IDENTITÉ : méthode RENFORCÉE.
//
// ⛔ LE CONTRÔLE (R-3, patron de D355) : la connexion par PIN ne s'ouvre que si, SOUS VERROU, dans le CAS de la transaction qui ouvre la session, le PIN haché, `pin_locked_at` nul, le membre actif et l'APPAREIL vivant
// sont toujours ceux de la vérification. La séquence est « RÉSERVER l'essai (qui rend le haché lu) → vérifier le PIN → OUVRIR avec ce haché ». Ce qui tombe ENTRE la réservation et l'ouverture — une réinitialisation, une
// désactivation, un déblocage par mot de passe, le verrouillage par un autre échec, la révocation de l'appareil — doit faire REFUSER l'ouverture.
//
// ⛔ TROIS FORMES (D117, D121 : « le cas SÉQUENTIEL peut rendre un refus correct pendant que le cas CONCURRENT passe ») : SÉQUENTIELLE (l'événement est TERMINÉ avant l'ouverture : un contrôle fait AVANT la transaction la
// rendrait verte) ; ENTRELACEMENT FORCÉ (`row-lock.ts` : une transaction tenue HORS du service écrit le changement sans le valider, l'ouverture part et ATTEND derrière le verrou, puis il tombe : seul un prédicat évalué
// DANS le CAS refuse) ; PAR LA ROUTE (vingt requêtes parallèles). ⛔ UN TÉMOIN POSITIF : sans événement intercalé la session s'ouvre (une garde qui refuserait TOUT passerait tous les cas négatifs).
// ⚠ Les verdicts passent par `expect` de vitest (assertions natives), jamais par `.expect(<statut>)` de supertest (D305, D352).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { STAFF_LIMITS } from "@zwadj/types";
import { STAFF_STORE, type OpenPinSessionResult, type StaffStore } from "../../src/staff/staff-store.types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { holdRow, waitBlocked } from "./row-lock";
import {
  AUTRE_PIN_DE_TEST,
  PIN_DE_TEST,
  appeler,
  connecterParPin,
  hacherPin,
  lignesAudit,
  membreActif,
  membreParId,
  pinDuMembre,
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

async function monde() {
  await truncateAll(ctx.prisma);
  const m = await proActive(ctx);
  const e = await membreActif(ctx, m.pro, m.jar, "Karim");
  await poserPin(ctx, e.id);
  const appareil = e.jar.appareils()[0]!;
  const magasin = ctx.app.get<StaffStore>(STAFF_STORE);
  const poste = () => posteDe(e.jar);
  const lignesDeSession = async (): Promise<number> => (await sessionsDuMembre(ctx.prisma, e.id)).length;
  const vivantes = async (): Promise<number> => (await sessionsDuMembre(ctx.prisma, e.id)).filter((s) => s.ended_at === null).length;
  const connexionsEcrites = async (): Promise<number> => (await lignesAudit(ctx.prisma, "staff.pin_login")).filter((l) => l.actor_member_id === e.id).length;
  /** La RÉSERVATION de l'essai, telle que `pinLogin` la fait : elle rend le haché lu. Une réservation refusée n'est pas le cas mesuré ici : c'est une assertion. */
  const reserver = async (): Promise<string> => {
    const r = await magasin.reservePinAttempt({ proProfileId: m.pro.proProfileId, memberId: e.id, deviceTokenHashes: [sha256(appareil.value)] });
    expect(r.reserved, "la réservation de l'essai devait être accordée").toBe(true);
    return r.reserved ? r.pinHash : "";
  };
  /** `openSessionByPin` avec le haché lu à la réservation — exactement l'appel que `pinLogin` fait après la vérification. */
  const ouvrir = (hacheLu: string, jeton: string): Promise<OpenPinSessionResult> =>
    magasin.openSessionByPin({
      actor: { userId: m.pro.userId, role: "PRO" },
      proProfileId: m.pro.proProfileId,
      memberId: e.id,
      expectedPinHash: hacheLu,
      sessionTokenHash: sha256(jeton),
      candidateDeviceHashes: [sha256(appareil.value)]
    });
  const appareilId = async (): Promise<string> => (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices WHERE member_id = ${e.id}::uuid`)[0]!.id;
  return { m, e, magasin, poste, lignesDeSession, vivantes, connexionsEcrites, reserver, ouvrir, appareilId };
}

/** Le même entrelacement FORCÉ pour chaque événement : le changement est écrit par une transaction tenue hors du service et NON validée ; l'ouverture part, ATTEND derrière le verrou de la ligne, puis le verrou tombe. */
async function ouvrirPendantQue(
  w: Awaited<ReturnType<typeof monde>>,
  table: "pro_staff_members" | "pro_staff_devices",
  id: string,
  evenement: (tx: Parameters<NonNullable<Parameters<typeof holdRow>[3]>>[0]) => Promise<void>,
  hacheLu: string,
  jeton: string
): Promise<OpenPinSessionResult> {
  const verrou = holdRow(ctx.prisma, table, id, evenement);
  await verrou.ready;
  const ouverture = w.ouvrir(hacheLu, jeton);
  try {
    await waitBlocked(ctx.prisma, 1);
  } finally {
    verrou.release();
  }
  await verrou.done;
  return ouverture;
}

describe("⛔ le TÉMOIN POSITIF — sans événement intercalé, la connexion par PIN s'ouvre (une garde qui refuserait TOUT passerait les cas négatifs)", () => {
  it("réservation → ouverture avec le haché lu : acceptée, UNE session de plus, une ligne `staff.pin_login`, le compteur remis à zéro", async () => {
    const w = await monde();
    const lu = await w.reserver();
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count, "la réservation a compté l'essai").toBe(1);
    const avant = await w.lignesDeSession();
    const ecrites = await w.connexionsEcrites();
    const ouverte = await w.ouvrir(lu, "jeton-temoin-positif");
    expect(ouverte.ok, "sans événement intercalé, l'ouverture est acceptée").toBe(true);
    expect(await w.lignesDeSession()).toBe(avant + 1);
    expect(await w.connexionsEcrites()).toBe(ecrites + 1);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count, "l'ouverture remet le compteur à zéro").toBe(0);
  });
});

describe("⛔ MP-1 — vingt essais PARALLÈLES : exactement TROIS comptés, exactement TROIS vérifications, dix-sept refus non comptés", () => {
  it("vingt PIN FAUX en parallèle par la route : le compteur vaut TROIS, le HMAC réel est calculé TROIS fois et le factice DIX-SEPT, le verrou est posé UNE fois, les sessions du membre sont terminées", async () => {
    const w = await monde();
    // Importé ICI (et non en tête de fichier) : le hacheur est le SEUL objet de l'application que ces tests espionnent ; le reste du fichier ne dépend pas de lui.
    const { StaffPinHasher } = await import("../../src/staff/staff-pin-hasher");
    const hacheur = ctx.app.get(StaffPinHasher);
    const reel = vi.spyOn(hacheur, "verify");
    const factice = vi.spyOn(hacheur, "verifyAgainstDummy");
    const reponses = await Promise.all(Array.from({ length: 20 }, () => connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0482")));
    const statuts = reponses.map((r) => r.status);
    expect(statuts.filter((s) => s === 401).length, `statuts : ${statuts.join(",")}`).toBe(20);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_failed_count, "exactement TROIS essais comptés (le plafond), pas vingt").toBe(STAFF_LIMITS.PIN_MAX_FAILURES);
    expect(reel.mock.calls.length, "TROIS vérifications du vrai haché — un compteur incrémenté APRÈS la vérification en laisserait vingt").toBe(STAFF_LIMITS.PIN_MAX_FAILURES);
    expect(factice.mock.calls.length, "les dix-sept autres paient le factice").toBe(20 - STAFF_LIMITS.PIN_MAX_FAILURES);
    expect(pin.pin_locked_at, "le verrou est posé").not.toBeNull();
    expect((await lignesAudit(ctx.prisma, "staff.pin_login_failed")).length, "une ligne d'échec par essai compté").toBe(STAFF_LIMITS.PIN_MAX_FAILURES);
    expect((await lignesAudit(ctx.prisma, "staff.pin_lock")).length, "UNE seule ligne de verrouillage").toBe(1);
    expect(await w.vivantes(), "le verrouillage a terminé les sessions du membre").toBe(0);
  });

  it("vingt PIN JUSTES en parallèle : jamais plus de TROIS vérifications, jamais plus de sessions que de succès, le membre n'est PAS verrouillé, le compteur finit à zéro", async () => {
    const w = await monde();
    // Importé ICI (et non en tête de fichier) : le hacheur est le SEUL objet de l'application que ces tests espionnent ; le reste du fichier ne dépend pas de lui.
    const { StaffPinHasher } = await import("../../src/staff/staff-pin-hasher");
    const hacheur = ctx.app.get(StaffPinHasher);
    const reel = vi.spyOn(hacheur, "verify");
    const vivantesAvant = await w.vivantes();
    const reponses = await Promise.all(Array.from({ length: 20 }, () => connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST)));
    const reussites = reponses.filter((r) => r.status === 200).length;
    expect(reponses.every((r) => r.status === 200 || r.status === 401), reponses.map((r) => r.status).join(",")).toBe(true);
    expect(reel.mock.calls.length, "au plus TROIS vérifications").toBeLessThanOrEqual(STAFF_LIMITS.PIN_MAX_FAILURES);
    expect(reussites, "au moins un succès (le PIN est juste)").toBeGreaterThanOrEqual(1);
    expect((await w.vivantes()) - vivantesAvant, "autant de sessions neuves que de succès").toBe(reussites);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_locked_at, "des PIN justes ne verrouillent pas").toBeNull();
    expect(pin.pin_failed_count, "chaque succès remet le compteur à zéro").toBe(0);
  });
});

describe("⛔ R-3 — « PIN ‖ réinitialisation » : un PIN vérifié AVANT une réinitialisation n'ouvre AUCUNE session APRÈS elle", () => {
  it("séquentiel : réservation → réinitialisation par la VRAIE route K-21 → ouverture avec le haché lu : REFUSÉE, aucune session de plus, aucune ligne `staff.pin_login`", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const ecrites = await w.connexionsEcrites();
    const reset = await appeler(ctx, w.m.pro.token, w.m.jar, "post", `/api/v1/pro/staff/members/${w.e.id}/reset-password`);
    expect(reset.status, "la réinitialisation devait réussir (précondition de la mesure)").toBe(200);
    const apres = await w.lignesDeSession();
    const ouverte = await w.ouvrir(lu, "jeton-apres-reinitialisation");
    expect(ouverte.ok, "l'ouverture, avec le haché de l'ANCIEN PIN, doit être refusée").toBe(false);
    expect(await w.lignesDeSession(), "aucune ligne de session de plus").toBe(apres);
    expect(apres, "(témoin) la réinitialisation n'a pas ajouté de session").toBe(avant);
    expect(await w.vivantes(), "aucune session vivante").toBe(0);
    expect(await w.connexionsEcrites()).toBe(ecrites);
  });

  it("⛔ ENTRELACEMENT FORCÉ — le PIN est effacé par une transaction tenue hors du service ; l'ouverture ATTEND derrière le verrou, puis est REFUSÉE à la libération (le prédicat est dans le CAS, pas avant)", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const resultat = await ouvrirPendantQue(
      w,
      "pro_staff_members",
      w.e.id,
      async (tx) => {
        await tx.$executeRaw`UPDATE pro_staff_members SET pin_hash = NULL, pin_generated_at = NULL, pin_expires_at = NULL, pin_failed_count = 0, pin_locked_at = NULL WHERE id = ${w.e.id}::uuid`;
      },
      lu,
      "jeton-entrelace-reinitialisation"
    );
    expect(resultat.ok, "l'ouverture, qui attendait derrière l'effacement du PIN, doit relire la ligne et être REFUSÉE").toBe(false);
    expect(await w.lignesDeSession()).toBe(avant);
  });
});

describe("⛔ R-3 — « PIN ‖ désactivation » : un membre désactivé entre la réservation et l'ouverture n'ouvre AUCUNE session", () => {
  it("séquentiel : réservation → désactivation par la VRAIE route K-22 → ouverture : REFUSÉE", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const res = await appeler(ctx, w.m.pro.token, w.m.jar, "post", `/api/v1/pro/staff/members/${w.e.id}/disable`);
    expect(res.status, "la désactivation devait réussir (précondition)").toBe(200);
    const ouverte = await w.ouvrir(lu, "jeton-apres-desactivation");
    expect(ouverte.ok, "un membre désactivé ne se connecte pas").toBe(false);
    expect(await w.lignesDeSession()).toBe(avant);
    expect((await membreParId(ctx.prisma, w.e.id)).status).toBe("DISABLED");
  });

  it("⛔ ENTRELACEMENT FORCÉ — le statut est éteint par une transaction tenue hors du service ; l'ouverture ATTEND, puis est REFUSÉE", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const resultat = await ouvrirPendantQue(
      w,
      "pro_staff_members",
      w.e.id,
      async (tx) => {
        await tx.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${w.e.id}::uuid`;
      },
      lu,
      "jeton-entrelace-desactivation"
    );
    expect(resultat.ok).toBe(false);
    expect(await w.lignesDeSession()).toBe(avant);
  });
});

describe("⛔ R-3 — « PIN ‖ déblocage par mot de passe » et « PIN ‖ verrouillage par un autre échec »", () => {
  it("⛔ ENTRELACEMENT FORCÉ — un PIN NEUF remplace le haché (le déblocage par mot de passe) pendant que l'ouverture attend : REFUSÉE — l'ancien PIN est mort, même vérifié avant", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const autreHache = hacherPin(AUTRE_PIN_DE_TEST);
    const resultat = await ouvrirPendantQue(
      w,
      "pro_staff_members",
      w.e.id,
      async (tx) => {
        await tx.$executeRaw`
          UPDATE pro_staff_members SET pin_hash = ${autreHache}, pin_generated_at = now(), pin_expires_at = now() + make_interval(days => 90), pin_failed_count = 0, pin_locked_at = NULL
           WHERE id = ${w.e.id}::uuid`;
      },
      lu,
      "jeton-entrelace-deblocage"
    );
    expect(resultat.ok).toBe(false);
    expect(await w.lignesDeSession()).toBe(avant);
  });

  it("⛔ ENTRELACEMENT FORCÉ — un AUTRE échec pose le VERROU pendant que l'ouverture attend : REFUSÉE (`pin_locked_at` nul exigé SOUS verrou, R-3)", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const resultat = await ouvrirPendantQue(
      w,
      "pro_staff_members",
      w.e.id,
      async (tx) => {
        await tx.$executeRaw`UPDATE pro_staff_members SET pin_locked_at = now(), pin_failed_count = ${STAFF_LIMITS.PIN_MAX_FAILURES}::int WHERE id = ${w.e.id}::uuid`;
      },
      lu,
      "jeton-entrelace-verrou"
    );
    expect(resultat.ok, "verrouillé entre la vérification et l'ouverture : le bon PIN ne passe plus").toBe(false);
    expect(await w.lignesDeSession()).toBe(avant);
  });

  it("⛔ ENTRELACEMENT FORCÉ — le PIN EXPIRE pendant que l'ouverture attend : REFUSÉE (l'échéance est relue sous verrou, avec l'heure de la base)", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const resultat = await ouvrirPendantQue(
      w,
      "pro_staff_members",
      w.e.id,
      async (tx) => {
        await tx.$executeRaw`UPDATE pro_staff_members SET pin_expires_at = now() - interval '1 second' WHERE id = ${w.e.id}::uuid`;
      },
      lu,
      "jeton-entrelace-expiration"
    );
    expect(resultat.ok).toBe(false);
    expect(await w.lignesDeSession()).toBe(avant);
  });
});

describe("⛔ R-3 — « PIN ‖ appareil révoqué » : l'appareil se re-vérifie SOUS verrou, et le refus ANNULE toute la transaction", () => {
  it("⛔ ENTRELACEMENT FORCÉ — l'appareil est révoqué par une transaction tenue hors du service ; l'ouverture (qui a déjà passé le CAS du membre) ATTEND sur l'appareil, puis est REFUSÉE ; RIEN n'est écrit : ni session, ni `last_login_at`, ni remise à zéro du compteur, ni ligne `staff.pin_login`", async () => {
    const w = await monde();
    const lu = await w.reserver();
    const avant = await w.lignesDeSession();
    const membreAvant = await membreParId(ctx.prisma, w.e.id);
    const pinAvant = await pinDuMembre(ctx.prisma, w.e.id);
    const ecrites = await w.connexionsEcrites();
    const resultat = await ouvrirPendantQue(
      w,
      "pro_staff_devices",
      await w.appareilId(),
      async (tx) => {
        await tx.$executeRaw`UPDATE pro_staff_devices SET revoked_at = now() WHERE member_id = ${w.e.id}::uuid`;
      },
      lu,
      "jeton-entrelace-appareil"
    );
    expect(resultat.ok, "l'appareil a été révoqué entre la vérification et l'ouverture : refusée").toBe(false);
    expect(await w.lignesDeSession(), "aucune session de plus").toBe(avant);
    expect((await membreParId(ctx.prisma, w.e.id)).last_login_at?.getTime() ?? null, "la transaction est ANNULÉE : `last_login_at` n'est pas écrit").toBe(membreAvant.last_login_at?.getTime() ?? null);
    expect((await pinDuMembre(ctx.prisma, w.e.id)).pin_failed_count, "le compteur reste tel que la réservation l'a laissé (annulation complète)").toBe(pinAvant.pin_failed_count);
    expect(await w.connexionsEcrites(), "aucune ligne `staff.pin_login` pour une action qui n'a pas eu lieu").toBe(ecrites);
  });
});
