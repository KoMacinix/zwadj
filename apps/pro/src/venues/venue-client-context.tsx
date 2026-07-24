// Fourniture des clients du domaine venue (Lot A5, §8) — instance UNIQUE pour
// toute la zone protégée, injectable pour les tests (même patron que
// `AuthProvider`, qui accepte déjà un `client`).
//
// Le client venue est construit SUR `useAuth().api.authedRequest` : c'est ce
// qui lui fait partager le token mémoire (D2) et le mutex single-flight du
// refresh. Les référentiels sont publics → client autonome sur l'URL Vite.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createReferentialsClient,
  createVenueProClient,
  type ReferentialsClient,
  type VenueProClient
} from "@zwadj/api-client";
import type { AmenityDTO, WilayaDTO } from "@zwadj/types";
import { useAuth } from "../auth/auth-context";

interface VenueClients {
  venues: VenueProClient;
  referentials: ReferentialsClient;
}

const VenueClientsContext = createContext<VenueClients | null>(null);

export function VenueProvider({
  children,
  venues,
  referentials
}: {
  children: React.ReactNode;
  /** Injectables pour les tests de composants. */
  venues?: VenueProClient;
  referentials?: ReferentialsClient;
}) {
  const { api } = useAuth();

  const value = useMemo<VenueClients>(
    () => ({
      venues: venues ?? createVenueProClient(api.authedRequest),
      referentials:
        referentials ?? createReferentialsClient(import.meta.env.VITE_API_URL ?? "http://localhost:3001")
    }),
    [api, venues, referentials]
  );

  return <VenueClientsContext.Provider value={value}>{children}</VenueClientsContext.Provider>;
}

function useVenueClients(): VenueClients {
  const ctx = useContext(VenueClientsContext);
  if (!ctx) throw new Error("useVenues/useReferentials doivent être utilisés sous <VenueProvider>.");
  return ctx;
}

export function useVenues(): VenueProClient {
  return useVenueClients().venues;
}

export function useReferentials(): ReferentialsClient {
  return useVenueClients().referentials;
}

/** État des deux référentiels publics, chargés EN PARALLÈLE (ajout B). */
export interface ReferentialsData {
  status: "loading" | "ready" | "error";
  wilayas: WilayaDTO[];
  amenities: AmenityDTO[];
  /** cityId → libellés, pour afficher la commune sans re-parcourir l'arbre. */
  cityById: Map<string, { nameFr: string; nameAr: string }>;
  reload: () => void;
}

/**
 * Charge wilayas + amenities en parallèle (ajout B — correctif bloquant B).
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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void Promise.all([referentials.listWilayas(), referentials.listAmenities()])
      .then(([loadedWilayas, loadedAmenities]) => {
        if (cancelled) return;
        setWilayas(loadedWilayas);
        setAmenities(loadedAmenities);
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

  return { status, wilayas, amenities, cityById, reload };
}
