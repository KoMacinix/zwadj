// Les salles du pro, chargées UNE FOIS pour toute la coquille — Lot UIP-A.
//
// ── Pourquoi un provider et pas un appel par écran ───────────────────────────
// Quatre consommateurs ont besoin de la même liste, pour quatre raisons :
//   1. le libellé ADAPTATIF de la navigation (décision ① : « Ma salle » à une
//      salle, « Mes salles » à partir de deux) ;
//   2. les écrans GLOBAUX (tableau de bord, demandes, calendrier, réservations)
//      dont les données sont, elles, portées par une salle : il faut savoir
//      LAQUELLE ;
//   3. le panneau gauche, qui affiche son nom ;
//   4. la page liste elle-même, qui les rend.
// Quatre `listMine()` pour une seule question, c'est quatre allers-retours — et
// la leçon D115 (double `POST /auth/refresh` au démarrage) dit assez ce que
// coûtent les appels dupliqués au montage.
//
// ⚠ IL NE CHARGE RIEN AVANT QU'UN PRO SOIT CONNECTÉ, et ce n'est pas une
// optimisation. Ce provider est monté au-dessus de TOUTES les routes, y compris
// `/auth/connexion` : sans cette garde, un visiteur anonyme sur l'écran de
// connexion déclencherait un `GET /pro/venues` qui ne peut que répondre 401 —
// exactement la famille de défauts de D115, un appel tiré parce que le
// composant est monté et non parce que quelqu'un l'a demandé.
//
// ⚠ La sélection ne vit qu'en MÉMOIRE. La persister demanderait de décider ce
// qui se passe quand la salle mémorisée a été supprimée depuis, et cette
// décision n'appartient pas à un lot de coquille.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { VenueProDTO } from "@zwadj/types";
import { useAuth } from "../auth/auth-context";
import { useVenueCrud } from "../venues/venue-client-context";

export type ProVenuesState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; venues: VenueProDTO[] };

export interface ProVenuesValue {
  state: ProVenuesState;
  /** Salle sur laquelle portent les écrans globaux. `null` tant qu'il n'y en a
   *  aucune — ce n'est pas une erreur, c'est un pro qui vient de s'inscrire. */
  current: VenueProDTO | null;
  /** Nombre de salles, 0 tant que la liste n'est pas là. Le libellé adaptatif se
   *  lit dessus : il ne doit jamais afficher « Mes salles » par accident pendant
   *  le chargement, puis se rétracter. */
  count: number;
  select: (id: string) => void;
  reload: () => void;
}

const ProVenuesContext = createContext<ProVenuesValue | null>(null);

export function ProVenuesProvider({ children }: { children: React.ReactNode }) {
  const venuesApi = useVenueCrud();
  const { user } = useAuth();
  const isPro = user?.role === "PRO";

  const [state, setState] = useState<ProVenuesState>({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isPro) return;
    let cancelled = false;
    setState({ kind: "loading" });
    venuesApi
      .listMine()
      .then((list) => {
        if (cancelled) return;
        // D120 — GARDE DE FORME. Ce provider est monté au-dessus de TOUTE la
        // zone protégée : un `.length` sur autre chose qu'un tableau ne ferait
        // pas tomber une section, il ferait tomber l'application entière. C'est
        // la cascade de la leçon C5b, en pire.
        setState({ kind: "ready", venues: Array.isArray(list) ? list : [] });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [venuesApi, isPro, attempt]);

  const venues = state.kind === "ready" ? state.venues : [];

  /** La sélection SURVIT au rechargement tant que la salle existe encore, et
   *  retombe sur la première sinon. Garder un id disparu afficherait un écran
   *  vide sans dire pourquoi. */
  const current = useMemo(() => {
    if (venues.length === 0) return null;
    return venues.find((v) => v.id === selectedId) ?? venues[0]!;
  }, [venues, selectedId]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<ProVenuesValue>(
    () => ({ state, current, count: venues.length, select: setSelectedId, reload }),
    [state, current, venues.length, reload]
  );

  return <ProVenuesContext.Provider value={value}>{children}</ProVenuesContext.Provider>;
}

export function useProVenues(): ProVenuesValue {
  const ctx = useContext(ProVenuesContext);
  if (!ctx) throw new Error("useProVenues doit être utilisé sous <ProVenuesProvider>.");
  return ctx;
}
