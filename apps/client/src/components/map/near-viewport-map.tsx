"use client";

// Carte — session « carte », lot CA-3. La carte de l'ACCUEIL : elle se monte quand sa section APPROCHE de l'écran, pas au
// chargement de la page (décision R-9, adoptée par Ko — « sur l'accueil la carte apparaît en descendant »).
//
// ── Pourquoi pas au chargement ──────────────────────────────────────────────
// Monter la carte, c'est demander les points, puis la bibliothèque, puis des tuiles à un tiers qui reçoit l'adresse IP du
// visiteur. L'accueil est la page la plus vue, et la section carte est loin sous le héros : la plupart des visiteurs ne
// descendent pas jusque-là. Ils ne doivent ni payer ce poids ni être signalés à un tiers pour une carte qu'ils ne voient pas.
//
// ── Trois cas, écrits ───────────────────────────────────────────────────────
//   · le navigateur sait observer (`IntersectionObserver`) : la carte se monte quand la section est dans une marge autour
//     de l'écran ET que le visiteur a fait défiler la page — jamais à la seule ouverture —, UNE fois (tout est débranché
//     aussitôt) ;
//   · il ne sait pas : un BOUTON « Afficher la carte » — un geste, comme sur la recherche ;
//   · sans JavaScript : ni l'un ni l'autre n'existe. La section garde son titre, sa phrase et son LIEN vers la recherche,
//     qui marche sans script. Le bouton n'est rendu qu'APRÈS le montage : un bouton mort apprendrait que le site ne marche pas.
//   · pas de fond de carte (production sans variable) : « carte indisponible », tout de suite, sans rien observer.
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import type { LeafletCanvasProps, MapTiles } from "@zwadj/ui";
import type { VenueMapOutcome } from "../../lib/api";
import { CLIENT_MAP_TILES } from "../../lib/map-tiles-env";
import { VenueMapLoader } from "./venue-map-loader";

/** Marge autour de l'écran à partir de laquelle la carte se prépare : assez pour qu'elle soit là quand on y arrive, pas
 *  assez pour qu'elle se charge sur un écran haut dès l'ouverture de la page. */
export const NEAR_VIEWPORT_MARGIN = "400px";

export interface NearViewportMapProps {
  /** Querystring de l'API, `""` : toutes les salles publiques. */
  query: string;
  ar: boolean;
  headingLevel?: 2 | 3;
  tiles?: MapTiles | null;
  load?: (query: URLSearchParams, signal?: AbortSignal) => Promise<VenueMapOutcome>;
  loadCanvas?: () => Promise<{ default: ComponentType<LeafletCanvasProps> }>;
}

/** `attente` : rendu serveur et premier rendu (rien d'interactif) ; `observe` : l'observateur est branché ;
 *  `geste` : pas d'observateur, il faut un clic ; `montee` : la carte est là. */
type Etat = "attente" | "observe" | "geste" | "montee";

export function NearViewportMap({ query, ar, headingLevel = 3, tiles = CLIENT_MAP_TILES, load, loadCanvas }: NearViewportMapProps) {
  const t = useTranslations("map");
  const holder = useRef<HTMLDivElement | null>(null);
  const [etat, setEtat] = useState<Etat>("attente");
  const sansFond = tiles === null;

  useEffect(() => {
    if (sansFond) return;
    const element = holder.current;
    if (typeof IntersectionObserver === "undefined" || element === null) {
      setEtat("geste");
      return;
    }
    setEtat("observe");
    // ⛔ DEUX conditions, pas une (réparé au lot CA-6, défaut vu dans un navigateur) : la section est PROCHE de l'écran, ET
    // le visiteur a FAIT DÉFILER la page. Sur une page courte ou un écran haut, la section est déjà dans la marge à
    // l'ouverture : « proche » seul montait la carte au chargement, sans aucun geste — ce que R-9 interdit. Le bouton
    // reste offert à qui voit la section sans avoir défilé.
    let proche = false;
    // Une page rouverte au milieu (retour arrière, rechargement) a déjà défilé.
    let defile = window.scrollY > 0;
    const debrancher = () => {
      observer.disconnect();
      window.removeEventListener("scroll", surDefilement);
    };
    const monter = () => {
      if (!proche || !defile) return;
      // UNE fois : la carte montée le reste, même si la section ressort de l'écran.
      debrancher();
      setEtat("montee");
    };
    const surDefilement = () => {
      defile = true;
      monter();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        // Le DERNIER relevé fait foi : un lot peut porter une entrée puis une sortie de la marge.
        proche = entries[entries.length - 1]?.isIntersecting === true;
        monter();
      },
      { rootMargin: NEAR_VIEWPORT_MARGIN }
    );
    observer.observe(element);
    window.addEventListener("scroll", surDefilement, { passive: true });
    return debrancher;
  }, [sansFond]);

  if (sansFond || etat === "montee") {
    return (
      <div ref={holder} className="hm-map-frame">
        <VenueMapLoader query={query} ar={ar} headingLevel={headingLevel} tiles={tiles} load={load} loadCanvas={loadCanvas} />
      </div>
    );
  }
  return (
    <div ref={holder} className="hm-map-frame">
      <div className="map-panel">
        <p className="map-panel-body">{t("home.waiting")}</p>
        {etat === "attente" ? null : (
          // Présent aussi quand l'observateur est branché : qui ne veut pas attendre peut demander la carte.
          <button type="button" className="btn btn-ghost" onClick={() => setEtat("montee")}>
            {t("home.show")}
          </button>
        )}
      </div>
    </div>
  );
}
