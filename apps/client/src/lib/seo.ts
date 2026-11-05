// Balises `robots` et `canonical` — Lot `availableOn`, volet SEO.
//
// ── ⛔ CE QUE LE DÉPÔT AVAIT AVANT CE FICHIER : RIEN ─────────────────────────
// Aucune balise `robots`, aucune `canonical`, nulle part — vérifié. Le problème
// n'est donc PAS né avec `availableOn` : la pagination et les filtres existants
// ouvrent déjà, en silence, autant d'URL distinctes rendant des contenus très
// proches. `availableOn` ne fait que le rendre visible en multipliant par 365.
// D'où un MODULE et une RÈGLE, plutôt qu'une exception posée sur une page.
//
// ── LA RÈGLE, EN UNE PHRASE ─────────────────────────────────────────────────
// Une page de recherche PORTANT le moindre paramètre est une VARIANTE : elle
// sort en `noindex, follow`, et sa `canonical` désigne la page nue.
//
//   - `noindex` : ces variantes n'apportent aucun contenu que la page nue et
//     les fiches de salles ne portent pas déjà ;
//   - `follow`, et c'est LE point : les liens sont suivis. Les pages qu'on veut
//     réellement indexer — les fiches — sont atteintes DEPUIS ces variantes.
//     Un `nofollow` couperait le chemin d'exploration vers le seul contenu qui
//     mérite l'index.
//
// ⚠ ARBITRAGE À CONNAÎTRE, pas un détail technique : cette règle renonce aux
// pages de longue traîne (« salles avec parking à Bab Ezzouar »). C'est le prix
// d'une seule règle simple, et c'est réversible — le jour où une combinaison
// mérite l'index, elle sortira de `isVariant`, pas d'un cas particulier écrit
// dans une page.
//
// ⚠ CE MODULE EST PUR. Il ne lit ni `headers()`, ni `window`, ni l'horloge : il
// se teste sans rendre une page.
import type { Metadata } from "next";
import type { VenuePublicDTO } from "@zwadj/types";

/** Racine publique du site, sans barre finale. Sert à rendre les `canonical`
 *  ABSOLUES — une `canonical` relative est tolérée par Google mais ambiguë dès
 *  qu'un préfixe de locale s'en mêle, et ce site en a deux.
 *
 *  ⚠ Repli sur `http://localhost:3000`, le port que `apps/client/package.json`
 *  donne à `next dev` et `next start` — pas une valeur inventée. En production
 *  la variable DOIT être posée : une `canonical` pointant `localhost` désigne
 *  une page que personne ne peut atteindre. */
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Les paramètres qui font d'une page de recherche une VARIANTE.
 *
 *  ⚠ Relevés sur `SearchState` (`lib/search-query.ts`), pas écrits de mémoire :
 *  ce sont exactement les clés que `toPublicQuery` sait produire. Une clé qui
 *  s'ajouterait là-bas sans venir ici serait une variante indexée en silence —
 *  c'est ce que le test de ce module vérifie. */
export const SEARCH_VARIANT_PARAMS = [
  "cityId",
  "guests",
  "minPrice",
  "maxPrice",
  "maxCapacity",
  "amenities",
  "styles",
  "ceremonyType",
  "availableOn",
  "sort",
  "page",
  // FC-8 — le mode guidé (D230) : `/salles?guide=…` montre les MÊMES résultats sous un panneau ; c'est une seconde adresse.
  // ⚠ D230 y joignait `maxPriceCents` : sans objet depuis FC-7 (le repli est retiré, le paramètre n'a plus d'effet).
  "guide"
] as const;

/** La page porte-t-elle au moins un paramètre de variante ? */
export function isVariant(raw: Record<string, string | string[] | undefined>): boolean {
  return SEARCH_VARIANT_PARAMS.some((key) => {
    const value = raw[key];
    if (value === undefined) return false;
    // ⚠ `?cityId=` (vide) n'est PAS une variante : un `<form method="get">`
    // soumet ses champs vides, donc l'URL nue-en-pratique porte quand même les
    // clés. Les traiter comme des variantes mettrait `noindex` sur la page que
    // la règle veut justement garder indexable.
    return Array.isArray(value) ? value.some((v) => v.trim() !== "") : value.trim() !== "";
  });
}

