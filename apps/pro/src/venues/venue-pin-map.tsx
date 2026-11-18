// Carte — session « carte », lot CA-5. POSER LE POINT de la salle sur une carte, dans le formulaire du pro.
//
// ── Ce que la carte fait, et ce qu'elle ne remplace pas ─────────────────────
// Un clic pose le point, un glissement le déplace ; dans les deux cas la latitude ET la longitude sont écrites ENSEMBLE dans
// les deux champs du formulaire, à la précision de la base (six décimales). Les deux champs texte RESTENT : c'est le chemin
// au clavier et au lecteur d'écran, et la source de vérité du formulaire — la carte ne garde aucune position à elle. La
// règle « latitude et longitude ensemble » (`venue.validation.coordsPair`, schéma partagé) n'est pas touchée : la carte ne
// peut écrire qu'une paire.
//
// ── Ce qu'elle ne fait PAS ──────────────────────────────────────────────────
// Elle ne déduit pas l'adresse du point (« géocodage inverse ») : c'est un service tiers, une décision de Ko, hors session.
// Elle n'enregistre rien : comme tout le formulaire, c'est « Enregistrer » qui écrit.
//
// ── Quand elle se charge ────────────────────────────────────────────────────
// Au GESTE (« Placer la salle sur la carte »), comme les cartes du site client : la bibliothèque et les tuiles d'un tiers ne
// sont demandées que si le pro ouvre la carte.
import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { VenueMap, type LeafletCanvasProps, type MapPosition, type MapTiles } from "@zwadj/ui";
import { PRO_MAP_TILES } from "../lib/map-tiles-env";

export interface VenuePinMapProps {
  /** La position que portent les deux champs, si elle est lisible et plausible ; `null` sinon (champs vides, saisie en cours). */
  pin: MapPosition | null;
  /** Le pro a posé ou déplacé le point : la position, déjà arrondie. */
  onPick: (position: MapPosition) => void;
  tiles?: MapTiles | null;
  loadCanvas?: () => Promise<{ default: ComponentType<LeafletCanvasProps> }>;
}

export function VenuePinMap({ pin, onPick, tiles = PRO_MAP_TILES, loadCanvas }: VenuePinMapProps) {
  const { t, i18n } = useTranslation();
  const [ouverte, setOuverte] = useState(false);

  if (tiles === null) {
    // Production sans fond de carte : les deux champs restent, la carte ne s'offre pas.
    return <p className="field-hint">{t("map.unavailableTitle")}</p>;
  }
  return (
    <div className="venue-pin-map">
      <button type="button" className="btn btn-ghost" aria-expanded={ouverte} onClick={() => setOuverte((v) => !v)}>
        {ouverte ? t("map.pin.hide") : t("map.pin.show")}
      </button>
      {ouverte ? (
        <>
          <p className="field-hint">{t("map.pin.hint")}</p>
          <VenueMap
            tiles={tiles}
            pin={pin}
            onPinChange={onPick}
            labels={{
              region: t("map.pin.region"),
              zoomIn: t("map.zoomIn"),
              zoomOut: t("map.zoomOut"),
              loading: t("map.loading"),
              loadError: t("map.loadError"),
              tilesError: t("map.tilesError"),
              pin: t("map.pin.label")
            }}
            rtl={i18n.dir() === "rtl"}
            loadCanvas={loadCanvas}
          />
        </>
      ) : null}
    </div>
  );
}
