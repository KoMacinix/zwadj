import { expect, test } from "@playwright/test";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT } from "../playwright.config";
import { createPublishedVenue, seedReferentials } from "../fixtures/harness";

/**
 * RANG 25 (D316), DÉFAUT 2 — « SE CONNECTER POUR DEMANDER » MENAIT À UNE 404.
 *
 * Mesuré par D315 : le lien du panneau de demande visait `/connexion` ; la page
 * est `/auth/connexion`. Le visiteur anonyme — celui qu'on veut faire entrer —
 * tombait sur « Cette page n'existe pas » (capture 25, octet pour octet la
 * capture de la page inconnue). Aucun test ne l'assertait.
 *
 * ⚠ Joué en FRANÇAIS ET EN ARABE : un correctif juste dans une locale et faux
 * dans l'autre (préfixe de locale perdu) est le mode de défaillance MD2-b.
 * ⚠ Deux preuves, parce qu'elles ne voient pas la même chose : l'URL après le
 * CLIC (navigation du routeur client, qui rendrait une 404 sans statut HTTP),
 * puis le STATUT du document rechargé à froid.
 */
const MESSAGES = { fr, ar } as const;
let slug = "";

test.beforeAll(async () => {
  seedReferentials();
  slug = (await createPublishedVenue()).slug;
});

for (const [locale, m] of Object.entries(MESSAGES)) {
  test(`${locale} — « ${m.venueDetail.booking.loginToBook} » mène à la page de connexion réelle`, async ({ page }) => {
    await page.goto(`${CLIENT}/${locale}/salles/${slug}`);
    const panneau = page.getByRole("region", { name: m.venueDetail.booking.title });
    const lien = panneau.getByRole("link", { name: m.venueDetail.booking.loginToBook });
    await expect(lien).toBeVisible();
    await lien.click();

    await expect(page, "le lien du panneau ne mène pas à la page de connexion").toHaveURL(
      new RegExp(`/${locale}/auth/connexion$`)
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.auth.ui.login.title);
    const aFroid = await page.reload();
    expect(aFroid?.status()).toBe(200);
  });
}
