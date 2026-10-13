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
//
// ── Deux façons de RELIRE, et ce qui les sépare (rang 37, D331) ───────────────
// La liste se périmait : relue à la connexion, à la création (D326) et depuis la
// liste elle-même, elle restait celle d'AVANT après une édition, une suppression
// faite depuis l'assistant, ou une publication faite par l'administrateur dans une
// AUTRE session (D327, relevé 4). Deux relectures, deux garanties :
//   · `reload()` — la relecture VOULUE (« Réessayer », et tout ce qui suit une
//     ÉCRITURE réussie : création, édition, suppression). Elle passe par `loading`
//     (la liste connue ne se montre plus : la salle qu'on vient de supprimer ne doit
//     jamais être montrée comme présente) et son échec est un ÉTAT (`error`) : l'écran
//     ne dit pas « à jour » ce qu'il ne sait pas.
//   · `revalidate()` — la relecture d'ENTRÉE de la liste (la publication faite
//     ailleurs : aucune notification ne peut atteindre ce pro). Elle est SILENCIEUSE :
//     la liste connue reste affichée pendant la lecture, et un échec — ou une réponse
//     qui n'est pas un tableau — la LAISSE telle quelle (la remplacer par `error` ou
//     par une liste vide présenterait un compte faux comme un fait, D133, D142).
//
// ⚠ `revalidate()` NE FAIT RIEN dans trois cas, et c'est exigé : (1) pendant le
// chargement de démarrage ou après un `reload()` en cours — une seconde requête serait
// une cascade, et l'e2e A2 exige UNE seule lecture pour l'entrée à froid sur `/salles` ;
// (2) sur l'état `error` — le bouton « Réessayer » reste la voie ; (3) à la seconde
// exécution d'un montage doublé (`StrictMode`), qui trouve la première déjà demandée.
// C'est `idleRef` qui le dit : vrai SEULEMENT quand la liste est connue et qu'aucune
// lecture n'est demandée ni en cours ; la dernière lecture DEMANDÉE gagne (l'effet
// annule la précédente), si bien qu'une réponse tardive ne remplace jamais une plus fraîche.
//
// ⚠ `silentRef` est CONSOMMÉ par l'effet à chacune de ses exécutions, y compris quand
// aucun PRO n'est connecté : sinon un drapeau armé avant une déconnexion rendrait
// SILENCIEUSE la première lecture de la session suivante, et la liste d'un autre
// compte resterait affichée jusqu'à la réponse.
//
// ⚠ `count` garde le DERNIER compte connu pendant une relecture voulue : à l'état
// `loading` il valait 0, et un pro à deux salles voyait « Mes salles » → « Ma salle »
// → « Mes salles » à chaque enregistrement (F-17). Au premier chargement il vaut
// toujours 0 : le libellé ne se rétracte pas.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  /** Nombre de salles, 0 tant que la liste n'a jamais été là. Pendant une relecture
   *  voulue il garde le dernier compte connu. Le libellé adaptatif se lit dessus : il
   *  ne doit jamais afficher « Mes salles » par accident pendant le chargement, puis
   *  se rétracter. */
  count: number;
  select: (id: string) => void;
  /** Relecture VOULUE : passe par `loading`, son échec est l'état `error`. */
  reload: () => void;
  /** Relecture d'ENTRÉE de la liste : silencieuse, sans effet pendant un chargement ou sur `error`. */
  revalidate: () => void;
}

const ProVenuesContext = createContext<ProVenuesValue | null>(null);

export function ProVenuesProvider({ children }: { children: React.ReactNode }) {
  const venuesApi = useVenueCrud();
  const { user } = useAuth();
  const isPro = user?.role === "PRO";

  // ⚠ L'état ET le dernier compte connu vivent dans UN seul `useState` : deux `setState` par lecture doubleraient le nombre de « not wrapped in act(...) » de chaque fichier de test
  // dont la lecture se termine après la fin du test (les plafonds de console de `src/test-setup.ts` les comptent).
  const [snap, setSnap] = useState<{ state: ProVenuesState; knownCount: number }>({ state: { kind: "loading" }, knownCount: 0 });
  const { state, knownCount } = snap;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** Armé par `revalidate()`, consommé par la prochaine exécution de l'effet. */
  const silentRef = useRef(false);
  /** Vrai seulement quand la liste est connue et qu'aucune lecture n'est demandée ni en cours. */
  const idleRef = useRef(false);

  useEffect(() => {
    const silent = silentRef.current;
    silentRef.current = false;
    if (!isPro) return;
    let cancelled = false;
    // Une relecture silencieuse ne masque la liste que si elle n'est pas connue.
    setSnap((prev) => (silent && prev.state.kind === "ready" ? prev : { state: { kind: "loading" }, knownCount: prev.knownCount }));
    venuesApi
      .listMine()
      .then((list) => {
        if (cancelled) return;
        // D120 — GARDE DE FORME. Ce provider est monté au-dessus de TOUTE la
        // zone protégée : un `.length` sur autre chose qu'un tableau ne ferait
        // pas tomber une section, il ferait tomber l'application entière. C'est
        // la cascade de la leçon C5b, en pire.
        if (!Array.isArray(list)) {
          // Une relecture d'entrée ne remplace pas une liste connue par une liste VIDE : un compte faux présenté comme un fait.
          setSnap((prev) => (silent && prev.state.kind === "ready" ? prev : { state: { kind: "ready", venues: [] }, knownCount: 0 }));
          idleRef.current = true;
          return;
        }
        setSnap({ state: { kind: "ready", venues: list }, knownCount: list.length });
        idleRef.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        // Un échec de relecture silencieuse LAISSE la liste connue ; un échec de lecture voulue est un ÉTAT.
        setSnap((prev) => (silent && prev.state.kind === "ready" ? prev : { state: { kind: "error" }, knownCount: prev.knownCount }));
        idleRef.current = silent;
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

  const reload = useCallback(() => {
    silentRef.current = false;
    idleRef.current = false;
    setAttempt((n) => n + 1);
  }, []);

  const revalidate = useCallback(() => {
    if (!idleRef.current) return;
    idleRef.current = false;
    silentRef.current = true;
    setAttempt((n) => n + 1);
  }, []);

  const count = state.kind === "ready" ? venues.length : knownCount;

  const value = useMemo<ProVenuesValue>(
    () => ({ state, current, count, select: setSelectedId, reload, revalidate }),
    [state, current, count, reload, revalidate]
  );

  return <ProVenuesContext.Provider value={value}>{children}</ProVenuesContext.Provider>;
}

export function useProVenues(): ProVenuesValue {
  const ctx = useContext(ProVenuesContext);
  if (!ctx) throw new Error("useProVenues doit être utilisé sous <ProVenuesProvider>.");
  return ctx;
}
