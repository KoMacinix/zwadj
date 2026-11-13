"use client";

// Carte — session « carte », lot CA-2. LE SEUL FICHIER DU DÉPÔT QUI IMPORTE LEAFLET.
//
// ⛔ IL N'EST JAMAIS IMPORTÉ STATIQUEMENT. `venue-map.tsx` le charge par `import()` au moment où une carte doit
// réellement s'afficher : la bibliothèque (et sa feuille de style) vit donc dans un morceau À PART, hors du paquet initial
// des pages, et n'est jamais évaluée au rendu serveur — Leaflet lit `window` dès son import. Gardé par
// `apps/client/src/lib/leaflet-import-guard.test.ts`.
//
// ── Ce que ce fichier fait de Leaflet, et ce qu'il n'en fait pas ────────────
//   · PAS de `L.popup` : la petite carte d'une salle est rendue par React, HORS de la carte, par l'appelant — traduite,
//     testable, lisible par un lecteur d'écran. Un point ne fait que DIRE qu'il a été choisi (`onSelect`).
//   · PAS d'icône image : le marqueur par défaut de Leaflet est un PNG que les empaqueteurs résolvent mal, et il ignore le
//     thème. Les points sont des `divIcon` dessinés en CSS avec les jetons (`.zw-map-pin`, `packages/ui/styles.css`).
//   · PAS de contrôle d'attribution de Leaflet : il injecte sa chaîne comme du HTML. La mention est rendue en TEXTE par
//     `venue-map.tsx`, sous la carte.
//   · PAS de zoom à la molette : sur une page qui défile, la molette au-dessus de la carte doit continuer à faire défiler la
//     page. On zoome par les boutons, le double-clic, le pincement, ou le clavier (+ / −) quand la carte a le focus.
//   · Le conteneur est `dir="ltr"` même dans une page arabe : Leaflet place ses calques par décalages physiques.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  SINGLE_POINT_ZOOM,
  boundsOf,
  isMapPosition,
  roundCoordinate,
  type MapPosition,
  type MapTiles
} from "./map-tiles";

export interface MapMarker extends MapPosition {
  id: string;
  /** Nom accessible du point (le nom de la salle, dans la langue de la page). */
  label: string;
}

export interface LeafletCanvasProps {
  tiles: MapTiles;
  /** Points à montrer. La carte se cadre sur eux à chaque changement de l'ensemble. */
  markers: readonly MapMarker[];
  /** Point mis en avant (celui dont la carte de salle est ouverte). */
  selectedId: string | null;
  /** Absent : les points ne sont pas des boutons (fiche d'une salle : un point, rien à choisir). */
  onSelect?: (id: string) => void;
  /** MODE « POSER LE POINT » (pro). `undefined` : mode lecture. `null` : aucun point posé encore. */
  pin?: MapPosition | null;
  /** Clic sur la carte ou fin de glissement du point : la position, déjà arrondie à la précision de la base. */
  onPinChange?: (position: MapPosition) => void;
  labels: { region: string; zoomIn: string; zoomOut: string; pin?: string };
  /** Page en arabe : les boutons de zoom passent du côté du début de ligne. */
  rtl: boolean;
  /** Une tuile n'a pas pu être chargée. Appelé UNE fois : l'appelant affiche un message, la carte reste. */
  onTilesError?: () => void;
}

/** Côté du carré qui dessine le point (`.zw-map-pin`, `packages/ui/styles.css`). */
const PIN_SIZE = 28;
/** La POINTE du point est sa position. Le carré est tourné de −45° autour de son centre : son coin vif descend à
 *  (côté / 2) × √2 sous le centre, soit ~6 px sous le bord bas du carré. */
const PIN_ANCHOR: [number, number] = [PIN_SIZE / 2, Math.round(PIN_SIZE / 2 + (PIN_SIZE / 2) * Math.SQRT2)];

const pinIcon = (selected: boolean, draggable: boolean): L.DivIcon =>
  L.divIcon({
    className: `zw-map-pin${selected ? " is-selected" : ""}${draggable ? " is-draggable" : ""}`,
    html: "",
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: PIN_ANCHOR
  });

