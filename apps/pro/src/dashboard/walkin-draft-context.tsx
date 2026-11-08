// Rang 47 (D345) — le fournisseur du brouillon du parcours « Nouvelle réservation ».
//
// ── Pourquoi un fournisseur au-dessus des routes ─────────────────────────────
// Le parcours (`WalkinJourney`) garde ses réponses dans des `useState` locaux : changer d'onglet (« Demandes », « Calendrier »…) le DÉMONTE, et au retour le pro
// retrouvait la première question, vide. Le brouillon vit donc ICI, dans un composant monté AU-DESSUS des routes (`AppProviders`), à côté de `ProVenuesProvider`.
//
// ⛔ EN MÉMOIRE SEULEMENT (R-1). Ni `localStorage`, ni `sessionStorage`, ni `IndexedDB`, ni cookie : le brouillon porte le numéro, l'e-mail et le nom d'un client, et
// le poste du comptoir est partagé. Il survit au changement d'onglet, il ne survit NI au rechargement NI à la fermeture (R-2) — c'est le comportement attendu, et
// aucun texte ne l'annonce à l'écran. Une garde de SOURCE (`walkin-draft.test.tsx`) lit ce fichier et le module pur.
//
// ── Ce qui l'efface (R-4, R-5) ───────────────────────────────────────────────
//   · la déconnexion et le changement de compte : l'effacement suit l'identifiant du compte (`user.id`, jamais l'objet `user` : `reloadUser` et `applyUser` remplacent
//     l'objet sans changer le compte, et ne doivent rien effacer) ;
//   · le brouillon d'une AUTRE salle : `lire` l'efface au lieu de le montrer ;
//   · la fin du parcours : le parcours appelle `effacer` ; « Recommencer » remet les réponses à zéro, et le parcours en rend l'état vide au fournisseur à son rendu suivant.
//
// ⚠ L'écriture ne fait RIEN rendre : le brouillon est dans une référence, pas dans un état React. Le parcours écrit à chaque rendu ; un état ferait re-rendre tout
// l'arbre abonné à chaque frappe.
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../auth/auth-context";
import type { WalkinDraft } from "./walkin-draft";

export interface WalkinDraftStore {
  /** Le brouillon de CETTE salle pour CE compte, ou `null`. Un brouillon d'une autre salle est EFFACÉ, pas rendu. */
  lire: (venueId: string) => WalkinDraft | null;
  /** Garde le brouillon (le dernier écrit remplace le précédent). */
  ecrire: (brouillon: WalkinDraft) => void;
  effacer: () => void;
}

const WalkinDraftContext = createContext<WalkinDraftStore | null>(null);

export function WalkinDraftProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const gardeRef = useRef<WalkinDraft | null>(null);

  // Déconnexion ou autre compte : le brouillon est oublié. ⚠ Cet effacement est la SEULE protection de ce cas, et elle est mesurée seule : un brouillon d'un compte ne
  // doit pas être rendu au même compte qui se reconnecte (R-4). Il court aussi au montage du fournisseur — un arbre neuf (rechargement) part toujours à vide.
  useEffect(() => {
    gardeRef.current = null;
  }, [userId]);

  const store = useMemo<WalkinDraftStore>(
    () => ({
      lire: (venueId) => {
        const garde = gardeRef.current;
        if (garde === null) return null;
        // R-5 : le brouillon d'une AUTRE salle n'est pas montré — il est effacé.
        if (garde.venueId !== venueId) {
          gardeRef.current = null;
          return null;
        }
        return garde;
      },
      ecrire: (brouillon) => {
        gardeRef.current = brouillon;
      },
      effacer: () => {
        gardeRef.current = null;
      }
    }),
    []
  );

  return <WalkinDraftContext.Provider value={store}>{children}</WalkinDraftContext.Provider>;
}

export function useWalkinDraft(): WalkinDraftStore {
  const ctx = useContext(WalkinDraftContext);
  if (ctx === null) throw new Error("useWalkinDraft doit être utilisé sous <WalkinDraftProvider>.");
  return ctx;
}
