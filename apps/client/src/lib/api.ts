import type {
  AmenityDTO,
  VenueAvailabilityResponse,
  ApiHealthResponse,
  VenueListResponse,
  VenuePublicDTO,
  WilayaDTO
} from "@zwadj/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Client API minimal du squelette : GET /api/v1/health, typé par le contrat
 * partagé @zwadj/types. Tolère une API éteinte (la page doit se rendre quand même).
 */
export async function getApiHealth(): Promise<ApiHealthResponse | { status: "unreachable" }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, { cache: "no-store" });
    if (!res.ok) return { status: "unreachable" };
    return (await res.json()) as ApiHealthResponse;
  } catch {
    return { status: "unreachable" };
  }
}

// ── Lot A7 — lectures PUBLIQUES pour le rendu serveur ────────────────────────
// Aucune authentification : ces routes sont anonymes. On ne passe donc pas par
// `@zwadj/api-client` (mutex de rafraîchissement, rejeu après 401, cookies) —
// rien de tout cela n'a de sens dans un composant serveur, et l'y traîner
// ferait fuiter un état de session entre deux visiteurs sur un serveur partagé.
//
// Tolérance aux pannes, comme `getApiHealth` : une API éteinte doit produire un
// ÉTAT D'ERREUR rendu, jamais une exception qui casse la page.

/** Résultats de recherche, ou `null` si l'API n'a pas répondu correctement. */
export async function searchVenues(query: URLSearchParams): Promise<VenueListResponse | null> {
  try {
    // `no-store` : la publication d'une salle par l'admin doit se voir tout de
    // suite. Le cache de cette page relève d'un futur lot de performance.
    const res = await fetch(`${API_URL}/api/v1/venues?${query.toString()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as VenueListResponse;
  } catch {
    return null;
  }
}

/** Référentiels : quasi immuables (un seed), donc revalidés à l'heure. Un
 *  échec renvoie une liste VIDE — les filtres disparaissent, les résultats
 *  restent : une panne de référentiel ne doit pas vider la page. */
export async function getWilayas(): Promise<WilayaDTO[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/wilayas`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as WilayaDTO[];
  } catch {
    return [];
  }
}

export async function getAmenities(): Promise<AmenityDTO[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/amenities`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as AmenityDTO[];
  } catch {
    return [];
  }
}

/**
 * Détail public d'une salle, PAR SLUG (décision Flux A : le slug est la clé
 * publique, l'id reste interne). `null` couvre les DEUX cas :
 *   - 404 de l'API — slug inconnu, salle non publiée, ou `HIDDEN` (D33 : la
 *     salle cachée est un 404 même en accès direct, pas une page vide) ;
 *   - API injoignable.
 * L'appelant transforme ce `null` en 404 HTTP. Rendre une page « introuvable »
 * en 200 serait un soft-404 : Google indexerait une page fantôme.
 *
 * `revalidate` plutôt que `no-store` : le détail est la page la plus lue et la
 * moins changeante du site. Le même appel sert `generateMetadata` et le rendu —
 * Next déduplique les `fetch` de configuration identique, donc UN aller-retour.
 */
export async function getVenueBySlug(slug: string): Promise<VenuePublicDTO | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/venues/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    return (await res.json()) as VenuePublicDTO;
  } catch {
    return null;
  }
}

// ── Lot B5 — calendrier de disponibilité ─────────────────────────────────────

/** Disponibilité et prix d'une salle sur une fenêtre de dates civiles.
 *
 *  Appelée depuis le NAVIGATEUR (le calendrier navigue de mois en mois), donc
 *  `cache: "no-store"` : une disponibilité mise en cache annoncerait une case
 *  libre qui ne l'est plus, ce qui est exactement la surprise que D46 interdit.
 *
 *  ⚠ Les bornes RENDUES peuvent différer des bornes demandées : l'API écrête
 *  le passé et l'horizon 18 mois (D49) au lieu de refuser. L'appelant doit lire
 *  `from`/`to` de la réponse, jamais présumer les siennes. */
export async function getVenueAvailability(
  slug: string,
  from: string,
  to: string
): Promise<VenueAvailabilityResponse | null> {
  try {
    const query = new URLSearchParams({ from, to });
    const res = await fetch(
      `${API_URL}/api/v1/venues/${encodeURIComponent(slug)}/availability?${query.toString()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return (await res.json()) as VenueAvailabilityResponse;
  } catch {
    return null;
  }
}
