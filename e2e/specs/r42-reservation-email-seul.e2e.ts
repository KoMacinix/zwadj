import { expect, test } from "@playwright/test";
import { Client } from "pg";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT, DATABASE_URL } from "../playwright.config";
import { createPublishedVenue, createVerifiedAccount, loginContext, seedReferentials } from "../fixtures/harness";
import { choisirUneDate } from "../fixtures/panneau-reservation";

/**
 * RANG 42 (D337), L36-1 — LA RÉSERVATION PAR E-MAIL SEUL, DE BOUT EN BOUT.
 *
 * Q2 de Ko (22/10/2026) : « Une réservation est tout à fait possible avec une adresse e-mail uniquement. » Avant ce lot, le formulaire en ligne exigeait un numéro
 * (`required`, condition d'envoi), le schéma aussi, et `bookings.contact_phone` était NOT NULL.
 *
 * Ce que cette spec joue, c'est le PARCOURS dans un vrai navigateur, contre la vraie API et la vraie base : un client connecté ouvre une salle depuis la recherche,
 * choisit une date, REMPLIT SON E-MAIL ET PAS SON NUMÉRO, envoie — et la réservation existe en base avec `contact_phone` NULL et l'e-mail gardé.
 *
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés (AGENTS.md, « aucune valeur attendue ne s'écrit de mémoire »).
 */
const B = fr.venueDetail.booking;

test.beforeAll(() => {
  seedReferentials();
});

test("un client réserve avec son e-mail SEUL : le bouton s'ouvre, la demande part, et la base garde l'e-mail sans numéro", async ({ browser }) => {
  const salle = await createPublishedVenue();
  const client = await createVerifiedAccount("CLIENT");
  const contexte = await browser.newContext();
  await loginContext(contexte, client);
  const page = await contexte.newPage();

  await page.goto(`${CLIENT}/fr/salles`);
  await page.locator(`a[href$="/salles/${salle.slug}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/fr/salles/${salle.slug}$`));

  const panneau = page.getByRole("region", { name: B.title });
  await expect(panneau.getByText(B.loading)).toHaveCount(0);
  await choisirUneDate(panneau);

  await panneau.getByLabel(B.guests, { exact: true }).fill("150");
  await panneau.getByLabel(B.firstName, { exact: true }).fill("Amina");
  await panneau.getByLabel(B.lastName, { exact: true }).fill("Bensalem");

  // Ni numéro ni e-mail : le texte « l'un des deux » est VISIBLE et le bouton est inerte.
  await expect(panneau.getByText(B.contactHint)).toBeVisible();
  await expect(panneau.getByRole("button", { name: B.submit })).toBeDisabled();

  // L'e-mail SEUL ouvre le bouton ; le champ du numéro reste VIDE.
  await panneau.getByLabel(B.email, { exact: true }).fill("amina.e2e@example.dz");
  await expect(panneau.getByLabel(B.phone, { exact: true })).toHaveValue("");
  await expect(panneau.getByRole("button", { name: B.submit })).toBeEnabled();
  await panneau.getByRole("button", { name: B.submit }).click();

  await expect(page.getByRole("status").filter({ hasText: B.sent })).toBeVisible();

  // Et la demande EXISTE, SANS numéro : un écran de confirmation sans la bonne ligne en base serait une confirmation mensongère.
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query<{ contact_phone: string | null; contact_email: string | null; status: string }>(
      `SELECT b.contact_phone, b.contact_email, b.status FROM bookings b JOIN venues v ON v.id = b.venue_id WHERE v.slug = $1`,
      [salle.slug]
    );
    expect(rows).toEqual([{ contact_phone: null, contact_email: "amina.e2e@example.dz", status: "PENDING" }]);
  } finally {
    await db.end();
  }
  await contexte.close();
});

test("un e-mail SAISI et invalide retient le bouton, même avec un numéro valide — l'e-mail n'est pas une formalité", async ({ browser }) => {
  const salle = await createPublishedVenue();
  const client = await createVerifiedAccount("CLIENT");
  const contexte = await browser.newContext();
  await loginContext(contexte, client);
  const page = await contexte.newPage();

  await page.goto(`${CLIENT}/fr/salles/${salle.slug}`);
  const panneau = page.getByRole("region", { name: B.title });
  await expect(panneau.getByText(B.loading)).toHaveCount(0);
  await choisirUneDate(panneau);
  await panneau.getByLabel(B.guests, { exact: true }).fill("150");
  await panneau.getByLabel(B.firstName, { exact: true }).fill("Amina");
  await panneau.getByLabel(B.lastName, { exact: true }).fill("Bensalem");
  await panneau.getByLabel(B.phone, { exact: true }).fill("+213550000001");
  await expect(panneau.getByRole("button", { name: B.submit })).toBeEnabled();
  await panneau.getByLabel(B.email, { exact: true }).fill("amina@");
  await expect(panneau.getByText(B.emailInvalid)).toBeVisible();
  await expect(panneau.getByRole("button", { name: B.submit })).toBeDisabled();
  await contexte.close();
});
