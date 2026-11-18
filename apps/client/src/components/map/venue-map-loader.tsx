"use client";

// Carte — session « carte », lot CA-2. CHARGE les points (`GET /venue-map`) et rend la carte, ou dit pourquoi il n'y en a pas.
//
// ⛔ CE COMPOSANT NE SE MONTE QU'AU MOMENT OÙ LA CARTE DOIT S'AFFICHER (décision R-9, adoptée par Ko) : sur la recherche, au
// geste (la bascule « carte ») ; sur l'accueil, quand la section approche de l'écran. Le monter, c'est demander les points —
// puis, s'il y en a, charger la bibliothèque de carte et les tuiles d'un tiers, qui reçoit alors l'adresse IP du visiteur.
// Aucun appelant ne doit le rendre « au cas où ».
//
// ── Quatre issues, quatre phrases (D217 : un refus ne se replie pas sur une panne, et l'inverse) ────────────────────
//   · pas de fond de carte configuré (production sans variable) ⇒ « carte indisponible », et AUCUNE requête n'est lancée ;
//   · les points se chargent ⇒ un état d'attente annoncé ;
//   · la route de points ne répond pas ⇒ un message et un bouton « Réessayer » — jamais une page blanche, jamais « 0 salle » ;
//   · les points sont là ⇒ la carte.
import { useEffect, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import type { LeafletCanvasProps, MapTiles } from "@zwadj/ui";
import { getVenueMap, type VenueMapOutcome } from "../../lib/api";
import { CLIENT_MAP_TILES } from "../../lib/map-tiles-env";
import { VenuePointsMap } from "./venue-points-map";

export interface VenueMapLoaderProps {
  /** Querystring de l'API (celle de `toApiQuery`), `""` : toutes les salles publiques. */
  query: string;
  ar: boolean;
  headingLevel?: 2 | 3;
  /** Le fond de carte — par défaut celui de l'environnement. `null` : pas de carte. */
  tiles?: MapTiles | null;
  /** Injectables pour les tests de composant. */
  load?: (query: URLSearchParams, signal?: AbortSignal) => Promise<VenueMapOutcome>;
  loadCanvas?: () => Promise<{ default: ComponentType<LeafletCanvasProps> }>;
}

type Etat = { kind: "loading" } | VenueMapOutcome;

export function VenueMapLoader({
  query,
  ar,
  headingLevel = 2,
  tiles = CLIENT_MAP_TILES,
  load = getVenueMap,
  loadCanvas
}: VenueMapLoaderProps) {
  const t = useTranslations("map");
  const [etat, setEtat] = useState<Etat>({ kind: "loading" });
  // Incrémenté par « Réessayer » : relance l'effet sans changer la requête.
  const [essai, setEssai] = useState(0);
  const sansFond = tiles === null;

  useEffect(() => {
    if (sansFond) return;
    const controller = new AbortController();
    let annule = false;
    setEtat({ kind: "loading" });
    void load(new URLSearchParams(query), controller.signal).then((issue) => {
      // ⚠ Une réponse arrivée APRÈS un changement de filtres ne doit pas écraser la suivante.
      if (!annule) setEtat(issue);
    });
    return () => {
      annule = true;
      controller.abort();
    };
  }, [query, essai, sansFond, load]);

  if (tiles === null) {
    return (
      <div className="map-panel">
        <h2 className="map-panel-title">{t("unavailableTitle")}</h2>
        <p className="map-panel-body">{t("unavailableBody")}</p>
      </div>
    );
  }
  if (etat.kind === "loading") {
    return (
      <div className="map-panel" role="status">
        <p className="map-panel-body">{t("loading")}</p>
      </div>
    );
  }
  if (etat.kind === "unreachable") {
    return (
      <div className="state-panel" role="alert">
        <h2>{t("pointsErrorTitle")}</h2>
        <p>{t("pointsErrorBody")}</p>
        <p>
          <button type="button" className="btn btn-accent" onClick={() => setEssai((n) => n + 1)}>
            {t("retry")}
          </button>
        </p>
      </div>
    );
  }
  return <VenuePointsMap response={etat.data} tiles={tiles} ar={ar} headingLevel={headingLevel} loadCanvas={loadCanvas} />;
}
