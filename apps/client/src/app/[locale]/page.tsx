import { getTranslations } from "next-intl/server";
import { searchVenues } from "../../lib/api";
import { HomeView } from "../../components/home-view";
import { previewVenuesFor } from "../../lib/preview-venues";

// Page d'accueil — composant SERVEUR, SSR.
// Invariant du dépôt : les pages publiques ne sont jamais 100 % client.
//
// ⚠ DEUX APPELS, PAS UN TRI LOCAL. Les deux grilles s'adossent aux deux seuls
// tris que le contrat public expose (`recent`, `price_asc`). Trier localement par
// prix aurait réécrit dans le navigateur une capacité que le serveur a déjà —
// une seconde autorité sur « laquelle est la moins chère ».
//
// ⚠ `searchVenues` rend `null` quand l'API est injoignable, et une liste VIDE
// quand elle répond sans résultat. La vue distingue les deux : « catalogue
// vide » et « API éteinte » ne se disent pas pareil.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recent, affordable] = await Promise.all([
    searchVenues(new URLSearchParams({ sort: "recent", pageSize: "6" })),
    searchVenues(new URLSearchParams({ sort: "price_asc", pageSize: "6" }))
  ]);

  await getTranslations("home");

  return (
    <HomeView
      recent={recent}
      affordable={affordable}
      // ⚠ Lu ICI, dans un composant serveur : `PRO_URL` n'est pas préfixée
      // `NEXT_PUBLIC_`, elle n'existe donc pas dans le navigateur. `null` fait
      // disparaître le bloc au lieu de rendre un bouton vers nulle part.
      proUrl={process.env.PRO_URL ?? null}
      // Le repli sur des salles FICTIVES se décide ICI, et nulle part ailleurs.
      // `NODE_ENV` est posé par Next lui-même : rien à configurer, donc rien à
      // oublier — ni pour voir la grille en local, ni pour l'éteindre en
      // production. ⚠ La DONNÉE est passée depuis cette page SERVEUR et jamais
      // importée par la vue, qui est un composant CLIENT : avec l'import côté
      // vue, `next build` embarquait les salles inventées dans le chunk
      // NAVIGATEUR — le `tree-shaking` ne peut rien en retirer, leur usage
      // dépendant d'une prop évaluée à l'exécution.
      previewVenues={previewVenuesFor(process.env.NODE_ENV)}
    />
  );
}
