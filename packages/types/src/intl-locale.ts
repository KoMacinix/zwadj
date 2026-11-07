// LA LOCALE DE MISE EN FORME d'une langue de l'application — UNE règle, pour les dates ET les nombres (FC-6, session `front-client`).
//
// ⛔ ARBITRAGE DE KO DU 04/10/2026, mot pour mot : « Les dates et les nombres en arabe se formatent en ar-DZ. Le catalogue et les
// routes restent ar. » Relevé dans le navigateur d'abord (`docs/preuves/front-client/FC-6/releve-ar-dz.txt`) : `ar` nomme août
// « أغسطس », `ar-DZ` « أوت » — le nom qu'on lit en Algérie ; et pour les NEUF formats de date des deux applications, `fr` et
// `fr-DZ` rendent les MÊMES octets. La règle `fr-DZ`, déjà celle des montants (`formatDZD`) et des notes (`formatRating`), vaut
// donc aussi pour les dates sans rien changer en français.
// ⛔ CE N'EST QU'UNE LOCALE DE MISE EN FORME. La semaine ne s'en dérive JAMAIS (D56 : `ar-DZ` répond « samedi » ; la semaine est
// `WEEK_START_DAY`) ; le fuseau non plus (D48 : `ALGIERS_TIME_ZONE` pour un instant, `UTC` pour une date civile déjà d'Alger) ;
// et l'HEURE ne passe jamais par `Intl` (D57 : `formatWallClock`).
// ⚠ Le catalogue (`packages/i18n/messages/ar.json`) et les routes (`/ar/…`) restent `ar` : seule la MISE EN FORME suit l'Algérie.
// ⚠ Le PDF du devis (`apps/api/src/documents/quote-document.ts`) écrit cette règle en ligne pour ses dates : hors de la session
// qui l'a posée, il n'est pas branché ici.

/** `"ar"` → `"ar-DZ"` ; toute autre langue → `"fr-DZ"`. */
export function intlLocale(locale: string): "ar-DZ" | "fr-DZ" {
  return locale === "ar" ? "ar-DZ" : "fr-DZ";
}

/** Le fuseau d'Alger, pour mettre en forme un INSTANT : UTC+1 toute l'année, aucun changement d'heure (D48) — jamais le fuseau de
 *  la machine qui exécute le code. */
export const ALGIERS_TIME_ZONE = "Africa/Algiers";

/** La date d'un INSTANT (horodatage ISO 8601), à Alger, en chiffres, dans la langue de la page. Elle remplace
 *  `toLocaleDateString()`, qui prenait la langue ET le fuseau du NAVIGATEUR. Un horodatage illisible est rendu tel quel : un
 *  `Intl` sur `NaN` lève, et une section de compte ne tombe pas pour une date. */
export function formatInstantDate(iso: string, locale: string): string {
  const instant = Date.parse(iso);
  if (Number.isNaN(instant)) return iso;
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "numeric", year: "numeric", timeZone: ALGIERS_TIME_ZONE }).format(
    instant
  );
}
