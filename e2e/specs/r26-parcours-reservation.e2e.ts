import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT, PRO } from "../playwright.config";
import { createPublishedVenue, createVerifiedAccount, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 26 (D317) — LE PARCOURS DE RÉSERVATION, JOUÉ DE BOUT EN BOUT.
 *
 * Arbitrage de Ko : « le client envoie sa demande, le pro la voit, l'accepte ou la refuse, le client voit le
 * résultat ». Chaque moitié avait ses tests — le panneau de demande, la liste du pro, la section « Mes réservations » —
 * et AUCUNE spec ne les enchaînait : une demande pouvait partir sans jamais atteindre le pro, ou la réponse du pro ne
 * jamais revenir au client, toutes portes vertes. C'est exactement ce que D315 a trouvé sur le panneau, huit semaines
 * après sa livraison.
 *
 * ⛔ CHEMIN DE L'ARGENT : CES SPECS L'EXERCENT SANS LE MODIFIER (décision 2 du relecteur, D317). Accepter et refuser
 * sont des transitions (branche 2) ; « Acceptée — acompte à régler », que le client lit ensuite, est une instruction de
 * paiement (branche 6). Un défaut qu'elles révéleraient se RAPPORTE ; il ne se corrige pas ici.
 *
 * ⚠ DEUX BRAS PAR STATUT CÔTÉ CLIENT (MD2-b). Le libellé attendu APRÈS la réponse du pro est d'abord exigé ABSENT, par le
 * même localisateur, pendant que la demande est en attente. C'est la preuve que l'assertion discrimine : le harnais du lot
 * ne mute pas la section client — elle présente les montants et l'instruction de paiement.
 *
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés (MD2-e). Chaque test crée SA salle, SON pro et SON
 * client (MD2-d) : une ligne se choisit par ce que le test a écrit — le nom de la salle, le nom du contact —, jamais par
 * son rang dans une liste.
 */
const B = fr.venueDetail.booking;
const SUIVI = fr.account.ui.bookings;
const DEMANDES = fr.venue.ui.requests;
const DATE_EN_TETE = /^\s*\d{4}-\d{2}-\d{2} · /;
const CONTACT = { prenom: "Amina", nom: "Bensalem" };

/** Ce que le pro lit dans la ligne : « Statut : {status} », interpolé comme l'application le fait (accolade simple,
 *  `apps/pro/src/i18n.ts`). Dérivé du message, pas tapé. */
const statutPro = (libelle: string): string => DEMANDES.status.replace("{status}", libelle);

type Salle = Awaited<ReturnType<typeof createPublishedVenue>>;

interface EnAttente {
  salle: Salle;
  contexteClient: BrowserContext;
  pageClient: Page;
  contextePro: BrowserContext;
  pagePro: Page;
  lignePro: Locator;
}

test.beforeAll(() => {
  seedReferentials();
});

/** La ligne de la demande dans « Mes réservations », relue depuis le serveur (la page est rechargée). */
async function ligneClient(page: Page, salle: Salle): Promise<Locator> {
  await page.goto(`${CLIENT}/fr/compte`);
  const suivi = page.getByRole("region", { name: SUIVI.title });
  await expect(suivi.getByText(SUIVI.loading)).toHaveCount(0);
  return suivi.getByRole("listitem").filter({ hasText: salle.nameFr });
}

/**
 * Le tronc commun : le client envoie sa demande depuis la fiche, la retrouve EN ATTENTE dans son suivi ; le pro la voit
 * dans ses demandes, en attente, avec les deux réponses possibles.
 */
async function demandeEnAttente(browser: Browser): Promise<EnAttente> {
  const salle = await createPublishedVenue();
  const client = await createVerifiedAccount("CLIENT");

  // ── Le client envoie sa demande, depuis la recherche, comme un visiteur.
  const contexteClient = await browser.newContext();
  await loginContext(contexteClient, client);
  const pageClient = await contexteClient.newPage();
  await pageClient.goto(`${CLIENT}/fr/salles`);
  await pageClient.locator(`a[href$="/salles/${salle.slug}"]`).first().click();
  await expect(pageClient).toHaveURL(new RegExp(`/fr/salles/${salle.slug}$`));
  const panneau = pageClient.getByRole("region", { name: B.title });
  await expect(panneau.getByText(B.loading)).toHaveCount(0);
  const date = panneau.getByRole("button", { name: DATE_EN_TETE }).first();
  await expect(date).toBeEnabled();
  await date.click();
  await panneau.getByLabel(B.guests, { exact: true }).fill("150");
  await panneau.getByLabel(B.firstName, { exact: true }).fill(CONTACT.prenom);
  await panneau.getByLabel(B.lastName, { exact: true }).fill(CONTACT.nom);
  await panneau.getByLabel(B.phone, { exact: true }).fill("+213550000001");
  await panneau.getByRole("button", { name: B.submit }).click();
  await expect(pageClient.getByRole("status").filter({ hasText: B.sent })).toBeVisible();

  // ── Il la retrouve dans son suivi, EN ATTENTE — et PAS encore acceptée ni refusée (bras négatifs, MD2-b).
  const avant = await ligneClient(pageClient, salle);
  await expect(avant).toHaveCount(1);
  await expect(avant.getByText(SUIVI.st_PENDING, { exact: true })).toBeVisible();
  await expect(avant.getByText(SUIVI.st_ACCEPTED, { exact: true })).toHaveCount(0);
  await expect(avant.getByText(SUIVI.st_DECLINED, { exact: true })).toHaveCount(0);

  // ── Le pro la voit dans SES demandes, en attente, avec les deux réponses.
  const contextePro = await browser.newContext();
  await loginContext(contextePro, salle.pro);
  const pagePro = await contextePro.newPage();
  await pagePro.goto(`${PRO}/demandes`);
  await expect(pagePro.getByRole("heading", { name: DEMANDES.title, exact: true })).toBeVisible();
  const lignePro = pagePro.getByRole("listitem").filter({ hasText: `${CONTACT.prenom} ${CONTACT.nom}` });
  await expect(lignePro, "le pro ne voit pas la demande du client dans ses demandes").toHaveCount(1);
  await expect(lignePro.getByText(statutPro(DEMANDES.st_PENDING), { exact: true })).toBeVisible();
  await expect(lignePro.getByRole("button", { name: DEMANDES.accept, exact: true })).toBeEnabled();
  await expect(lignePro.getByRole("button", { name: DEMANDES.decline, exact: true })).toBeEnabled();

  return { salle, contexteClient, pageClient, contextePro, pagePro, lignePro };
}

test("le pro ACCEPTE : la demande quitte ses demandes pour ses réservations, et le client la voit acceptée", async ({ browser }) => {
  const d = await demandeEnAttente(browser);

  await d.lignePro.getByRole("button", { name: DEMANDES.accept, exact: true }).click();
  // Acceptée, la date est VERROUILLÉE : la ligne quitte « Demandes » pour « Réservations » (partage D131, relevé dans
  // `booking-requests-section.tsx` et les deux pages qui la montent).
  await expect(d.lignePro, "la demande acceptée reste dans « Demandes »").toHaveCount(0);
  await d.pagePro.goto(`${PRO}/reservations`);
  const reservee = d.pagePro.getByRole("listitem").filter({ hasText: `${CONTACT.prenom} ${CONTACT.nom}` });
  await expect(reservee).toHaveCount(1);
  await expect(reservee.getByText(statutPro(DEMANDES.st_ACCEPTED), { exact: true })).toBeVisible();

  // Le client voit le résultat : acceptée — et plus « en attente ».
  const apres = await ligneClient(d.pageClient, d.salle);
  await expect(apres.getByText(SUIVI.st_ACCEPTED, { exact: true }), "le client ne voit pas l'acceptation").toBeVisible();
  await expect(apres.getByText(SUIVI.st_PENDING, { exact: true })).toHaveCount(0);

  await d.contextePro.close();
  await d.contexteClient.close();
});

test("le pro REFUSE : la demande reste dans ses demandes, refusée, et le client voit le refus", async ({ browser }) => {
  const d = await demandeEnAttente(browser);

  await d.lignePro.getByRole("button", { name: DEMANDES.decline, exact: true }).click();
  // Refusée, la date n'est PAS verrouillée : la ligne reste dans « Demandes », marquée, sans réponse possible.
  await expect(d.lignePro.getByText(statutPro(DEMANDES.st_DECLINED), { exact: true }), "le pro ne voit pas son refus").toBeVisible();
  await expect(d.lignePro.getByRole("button", { name: DEMANDES.accept, exact: true })).toHaveCount(0);
  await expect(d.lignePro.getByRole("button", { name: DEMANDES.decline, exact: true })).toHaveCount(0);

  // Le client voit le résultat : refusée — ni « en attente », ni acceptée.
  const apres = await ligneClient(d.pageClient, d.salle);
  await expect(apres.getByText(SUIVI.st_DECLINED, { exact: true }), "le client ne voit pas le refus").toBeVisible();
  await expect(apres.getByText(SUIVI.st_PENDING, { exact: true })).toHaveCount(0);
  await expect(apres.getByText(SUIVI.st_ACCEPTED, { exact: true })).toHaveCount(0);

  await d.contextePro.close();
  await d.contexteClient.close();
});
