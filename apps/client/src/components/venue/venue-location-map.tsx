"use client";

// Carte — session « carte », lot CA-4. La POSITION d'une salle sur sa fiche, sous l'adresse.
//
// ⛔ MONTÉE AU GESTE SEULEMENT (« Voir sur la carte ») — décision R-9, même parti que la visite virtuelle (`MatterportEmbed`,
// D45) : la carte est un tiers et un poids. La fiche est la page qu'on veut indexée et rapide ; qui ne fait que comparer des
// prix ne paie pas la carte et n'est pas signalé au fournisseur de tuiles.
//
// Le composant n'est rendu que si la salle A des coordonnées (c'est l'appelant qui le décide) : sans coordonnées, la fiche
// ne montre RIEN de plus que l'adresse — pas un bouton qui ouvrirait une carte vide.
//
// Le point n'est pas un bouton : il n'y a rien à choisir, la fiche est déjà celle de la salle. Il porte son nom.
import { useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { VenueMap, type LeafletCanvasProps, type MapTiles } from "@zwadj/ui";
import { CLIENT_MAP_TILES } from "../../lib/map-tiles-env";
import { useMapLabels } from "../map/venue-points-map";

export interface VenueLocationMapProps {
  lat: number;
  lng: number;
  /** Nom de la salle, dans la langue de la page : le nom accessible du point et de la carte. */
  name: string;
  ar: boolean;
  tiles?: MapTiles | null;
  loadCanvas?: () => Promise<{ default: ComponentType<LeafletCanvasProps> }>;
}

export function VenueLocationMap({ lat, lng, name, ar, tiles = CLIENT_MAP_TILES, loadCanvas }: VenueLocationMapProps) {
  const t = useTranslations("map");
  const labels = useMapLabels(t("venue.region", { name }));
  const [montee, setMontee] = useState(false);

  if (tiles === null) {
    // Production sans fond de carte : on le DIT, en une ligne — jamais un bouton qui ouvrirait une carte cassée.
    return <p className="venue-location-note">{t("unavailableTitle")}</p>;
  }
  if (!montee) {
    return (
      <div className="venue-location-ask">
        <button type="button" className="btn btn-ghost" onClick={() => setMontee(true)}>
          {t("venue.show")}
        </button>
        {/* Le tiers est ANNONCÉ avant le clic, comme le poids de la visite virtuelle. */}
        <p className="venue-location-note">{t("venue.notice")}</p>
      </div>
    );
  }
  return (
    <div className="venue-location-map">
      <VenueMap tiles={tiles} markers={[{ id: "venue", lat, lng, label: name }]} labels={labels} rtl={ar} loadCanvas={loadCanvas} />
    </div>
  );
}
