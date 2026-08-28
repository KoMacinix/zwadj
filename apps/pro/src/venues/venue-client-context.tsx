// Fourniture des clients du domaine venue (Lot A5, §8) — instance UNIQUE pour
// toute la zone protégée, injectable pour les tests (même patron que
// `AuthProvider`, qui accepte déjà un `client`).
//
// Le client venue est construit SUR `useAuth().api.authedRequest` : c'est ce
// qui lui fait partager le token mémoire (D2) et le mutex single-flight du
// refresh. Les référentiels sont publics → client autonome sur l'URL Vite.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createBookingsProClient,
  createQuotesClient,
  createServicesClient,
  createReferentialsClient,
  createVenueProClient,
  type BookingsProClient,
  type QuotesClient,
  type ServicesClient,
  type ReferentialsClient,
  type VenueAvailabilityClient,
  type VenueCrudClient,
  type VenueMediaClient,
  type VenuePricingRuleClient,
  type VenueSlotTemplateClient,
  type VenueVisitClient,
  type VenueProClient
} from "@zwadj/api-client";
import type { AmenityDTO, WilayaDTO, VenueStyleDTO } from "@zwadj/types";
import { useAuth } from "../auth/auth-context";

interface VenueClients {
  venues: VenueProClient;
  referentials: ReferentialsClient;
  /** E1b — les demandes vivent sur `/pro/bookings/…`, hors de la topologie
   *  `/pro/venues`. Un client séparé plutôt qu'un gonflement de `VenueProClient` :
   *  ce sont deux sujets, et ils n'évolueront pas ensemble. */
  bookingsPro: BookingsProClient;
  /** E2c — le catalogue vit sur `/services`, hors de la topologie `/pro/venues`. */
  services: ServicesClient;
  /** E2e — les devis vivent sur `/quotes`, hors de `/pro/venues`. */
  quotes: QuotesClient;
}

const VenueClientsContext = createContext<VenueClients | null>(null);

export function VenueProvider({
  children,
  venues,
  referentials,
  bookingsPro,
  servicesClient,
  quotesClient
}: {
  children: React.ReactNode;
  /** Injectables pour les tests de composants. */
  venues?: VenueProClient;
  referentials?: ReferentialsClient;
  bookingsPro?: BookingsProClient;
  servicesClient?: ServicesClient;
  quotesClient?: QuotesClient;
}) {
  const { api } = useAuth();

  const value = useMemo<VenueClients>(
    () => ({
      venues: venues ?? createVenueProClient(api.authedRequest),
      referentials:
        referentials ?? createReferentialsClient(import.meta.env.VITE_API_URL ?? "http://localhost:3001"),
      bookingsPro: bookingsPro ?? createBookingsProClient(api.authedRequest),
      services: servicesClient ?? createServicesClient(api.authedRequest),
      quotes: quotesClient ?? createQuotesClient(api.authedRequest)
    }),
    [api, venues, referentials, bookingsPro, servicesClient, quotesClient]
  );

  return <VenueClientsContext.Provider value={value}>{children}</VenueClientsContext.Provider>;
}

function useVenueClients(): VenueClients {
  const ctx = useContext(VenueClientsContext);
  if (!ctx) throw new Error("useVenues/useReferentials doivent être utilisés sous <VenueProvider>.");
  return ctx;
}

/**
 * ⛔ S9 — SIX CROCHETS ÉTROITS. C'EST ICI QUE L'ISP DEVIENT EXÉCUTOIRE.
 *
 * Le découpage de `VenueProClient` en six interfaces ne contraint personne
 * tant que tout le monde appelle `useVenues()` : le type reçu resterait
 * l'intersection, donc les vingt-deux membres. Ce sont ces crochets qui
 * rétrécissent CE QUE CHAQUE ÉCRAN DEMANDE — et une section qui tend la main
 * hors de sa famille ne compile plus.
 *
 * ⚠ L'objet rendu est LE MÊME dans les six cas : une seule instance pour toute
 * la zone protégée (Lot A5). Ce qui change est le TYPE, pas la fourniture —
 * donc aucun aller-retour de plus, aucune identité de référence cassée dans les
 * dépendances de `useEffect`.
 *
 * ⚠ `useVenues()` SUBSISTE, et c'est délibéré : le retirer aurait forcé une
 * réécriture de tous les tests de composants dans le même lot. Il n'a plus
 * aucun appelant de production — vérifié par `venue-client-context.test.tsx`,
 * qui TOMBE si un écran y revient.
 */
