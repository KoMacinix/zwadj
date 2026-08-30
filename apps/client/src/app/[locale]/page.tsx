import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { searchVenues } from "../../lib/api";
import { publicMetadata } from "../../lib/seo";
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
// ⚠ `searchVenues` rend une ISSUE (lot `availableOn`), et l'accueil n'en
// distingue que deux : il ne pose aucune question de date, donc `past-date` ne
// peut pas en sortir. On replie donc tout ce qui n'est pas `ok` sur `null` —
// « je ne sais pas » —, ce que la vue sait déjà dire autrement qu'un catalogue
// vide : « catalogue vide » et « API éteinte » ne se disent pas pareil.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // La page la plus importante à indexer, et la seule qui ne portait aucune
  // canonical alors qu'elle est atteignable par au moins trois adresses
  // (`/`, `/fr`, `/fr/`).
  return publicMetadata({ locale, canonicalPath: "/", indexable: true });
}

export default async function HomePage() {
  const [recentOutcome, affordableOutcome] = await Promise.all([
    searchVenues(new URLSearchParams({ sort: "recent", pageSize: "6" })),
    searchVenues(new URLSearchParams({ sort: "price_asc", pageSize: "6" }))
  ]);
  const recent = recentOutcome.kind === "ok" ? recentOutcome.data : null;
  const affordable = affordableOutcome.kind === "ok" ? affordableOutcome.data : null;

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
