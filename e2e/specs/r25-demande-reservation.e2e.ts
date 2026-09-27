import { expect, test } from "@playwright/test";
import { Client } from "pg";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT, DATABASE_URL } from "../playwright.config";
import { createPublishedVenue, createVerifiedAccount, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 25 (D316), DÉFAUT 1 — LA DEMANDE DE RÉSERVATION QUI NE PART PAS.
 *
 * Mesuré par D315 : le panneau demandait 182 jours de disponibilités, le
 * contrat en refuse plus de 92 (bornes incluses, D147) ; le 400 devenait `null`,
 * `null` s'affichait « aucune date », rien n'était sélectionnable. L'API, elle,
 * acceptait la demande. Aucune porte ne l'a vu : aucune spec ne chargeait la
 * fiche salle, et le test du panneau avait un double de `fetch` indifférent à
 * l'URL.
 *
 * Ce que cette spec joue, c'est le PARCOURS, pas un composant : un client
 * connecté ouvre une salle depuis la recherche, choisit une date, envoie sa
 * demande, voit la confirmation — et la demande existe en base.
 *
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés : un
 * attendu tapé à la main accuse à tort (AGENTS.md, « aucune valeur attendue ne
 * s'écrit de mémoire »).
 */
const B = fr.venueDetail.booking;
const DATE_EN_TETE = /^\s*\d{4}-\d{2}-\d{2} · /;

test.beforeAll(() => {
  seedReferentials();
});

test("un client ouvre une salle, choisit une date, envoie sa demande et voit la confirmation", async ({ browser }) => {
  const salle = await createPublishedVenue();
  const client = await createVerifiedAccount("CLIENT");
  const contexte = await browser.newContext();
  await loginContext(contexte, client);
  const page = await contexte.newPage();

  // Ouvrir la salle DEPUIS la recherche, comme un visiteur.
  await page.goto(`${CLIENT}/fr/salles`);
  await page.locator(`a[href$="/salles/${salle.slug}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/fr/salles/${salle.slug}$`));

  const panneau = page.getByRole("region", { name: B.title });
  await expect(panneau.getByText(B.loading)).toHaveCount(0);
  // Le défaut mesuré : le panneau affichait « aucune date » sur une salle qui
  // en a. Cette assertion le NOMME au lieu de laisser un clic expirer.
  await expect(panneau.getByText(B.none), "le panneau affiche « aucune date » sur une salle publiée qui en a").toHaveCount(0);
  const date = panneau.getByRole("button", { name: DATE_EN_TETE }).first();
  await expect(date).toBeVisible();
  await expect(date).toBeEnabled();
  await date.click();

  await panneau.getByLabel(B.guests, { exact: true }).fill("150");
  await panneau.getByLabel(B.firstName, { exact: true }).fill("Amina");
  await panneau.getByLabel(B.lastName, { exact: true }).fill("Bensalem");
  await panneau.getByLabel(B.phone, { exact: true }).fill("+213550000001");
  await panneau.getByRole("button", { name: B.submit }).click();

  // ⚠ Envoyée, la demande se rend dans une AUTRE section, sans `aria-labelledby`
  // (le formulaire a disparu) : la région nommée n'existe plus. Premier jet de
  // cette spec : le statut cherché DANS la région — la capture montrait la
  // confirmation, le localisateur ne la trouvait pas. On la cherche dans la page.
  await expect(page.getByRole("status").filter({ hasText: B.sent })).toBeVisible();

  // Et la demande EXISTE : un écran de confirmation sans ligne en base serait
  // une confirmation mensongère.
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM bookings b JOIN venues v ON v.id = b.venue_id
        WHERE v.slug = $1 AND b.status = 'PENDING'`,
      [salle.slug]
    );
    expect(Number(rows[0]!.n)).toBe(1);
  } finally {
    await db.end();
  }
  await contexte.close();
});
