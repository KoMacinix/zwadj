// Lot A7 — recherche de salles, RENDUE PAR LE SERVEUR (invariant : les pages
// publiques ne sont jamais 100 % client). Cette page ne contient aucune logique
// métier : elle lit l'URL, délègue la normalisation à `search-query.ts` (pur,
// testé) et l'affichage à `SearchView`.
//
// L'API est celle du Lot A3, inchangée : aucune migration, aucun contrat touché.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchView } from "../../../components/search/search-view";
import { getAmenities, getWilayas, searchVenues } from "../../../lib/api";
import { parseSearchParams, toApiQuery, type RawSearchParams } from "../../../lib/search-query";

// Rendu à la demande, EXPLICITE. La page l'est déjà de fait — elle attend
// `searchParams`, une API dynamique de Next 15 — et le manifeste de prérendu le
// confirme : `routes` ne contient aucune entrée `salles`, avec ou sans cette
// ligne. Le `●` de la table des routes trompe : il désigne les combinaisons de
// `[locale]` connues, pas du HTML écrit sur disque.
//
// On la garde quand même comme GARDE-FOU : si un futur lot déplaçait la lecture
// des paramètres dans un composant enfant, la page redeviendrait prérenderable
// EN SILENCE — et comme l'API est éteinte pendant un build de CI, c'est l'état
// d'erreur qui partirait en HTML figé pour tous les visiteurs de l'URL nue.
// Le SEO n'y perd rien : du HTML rendu par le serveur s'indexe comme du
// prérendu. La mise en cache de cette page relève d'un lot de performance.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return { title: t("title"), description: t("intro") };
}

export default async function VenuesSearchPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  await params;
  const state = parseSearchParams(await searchParams);

  // Les référentiels ne dépendent pas des résultats : trois requêtes en
  // PARALLÈLE, pas trois allers-retours en cascade. Sur réseau lent, c'est la
  // différence entre une page et trois attentes.
  const [results, wilayas, amenities] = await Promise.all([
    searchVenues(toApiQuery(state)),
    getWilayas(),
    getAmenities()
  ]);

  return <SearchView state={state} results={results} wilayas={wilayas} amenities={amenities} />;
}
