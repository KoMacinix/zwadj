import { getAmenities, getVenueStyles, getWilayas } from "../../../lib/api";
import { FilterWizard } from "../../../components/filter-wizard";

// Assistant de filtres — composant SERVEUR.
//
// ⚠ ROUTE DÉDIÉE, ET C'EST STRUCTUREL (arbitrage Ko). L'assistant a besoin de
// JavaScript : étapes, compteur en direct. `/salles` n'en a pas besoin et n'en
// aura pas besoin — filtres en `<form method="get">`, pagination en liens —
// parce qu'elle vise un Android bas de gamme sur réseau lent et qu'elle existe
// pour le référencement. Mettre l'assistant À LA PLACE de son formulaire aurait
// privé de recherche tout visiteur sans JS. Ici, il est un chemin d'entrée
// confortable ; le formulaire classique reste intact.
//
// ⚠ Les trois référentiels sont chargés ICI, côté serveur, et passés en props :
// l'assistant ne doit pas commencer par trois requêtes depuis le navigateur
// avant de pouvoir poser sa première question. Un échec rend une liste VIDE
// (`lib/api.ts`), donc l'étape concernée le dit et n'empêche pas d'avancer.
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const [wilayas, styles, amenities] = await Promise.all([getWilayas(), getVenueStyles(), getAmenities()]);
  return <FilterWizard wilayas={wilayas} styles={styles} amenities={amenities} />;
}
