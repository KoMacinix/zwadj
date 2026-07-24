// Traduction des erreurs métier venue en erreurs de CHAMP (Lot A5).
//
// Sans ça, un 400 légitime finirait en bandeau générique alors que le pro doit
// voir QUEL champ corriger. Cas le plus retors, explicitement couvert :
// `CAPACITY_RANGE_INVALID` en édition partielle — si le pro ne modifie qu'un
// des deux champs de capacité, le `validate()` local ne PEUT pas voir
// l'incohérence (l'autre valeur est en base), donc seul le 400 de l'API la
// révèle : il doit atterrir sur le champ, jamais être avalé.
import { ApiError, type FieldErrors } from "@zwadj/api-client";
import { issuesToFieldErrors } from "@zwadj/api-client";

/** code métier → { champ du formulaire, clé i18n de repli }. */
const FIELD_BY_CODE: Record<string, { field: string; fallbackKey: string }> = {
  CITY_NOT_FOUND: { field: "cityId", fallbackKey: "venue.errors.cityNotFound" },
  CAPACITY_RANGE_INVALID: { field: "capacityMax", fallbackKey: "venue.errors.capacityRange" },
  AMENITY_NOT_FOUND: { field: "amenityIds", fallbackKey: "venue.errors.amenityNotFound" }
};

/**
 * Erreurs de champ portées par une erreur d'API, ou `null` si l'erreur n'est
 * pas « champ-adressable » (le caller affiche alors un bandeau de formulaire).
 * Les issues Zod de l'API (400 de la pipe) priment : elles portent déjà le
 * chemin exact et une clé i18n.
 */
export function venueFieldErrors(error: unknown): FieldErrors | null {
  if (!(error instanceof ApiError)) return null;
  if (error.issues.length > 0) return issuesToFieldErrors(error.issues);
  const mapped = FIELD_BY_CODE[error.code];
  if (!mapped) return null;
  // `messageKey` vient de l'API ; le repli couvre une enveloppe sans clé.
  return { [mapped.field]: error.messageKey ?? mapped.fallbackKey };
}

/**
 * 404 INDISTINCT (inexistante / supprimée / id malformé / salle d'un autre
 * pro) : l'écran d'édition n'a QU'UN état « introuvable », sans distinction —
 * c'est la doctrine anti-énumération de l'API, à ne pas trahir côté UI.
 */
export function isVenueNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === "VENUE_NOT_FOUND";
}
