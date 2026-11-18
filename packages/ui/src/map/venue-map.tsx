"use client";

// Carte — session « carte », lot CA-2. LA carte des deux applications : un cadre, la carte Leaflet chargée À LA DEMANDE, et
// la mention d'attribution du fond de carte.
//
// ── Pourquoi ici, dans `@zwadj/ui` ──────────────────────────────────────────
// Le client montre des salles sur une carte ; le pro y pose le point de la sienne. Deux copies d'un même cadre auraient
// divergé (D223) — et deux endroits qui importent la bibliothèque de carte, c'est deux endroits où elle peut retomber dans
// le paquet initial d'une page.
//
// ── Quand la bibliothèque se charge ─────────────────────────────────────────
// `leaflet-canvas.tsx` (le seul fichier qui importe Leaflet) n'est demandé qu'APRÈS le montage dans le navigateur, par
// `import()`. Conséquences voulues : rien de Leaflet n'est évalué au rendu serveur ; rien n'entre dans le paquet initial ;
// et tant que ce composant n'est pas MONTÉ, aucune requête ne part vers le fournisseur de tuiles. C'est l'appelant qui
// décide QUAND le monter (au geste, ou à l'approche de l'écran — décision R-9) : ce composant ne se monte jamais seul.
//
// ── Ce qu'il ne fait pas ────────────────────────────────────────────────────
// Aucune i18n (les libellés arrivent en props, traduits par l'appelant — comme `PhoneField`). Aucune requête de données.
// Aucune carte de salle : choisir un point appelle `onSelect`, l'appelant rend ce qu'il veut à côté.
import { useEffect, useState, type ComponentType } from "react";
import type { LeafletCanvasProps, MapMarker } from "./leaflet-canvas";
import type { MapPosition, MapTiles } from "./map-tiles";

export interface VenueMapLabels {
  /** Nom de la région pour un lecteur d'écran (« Carte des salles »). */
  region: string;
  zoomIn: string;
  zoomOut: string;
  /** Affiché pendant que la bibliothèque de carte arrive. */
  loading: string;
  /** La bibliothèque de carte n'a pas pu être chargée (réseau coupé au mauvais moment). */
  loadError: string;
  /** Au moins une tuile du fond de carte n'a pas pu être chargée. */
  tilesError: string;
  /** Nom du point posé (mode pro). */
  pin?: string;
}

export interface VenueMapProps {
  tiles: MapTiles;
  markers?: readonly MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pin?: MapPosition | null;
  onPinChange?: (position: MapPosition) => void;
  labels: VenueMapLabels;
  rtl?: boolean;
  /** ⚠ POUR LES TESTS de composant : remplace le chargement de Leaflet. Par défaut, le vrai. jsdom ne calcule aucune mise
   *  en page — y monter Leaflet ne mesurerait que jsdom ; la vraie carte est mesurée dans un navigateur (e2e). */
  loadCanvas?: () => Promise<{ default: ComponentType<LeafletCanvasProps> }>;
}

const SANS_POINT: readonly MapMarker[] = [];
const chargerLeaflet = () => import("./leaflet-canvas");

type Chargement = { etat: "attente" } | { etat: "pret"; Canvas: ComponentType<LeafletCanvasProps> } | { etat: "echec" };

export function VenueMap({
  tiles,
  markers = SANS_POINT,
  selectedId = null,
  onSelect,
  pin,
  onPinChange,
  labels,
  rtl = false,
  loadCanvas = chargerLeaflet
}: VenueMapProps) {
  const [chargement, setChargement] = useState<Chargement>({ etat: "attente" });
  const [tuilesEnEchec, setTuilesEnEchec] = useState(false);

  useEffect(() => {
    let annule = false;
    loadCanvas().then(
      (module) => {
        if (!annule) setChargement({ etat: "pret", Canvas: module.default });
      },
      () => {
        if (!annule) setChargement({ etat: "echec" });
      }
    );
    return () => {
      annule = true;
    };
  }, [loadCanvas]);

  return (
    <div className="zw-map">
      {chargement.etat === "pret" ? (
        <chargement.Canvas
          tiles={tiles}
          markers={markers}
          selectedId={selectedId}
          onSelect={onSelect}
          pin={pin}
          onPinChange={onPinChange}
          labels={labels}
          rtl={rtl}
          onTilesError={() => setTuilesEnEchec(true)}
        />
      ) : (
        // Même boîte que la carte : la page ne saute pas quand elle arrive.
        <div className="zw-map-canvas zw-map-waiting" role={chargement.etat === "echec" ? "alert" : "status"}>
          {chargement.etat === "echec" ? labels.loadError : labels.loading}
        </div>
      )}

      {/* Le fond n'est pas la donnée : les points restent justes sur un fond gris. On le DIT, on ne retire pas la carte. */}
      {tuilesEnEchec ? (
        <p className="zw-map-note" role="alert">
          {labels.tilesError}
        </p>
      ) : null}

      {/* La mention du fournisseur, en TEXTE (jamais `dangerouslySetInnerHTML` : elle vient d'une variable d'environnement).
          `dir="ltr"` : c'est un nom propre et un signe ©, pas une phrase de la page. */}
      <p className="zw-map-attribution" dir="ltr">
        {tiles.attributionUrl === null ? (
          tiles.attribution
        ) : (
          <a href={tiles.attributionUrl} target="_blank" rel="noopener noreferrer">
            {tiles.attribution}
          </a>
        )}
      </p>
    </div>
  );
}
