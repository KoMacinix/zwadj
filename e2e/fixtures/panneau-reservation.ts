import { expect, type Locator } from "@playwright/test";
import fr from "../../packages/i18n/messages/fr.json";

/**
 * RANG 29 (D321) — CHOISIR UNE DATE DANS LE PANNEAU DE DEMANDE, COMME UN VISITEUR.
 *
 * Le panneau listait 182 boutons « AAAA-MM-JJ · créneau · prix » ; il montre désormais UN MOIS : on choisit un JOUR libre
 * dans la grille, puis un créneau libre de ce jour. Écrit UNE fois pour les specs qui le font (`r25`, `r26`) — deux copies
 * d'un même parcours divergent (D78).
 *
 * ⚠ Les noms viennent des MESSAGES (l'autorité), jamais recopiés : « {date}, disponible » et « Créneaux du {date} », la
 * date laissée libre — elle dépend de l'horloge et de la langue.
 */
const echappe = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const gabarit = (message: string) => new RegExp(`^${echappe(message).replace(echappe("{date}"), ".+")}$`);

/** Nom accessible d'un jour LIBRE du calendrier. */
export const JOUR_LIBRE = gabarit(fr.venueDetail.booking.dayFree);
/** Nom du groupe des créneaux du jour regardé. */
export const CRENEAUX_DU_JOUR = gabarit(fr.venueDetail.calendar.slotsFor);

export async function choisirUneDate(panneau: Locator): Promise<void> {
  const jour = panneau.getByRole("button", { name: JOUR_LIBRE }).first();
  await expect(jour, "le calendrier du panneau ne propose aucun jour libre").toBeEnabled();
  await jour.click();
  const creneau = panneau.getByRole("group", { name: CRENEAUX_DU_JOUR }).getByRole("button", { disabled: false }).first();
  await expect(creneau, "le jour choisi ne propose aucun créneau libre").toBeEnabled();
  await creneau.click();
  await expect(creneau).toHaveAttribute("aria-pressed", "true");
}