export function useVenueCrud(): VenueCrudClient {
  return useVenueClients().venues;
}

export function useVenueMedia(): VenueMediaClient {
  return useVenueClients().venues;
}

export function useVenueSlotTemplates(): VenueSlotTemplateClient {
  return useVenueClients().venues;
}

export function useVenuePricingRules(): VenuePricingRuleClient {
  return useVenueClients().venues;
}

export function useVenueAvailability(): VenueAvailabilityClient {
  return useVenueClients().venues;
}

export function useVenueVisits(): VenueVisitClient {
  return useVenueClients().venues;
}

/** ⚠ Le client ENTIER. Plus aucun écran ne devrait l'appeler — seuls les
 *  doubles de test le construisent en entier. */
export function useVenues(): VenueProClient {
  return useVenueClients().venues;
}

export function useQuotes(): QuotesClient {
  return useVenueClients().quotes;
}

export function useServices(): ServicesClient {
  return useVenueClients().services;
}

export function useBookingsPro(): BookingsProClient {
  return useVenueClients().bookingsPro;
}

export function useReferentials(): ReferentialsClient {
  return useVenueClients().referentials;
}

/** État des deux référentiels publics, chargés EN PARALLÈLE (ajout B). */
export interface ReferentialsData {
  status: "loading" | "ready" | "error";
  wilayas: WilayaDTO[];
  amenities: AmenityDTO[];
  /** Styles de salle (D65). Chargés avec les autres : le formulaire les affiche
   *  au même moment que les équipements, un troisième aller-retour en cascade
   *  ne ferait qu'ajouter une attente. */
  venueStyles: VenueStyleDTO[];
  /** cityId → libellés, pour afficher la commune sans re-parcourir l'arbre. */
  cityById: Map<string, { nameFr: string; nameAr: string }>;
  reload: () => void;
}

/**
 * Charge wilayas + amenities + styles en parallèle (ajout B — correctif
 * bloquant B ; styles ajoutés en A13c).
 * Deux politiques d'usage, une seule mécanique :
 *  - formulaires : `status === "error"` ⇒ bandeau + retry et submit BLOQUÉ
 *    (sans commune, pas de `cityId` : le select serait vide et muet) ;
 *  - liste : l'échec est simplement ignoré (la commune n'est pas affichée),
 *    une salle reste lisible et actionnable sans son référentiel.
 */
export function useReferentialsData(): ReferentialsData {
  const referentials = useReferentials();
  const [status, setStatus] = useState<ReferentialsData["status"]>("loading");
  const [wilayas, setWilayas] = useState<WilayaDTO[]>([]);
  const [amenities, setAmenities] = useState<AmenityDTO[]>([]);
  const [venueStyles, setVenueStyles] = useState<VenueStyleDTO[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void Promise.all([referentials.listWilayas(), referentials.listAmenities(), referentials.listVenueStyles()])
      .then(([loadedWilayas, loadedAmenities, loadedStyles]) => {
        if (cancelled) return;
        setWilayas(loadedWilayas);
        setAmenities(loadedAmenities);
        setVenueStyles(loadedStyles);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [referentials, attempt]);

  const cityById = useMemo(() => {
    const index = new Map<string, { nameFr: string; nameAr: string }>();
    for (const wilaya of wilayas) {
      for (const city of wilaya.cities) index.set(city.id, { nameFr: city.nameFr, nameAr: city.nameAr });
    }
    return index;
  }, [wilayas]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, wilayas, amenities, venueStyles, cityById, reload };
}
