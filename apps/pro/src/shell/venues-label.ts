// La règle du libellé « Ma salle / Mes salles » — rang 38 (D332, S-11). Module PUR.
//
// Décision ① du lot UIP-A : « Ma salle » tant que le pro n'en a qu'une (le cas général en Algérie), « Mes salles » dès la seconde. Le menu du haut ET le titre de la page
// « Ma salle » importent CETTE fonction : une règle, un endroit — le titre disait « Mes salles » pendant que le menu disait « Ma salle » (relevé par D331 sur ses captures).
// ⚠ Pendant le chargement le compte vaut 0 et le libellé reste au singulier : afficher « Mes salles » puis le voir se rétracter serait un scintillement.
export type VenuesLabelKey = "venue.ui.nav.myVenue" | "venue.ui.nav.myVenues";

export function venuesLabelKey(count: number): VenuesLabelKey {
  return count > 1 ? "venue.ui.nav.myVenues" : "venue.ui.nav.myVenue";
}
