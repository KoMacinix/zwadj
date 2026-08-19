// Lot A7 — recherche de salles, RENDUE PAR LE SERVEUR (invariant : les pages
// publiques ne sont jamais 100 % client). Cette page ne contient aucune logique
// métier : elle lit l'URL, délègue la normalisation à `search-query.ts` (pur,
// testé) et l'affichage à `SearchView`.
//
// L'API est celle du Lot A3, inchangée : aucune migration, aucun contrat touché.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchView } from "../../../components/search/search-view";
import { previewVenuesFor } from "../../../lib/preview-venues";
import { getAmenities, getVenueStyles, getWilayas, searchVenues } from "../../../lib/api";
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

  // Les référentiels ne dépendent pas des résultats : quatre requêtes en
  // PARALLÈLE, pas quatre allers-retours en cascade. Sur réseau lent, c'est la
  // différence entre une page et trois attentes.
  const [results, wilayas, amenities, styles] = await Promise.all([
    searchVenues(toApiQuery(state)),
    getWilayas(),
    getAmenities(),
    getVenueStyles()
  ]);

  return (
    <SearchView
      state={state}
      results={results}
      wilayas={wilayas}
      amenities={amenities}
      styles={styles}
      // UI-D5 — le repli sur des salles FICTIVES se décide ICI, et nulle part
      // ailleurs. `NODE_ENV` est posé par Next lui-même (`dev` → development,
      // `build`/`start` → production) : aucune variable à configurer, donc
      // aucune à oublier — ni pour voir la grille en local, ni pour l'éteindre
      // en production. Une variable `NEXT_PUBLIC_*` aurait fait l'inverse des
      // deux : à poser pour voir, à retirer pour ne pas mentir.
      //
      // ⚠ La DONNÉE est passée depuis CETTE page, qui est un composant SERVEUR,
      // et jamais importée par la vue, qui est un composant CLIENT. Constaté à
      // l'exécution, pas en relecture : avec l'import côté vue, `next build`
      // embarquait les six salles inventées dans le chunk NAVIGATEUR de
      // `/salles`. Le `tree-shaking` ne pouvait rien en retirer — leur usage
      // dépend d'une prop évaluée à l'exécution, donc le bundler doit les
      // garder. Ici, le ternaire est résolu au rendu serveur : en production,
      // c'est `null` qui part dans la charge utile.
      previewVenues={previewVenuesFor(process.env.NODE_ENV)}
    />
  );
}