/** URL absolue d'un chemin interne, préfixe de locale inclus. */
export function absoluteUrl(locale: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}/${locale}${clean === "/" ? "" : clean}`;
}

/**
 * Métadonnées `robots` + `alternates.canonical` d'une page PUBLIQUE.
 *
 * `indexable === false` (page de compte, tunnel, variante) ⇒ `noindex, follow`.
 * La `canonical` désigne toujours `canonicalPath`, jamais l'URL courante : sur
 * une variante, c'est le chemin NU qui doit la recevoir.
 */
export function publicMetadata(params: {
  locale: string;
  canonicalPath: string;
  indexable: boolean;
}): Pick<Metadata, "robots" | "alternates"> {
  const { locale, canonicalPath, indexable } = params;
  return {
    robots: { index: indexable, follow: true },
    alternates: { canonical: absoluteUrl(locale, canonicalPath) }
  };
}

// ── FC-10 (session `front-client`) — LES DONNÉES STRUCTURÉES D'UNE FICHE DE SALLE (schema.org `EventVenue`), en JSON-LD ──
//
// ⚠ PURES, comme tout ce module (D205) : `venueStructuredData` reçoit la salle, la langue et l'URL canonique de la fiche, et rend
// l'objet — la page ne fait que l'insérer. Une décision prise dans un composant serveur est invisible aux tests ; ici, chaque champ se mesure.
// ⚠ CE QUE L'OBJET PORTE : le nom et l'accroche dans la langue de la PAGE (une fiche `/ar/…` décrit la salle en arabe), l'adresse
// (rue, quartier, commune, pays `DZ`), la capacité (`maximumAttendeeCapacity`), les photos en URL ABSOLUES, la position si le pro
// l'a saisie, et l'URL canonique de la fiche.
// ⛔ AUCUN PRIX : le serveur rend des CENTIMES (`basePriceCents`), pas un prix « tel quel » ; l'écrire ici obligerait à le
// convertir — un calcul de montant que le front ne fait plus (FC-7 : la seule conversion du front est `centsFromDinars`, à
// l'aller). Consigne de la session : « aucun prix sauf si le serveur le donne tel quel ».
// ⛔ L'INSERTION SE FAIT PAR `jsonLdScript` : les textes viennent du PRO (nom, accroche, adresse) ; `JSON.stringify` n'échappe pas
// `</script>`, et un nom de salle qui le contiendrait fermerait la balise et injecterait du HTML. `<`, `>`, `&`, U+2028 et U+2029
// sont donc écrits en échappements `\uXXXX` — le JSON reste identique pour qui le lit.

export interface EventVenueJsonLd {
  "@context": "https://schema.org";
  "@type": "EventVenue";
  name: string;
  url: string;
  description?: string;
  maximumAttendeeCapacity: number;
  address: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality: string;
    addressCountry: "DZ";
  };
  image?: string[];
  geo?: { "@type": "GeoCoordinates"; latitude: number; longitude: number };
}

/** L'objet JSON-LD d'une fiche. `url` est l'URL canonique ABSOLUE de la fiche ; `absolu` fabrique l'URL absolue d'une image. */
export function venueStructuredData(
  venue: VenuePublicDTO,
  locale: string,
  url: string,
  absolu: (chemin: string) => string
): EventVenueJsonLd {
  const ar = locale === "ar";
  const nom = (ar ? venue.nameAr : venue.nameFr).trim();
  const accroche = (ar ? venue.taglineAr : venue.taglineFr)?.trim() ?? "";
  const quartier = (ar ? venue.districtAr : venue.districtFr)?.trim() ?? "";
  const rue = venue.address?.trim() ?? "";
  const commune = ar ? venue.city.nameAr : venue.city.nameFr;
  const rueEtQuartier = [rue, quartier].filter((x) => x !== "").join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: nom,
    url,
    ...(accroche === "" ? {} : { description: accroche }),
    maximumAttendeeCapacity: venue.capacityMax,
    address: {
      "@type": "PostalAddress",
      ...(rueEtQuartier === "" ? {} : { streetAddress: rueEtQuartier }),
      addressLocality: commune,
      addressCountry: "DZ"
    },
    ...(venue.photos.length === 0 ? {} : { image: venue.photos.map((p) => absolu(p.url)) }),
    ...(venue.lat === null || venue.lng === null ? {} : { geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng } })
  };
}

/** Le texte à placer DANS `<script type="application/ld+json">` : du JSON dont `<`, `>`, `&`, U+2028 et U+2029 sont échappés. */
export function jsonLdScript(donnees: unknown): string {
  return JSON.stringify(donnees)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