export default function LeafletCanvas({
  tiles,
  markers,
  selectedId,
  onSelect,
  pin,
  onPinChange,
  labels,
  rtl,
  onTilesError
}: LeafletCanvasProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const pinMarker = useRef<L.Marker | null>(null);
  // Les rappels vivent dans des références : les effets qui bâtissent la carte ne doivent pas la rebâtir parce qu'un parent
  // a rendu une nouvelle fonction fléchée.
  const onSelectRef = useRef(onSelect);
  const onPinChangeRef = useRef(onPinChange);
  const onTilesErrorRef = useRef(onTilesError);
  onSelectRef.current = onSelect;
  onPinChangeRef.current = onPinChange;
  onTilesErrorRef.current = onTilesError;

  const pinMode = pin !== undefined;

  // ── 1. La carte elle-même : UNE fois par montage, détruite au démontage (StrictMode monte deux fois : le nettoyage
  //       doit rendre le conteneur réutilisable, d'où `remove()`).
  useEffect(() => {
    const element = holder.current;
    if (element === null) return;
    const instance = L.map(element, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      center: [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
      zoom: DEFAULT_MAP_ZOOM
    });
    L.control
      .zoom({ position: rtl ? "topleft" : "topright", zoomInTitle: labels.zoomIn, zoomOutTitle: labels.zoomOut })
      .addTo(instance);

    let signale = false;
    const layer = L.tileLayer(tiles.url, { maxZoom: 19 });
    layer.on("tileerror", () => {
      if (signale) return;
      signale = true;
      onTilesErrorRef.current?.();
    });
    layer.addTo(instance);

    markerLayer.current = L.layerGroup().addTo(instance);
    map.current = instance;
    // Le conteneur peut avoir reçu sa taille après la création (mise en page en cours) : Leaflet doit la relire.
    const frame = requestAnimationFrame(() => instance.invalidateSize());

    return () => {
      cancelAnimationFrame(frame);
      instance.remove();
      map.current = null;
      markerLayer.current = null;
      pinMarker.current = null;
    };
    // Les libellés et le sens d'écriture ne changent pas pendant la vie d'une carte (la langue change par navigation).
  }, [tiles.url]);

  // ── 2. Le cadrage : seulement quand l'ENSEMBLE des points change, jamais quand on en choisit un.
  const cadrage = markers.map((m) => `${m.id}:${m.lat}:${m.lng}`).join("|");
  useEffect(() => {
    const instance = map.current;
    if (instance === null || pinMode) return;
    const box = boundsOf(markers);
    if (box === null) {
      instance.setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], DEFAULT_MAP_ZOOM);
    } else if (markers.length === 1) {
      instance.setView([box.south, box.west], SINGLE_POINT_ZOOM);
    } else {
      instance.fitBounds(
        [
          [box.south, box.west],
          [box.north, box.east]
        ],
        { padding: [36, 36], maxZoom: SINGLE_POINT_ZOOM }
      );
    }
  }, [cadrage, pinMode, tiles.url]);

  // ── 3. Les points.
  useEffect(() => {
    const layer = markerLayer.current;
    if (layer === null) return;
    layer.clearLayers();
    if (pinMode) return;
    const interactive = onSelectRef.current !== undefined;
    for (const point of markers) {
      const marker = L.marker([point.lat, point.lng], {
        icon: pinIcon(point.id === selectedId, false),
        keyboard: interactive,
        interactive,
        title: point.label
      });
      if (interactive) marker.on("click", () => onSelectRef.current?.(point.id));
      marker.addTo(layer);
      const element = marker.getElement();
      if (element) {
        // Leaflet pose `role="button"` et `tabindex` (option `keyboard`) mais AUCUN nom accessible sur un `divIcon`.
        element.setAttribute("data-marker-id", point.id);
        if (interactive) {
          element.setAttribute("aria-label", point.label);
          element.setAttribute("aria-pressed", point.id === selectedId ? "true" : "false");
        } else {
          // Un point qu'on ne peut pas actionner n'est pas un bouton : c'est une image qui porte un nom.
          element.setAttribute("role", "img");
          element.setAttribute("aria-label", point.label);
        }
      }
    }
  }, [cadrage, selectedId, pinMode, tiles.url]);

  // ── 4. Le point POSÉ (pro) : un clic le pose, un glissement le déplace.
  const pinLat = pin === undefined || pin === null ? null : pin.lat;
  const pinLng = pin === undefined || pin === null ? null : pin.lng;
  useEffect(() => {
    const instance = map.current;
    if (instance === null || !pinMode) return;
    const emettre = (latlng: L.LatLng) => {
      const wrapped = latlng.wrap();
      const position = { lat: roundCoordinate(wrapped.lat), lng: roundCoordinate(wrapped.lng) };
      if (isMapPosition(position)) onPinChangeRef.current?.(position);
    };
    const surClic = (event: L.LeafletMouseEvent) => emettre(event.latlng);
    instance.on("click", surClic);
    return () => {
      instance.off("click", surClic);
    };
  }, [pinMode, tiles.url]);

  useEffect(() => {
    const instance = map.current;
    if (instance === null || !pinMode) return;
    if (pinLat === null || pinLng === null) {
      pinMarker.current?.remove();
      pinMarker.current = null;
      return;
    }
    if (pinMarker.current === null) {
      const marker = L.marker([pinLat, pinLng], { icon: pinIcon(true, true), draggable: true, keyboard: false });
      marker.on("dragend", () => {
        const wrapped = marker.getLatLng().wrap();
        const position = { lat: roundCoordinate(wrapped.lat), lng: roundCoordinate(wrapped.lng) };
        if (isMapPosition(position)) onPinChangeRef.current?.(position);
      });
      marker.addTo(instance);
      const element = marker.getElement();
      if (element) {
        element.setAttribute("data-marker-id", "pin");
        element.setAttribute("role", "img");
        if (labels.pin) element.setAttribute("aria-label", labels.pin);
      }
      pinMarker.current = marker;
      // Première apparition du point : on le montre de près. Ensuite la vue ne bouge plus toute seule — recentrer à
      // chaque glissement ferait fuir la carte sous le doigt.
      instance.setView([pinLat, pinLng], Math.max(instance.getZoom(), SINGLE_POINT_ZOOM));
    } else {
      pinMarker.current.setLatLng([pinLat, pinLng]);
      if (!instance.getBounds().contains([pinLat, pinLng])) instance.panTo([pinLat, pinLng]);
    }
  }, [pinLat, pinLng, pinMode, tiles.url]);

  return (
    <div
      ref={holder}
      className={pinMode ? "zw-map-canvas is-pinning" : "zw-map-canvas"}
      role="region"
      aria-label={labels.region}
      dir="ltr"
    />
  );
}
