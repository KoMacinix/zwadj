// Catégories de prestataires — lot Accueil.
//
// ⚠ CE FICHIER NE DÉCRIT AUCUN PRESTATAIRE, ET C'EST TOUT SON OBJET.
// Le domaine « prestataires » n'existe pas : ni table Prisma, ni endpoint, ni
// DTO. Le patron `preview-venues` ne s'applique donc PAS ici — son garde-fou
// n°3 exige qu'un jeu de démonstration ÉTENDE le type réel et passe par le même
// composant de rendu. Un type absent ne s'étend pas, et un chemin de rendu que
// le produit n'empruntera jamais ne prouve rien.
//
// Arbitrage Ko (17/08/2026) : la section se construit « à venir », au style de
// la maquette, avec des cartes GRISÉES. Ce que ça autorise et ce que ça
// n'autorise pas :
//
//   ✅ les NOMS de catégories — ils annoncent une intention de produit ;
//   ⛔ les COMPTES de la maquette (`count: 142`, `count: 87`…) — un nombre de
//      prestataires est une affirmation vérifiable, et fausse ;
//   ⛔ tout lien — aucune de ces cartes ne mène nulle part, et une carte qui
//      accepte le clic sans rien ouvrir est pire qu'une carte inerte ;
//   ⛔ toute photo — les images Unsplash de la maquette montreraient des
//      mariages qu'aucun prestataire référencé n'a réalisés.
//
// ⚠ Le gris ne PORTE PAS le message à lui seul (WCAG 1.4.1) : chaque carte
// affiche « À venir » en texte, et la section porte une note explicite.
//
// ⚠ Ce module est importé par la vue, qui est un composant CLIENT — donc ces
// seize chaînes partent dans le paquet navigateur. Assumé : ce sont des
// LIBELLÉS, pas des données. Le contraste avec `preview-venues.ts`, importé en
// `import type` seulement, est délibéré — là c'étaient six salles inventées.

/** Clés i18n : `home.vendors.cat.*`. Ordre = celui de la maquette. */
export const VENDOR_CATEGORIES = [
  "caterers",
  "photographers",
  "videographers",
  "dj",
  "dresses",
  "suits",
  "decoration",
  "cars",
  "cakes",
  "beauty",
  "negafa",
  "jewellery",
  "planners",
  "invitations",
  "honeymoon"
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
