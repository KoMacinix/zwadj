import { expect, test } from "@playwright/test";
import { CLIENT, PRO } from "../playwright.config";
import {
  NetworkCounter,
  corruptRefreshCookie,
  createVerifiedAccount,
  liveSessionCount,
  loginContext,
  settle
} from "../fixtures/harness";

/**
 * A1 — BOOTSTRAP DE SESSION.
 *
 * C'est le test qui aurait dû exister avant D115. Le mutex single-flight était
 * couvert côté unitaire, mais seulement sur le chemin « rejeu après 401 » :
 * `bootstrap()` appelait le réseau en direct, hors mutex, et rien ne le voyait.
 * Il fallait un vrai navigateur pour que ça se remarque.
 *
 * ⚠ Cadrage rectifié : dans `apps/client`, `/` et `/salles` sont PUBLIQUES.
 * Elles déclenchent quand même un refresh, parce que `AuthProvider` vit dans
 * le layout — donc sur toutes les pages. C'est ce qui rend le défaut si large :
 * il ne se limitait pas aux écrans protégés.
 */

test.describe("A1 — bootstrap de session", () => {
  test("Pro : rechargement direct d'une route protégée = UN SEUL POST /auth/refresh", async ({ browser }) => {
    const account = await createVerifiedAccount("PRO");
    const context = await browser.newContext();
    await loginContext(context, account);

    const page = await context.newPage();
    const net = NetworkCounter.watch(page);
    await page.goto(`${PRO}/`);
    await settle(page);

    expect(net.count("/auth/refresh", "POST"), `appels observés :\n${net.dump()}`).toBe(1);
    // Session active : la garde `RequireProSession` n'a PAS redirigé.
    await expect(page).not.toHaveURL(/\/auth\/connexion/);
    await context.close();
  });

  test("Client : rechargement d'une page publique déclenche aussi UN SEUL refresh", async ({ browser }) => {
    // `/salles` est publique — et pourtant elle bootstrap. Le compteur doit
    // valoir 1, pas 0 : on vérifie que le bootstrap a bien lieu (sinon un
    // utilisateur connecté verrait un en-tête anonyme), et pas 2.
    const account = await createVerifiedAccount("CLIENT");
    const context = await browser.newContext();
    await loginContext(context, account);

    const page = await context.newPage();
    const net = NetworkCounter.watch(page);
    await page.goto(`${CLIENT}/fr/salles`);
    await settle(page);

    expect(net.count("/auth/refresh", "POST"), `appels observés :\n${net.dump()}`).toBe(1);
    await context.close();
  });

  test("deux onglets rechargés quasi simultanément : AUCUN ne perd la session", async ({ browser }) => {
    // ⚠ LE CAS QUE LE MUTEX NE PEUT PAS COUVRIR. Il est par instance JS ; deux
    // onglets sont deux instances qui présentent le MÊME cookie. Avant D116,
    // l'API y voyait une réutilisation et révoquait TOUTES les sessions de
    // l'utilisateur — y compris celle de son téléphone.
    const account = await createVerifiedAccount("PRO");
    const context = await browser.newContext();
    await loginContext(context, account);

    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    const net = NetworkCounter.watch(tab1, tab2);

    await Promise.all([tab1.goto(`${PRO}/`), tab2.goto(`${PRO}/salles`)]);
    await Promise.all([settle(tab1), settle(tab2)]);

    // ⚠ DEUX refresh partent, et c'est ATTENDU : chaque onglet a son propre
    // mutex, aucun ne voit l'autre. C'est exactement pourquoi D115 ne suffisait
    // pas et pourquoi l'arbitrage devait remonter au serveur.
    expect(net.count("/auth/refresh", "POST"), `appels observés :\n${net.dump()}`).toBe(2);

    // Les deux onglets restent dans l'application.
    await expect(tab1).not.toHaveURL(/\/auth\/connexion/);
    await expect(tab2).not.toHaveURL(/\/auth\/connexion/);

    // ⚠ ET LA SESSION N'A PAS ÉTÉ RASÉE. Zéro ligne vivante = révocation en
    // masse ; plus d'une = fuite d'orphelins (D116, variante sans re-rotation).
    expect(await liveSessionCount(account.email)).toBe(1);

    // Elle survit à un troisième rechargement : ce n'est pas un sursis.
    await tab1.reload();
    await settle(tab1);
    await expect(tab1).not.toHaveURL(/\/auth\/connexion/);
    await context.close();
  });

  test("cookie refresh invalide : redirection propre vers la connexion, SANS boucle", async ({ browser }) => {
    const account = await createVerifiedAccount("PRO");
    const context = await browser.newContext();
    await loginContext(context, account);
    await corruptRefreshCookie(context);

    const page = await context.newPage();
    const net = NetworkCounter.watch(page);
    await page.goto(`${PRO}/salles`);
    await settle(page);

    await expect(page).toHaveURL(/\/auth\/connexion/);
    // ⚠ « SANS BOUCLE » se mesure : un refresh raté qui relance un refresh
    // raté produit une avalanche silencieuse — l'utilisateur voit une page
    // figée, le serveur prend la charge. Un seul essai, pas de rejeu.
    expect(net.count("/auth/refresh", "POST"), `appels observés :\n${net.dump()}`).toBe(1);

    // Et on RESTE sur la connexion : pas d'aller-retour perpétuel.
    await page.waitForTimeout(1_500);
    await expect(page).toHaveURL(/\/auth\/connexion/);
    expect(net.count("/auth/refresh", "POST")).toBe(1);
    await context.close();
  });
});
