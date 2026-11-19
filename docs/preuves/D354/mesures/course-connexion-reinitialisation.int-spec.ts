/**
 * MESURE (pas une garde, pas un test de la suite) — rang 56 (D354), DÉFAUT CROISÉ à RAPPORTER, non corrigé : une CONNEXION dont le mot de passe a été vérifié AVANT une réinitialisation (ou un changement de mot de
 * passe) peut ouvrir une session APRÈS elle. `StaffSessionService.login` enchaîne : chercher le membre → RÉSERVER la tentative (commit) → VÉRIFIER le mot de passe (argon2, ~100 ms) → `openSession`, dont le CAS ne
 * conditionne que `status = 'ACTIVE'` et la salle — jamais le hachage lu à la réservation. Entre la vérification et `openSession`, une réinitialisation (K-21) ou un changement (K-18) peut remplacer le hachage et
 * mettre fin à TOUTES les sessions : la connexion qui avait vérifié l'ANCIEN mot de passe ouvre alors une session que rien n'a révoquée.
 *
 * ⚠ La mesure joue la séquence AU NIVEAU DU MAGASIN (les trois appels que le service enchaîne), avec la vraie route pour l'événement intercalé : elle ne mesure PAS la fréquence de la course en production, seulement
 * qu'elle EST possible. Pièce versée, jamais promue en test ; jouée en copiant ce fichier dans `apps/api/test/int/` le temps d'une mesure.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STAFF_STORE, type StaffStore } from "../../src/staff/staff-store.types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { appeler, creerMembre, membreActif, proActive, sessionsDuMembre, sha256 } from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});

describe("MESURE — connexion ‖ réinitialisation", () => {
  it("une connexion dont l'ancien mot de passe a été vérifié AVANT la réinitialisation ouvre-t-elle une session APRÈS ?", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim");
    const magasin = ctx.app.get<StaffStore>(STAFF_STORE);

    // 1. la connexion : le membre est trouvé, la tentative RÉSERVÉE (le hachage lu est l'ANCIEN) — c'est ce que `login` fait avant de vérifier l'argon2
    const reservation = await magasin.reservePasswordAttempt(e.id);
    expect(reservation.reserved).toBe(true);

    // 2. PENDANT la vérification, le Manager réinitialise : TOUTES les sessions et tous les appareils du membre sont révoqués, le hachage est remplacé
    const reset = await appeler(ctx, m.pro.token, m.jar, "post", `/api/v1/pro/staff/members/${e.id}/reset-password`);
    expect(reset.status).toBe(200);
    const avant = await sessionsDuMembre(ctx.prisma, e.id);
    expect(avant.every((s) => s.ended_at !== null)).toBe(true);

    // 3. la connexion reprend (le mot de passe vérifié était l'ancien, juste) : `openSession`
    const ouverte = await magasin.openSession({
      actor: { userId: m.pro.userId, role: "PRO" },
      proProfileId: m.pro.proProfileId,
      memberId: e.id,
      sessionTokenHash: sha256("jeton-de-session-de-la-mesure"),
      candidateDeviceHashes: [],
      newDeviceTokenHash: sha256("jeton-d-appareil-de-la-mesure"),
      deviceLabel: "Poste"
    });
    const apres = await sessionsDuMembre(ctx.prisma, e.id);
    const vivantes = apres.filter((s) => s.ended_at === null).length;
    // eslint-disable-next-line no-console
    console.log(`MESURE : openSession après la réinitialisation → ok=${String(ouverte.ok)} ; sessions vivantes après = ${vivantes}`);
    void creerMembre;
    // le CONSTAT, écrit comme assertion pour que la sortie dise ce qui a été mesuré (une assertion échouée = pas de défaut)
    expect(ouverte.ok, "openSession a réussi APRÈS la réinitialisation : une session est ouverte avec l'ancien mot de passe").toBe(true);
    expect(vivantes).toBe(1);
  });
});
