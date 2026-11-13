"use client";

// Carte — session « carte », lot CA-2. Les POINTS d'une réponse de `GET /venue-map`, la carte, et la petite carte de la
// salle choisie. Composant de PRÉSENTATION : il ne charge rien, il reçoit la réponse.
//
// ── Ce qui est DIT, et pas seulement montré ─────────────────────────────────
//   · combien de salles sont sur la carte ;
//   · combien n'y sont PAS faute de position (elles sont dans la liste : sans cette phrase, la carte se lit « voilà tout ») ;
//   · que la carte s'arrête au plafond quand elle tronque.
//
// ── L'argent ────────────────────────────────────────────────────────────────
// Le prix affiché est `basePriceCents` TEL QUE LE SERVEUR LE REND, mis en forme par `formatDZD`. Aucune opération sur un
// montant n'a lieu dans le navigateur (R-4).
import { useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";
import type { VenueMapPointDTO, VenueMapResponse } from "@zwadj/types";
import { VenueMap, type LeafletCanvasProps, type MapTiles, type VenueMapLabels } from "@zwadj/ui";
import { Link } from "../../i18n/navigation";
import { mediaSrc } from "../../lib/media-url";
import { venuePath } from "../../lib/routes";

/** Les libellés de la carte, traduits — UN endroit pour les trois écrans du client qui montent une carte. */
export function useMapLabels(region?: string): VenueMapLabels {
  const t = useTranslations("map");
  return {
    region: region ?? t("region"),
    zoomIn: t("zoomIn"),
    zoomOut: t("zoomOut"),
    loading: t("loading"),
    loadError: t("loadError"),
    tilesError: t("tilesError")
  };
}

export interface VenuePointsMapProps {
  response: VenueMapResponse;
  tiles: MapTiles;
  ar: boolean;
  /** Niveau du titre de la carte de salle : `h2` sous le `h1` de la recherche, `h3` sous une section de l'accueil. */
  headingLevel?: 2 | 3;
  loadCanvas?: () => Promise<{ default: ComponentType<LeafletCanvasProps> }>;
}

export function VenuePointsMap({ response, tiles, ar, headingLevel = 2, loadCanvas }: VenuePointsMapProps) {
  const t = useTranslations("map");
  const tCard = useTranslations("search.card");
  const labels = useMapLabels();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lang = ar ? "ar" : "fr";
  // ⚠ DEVANT UN RENDU (D120) : une réponse dont `points` n'est pas un tableau ferait tomber la section au `.map`.
  const points: VenueMapPointDTO[] = Array.isArray(response.points) ? response.points : [];
  const selected = points.find((point) => point.id === selectedId) ?? null;
  const Titre = headingLevel === 3 ? "h3" : "h2";
  const nameOf = (point: VenueMapPointDTO): string => (ar ? point.nameAr : point.nameFr);

  return (
    <div className="map-view">
      <div className="map-view-status" role="status">
        <p className="map-view-count">{t("count", { count: points.length })}</p>
        {response.withoutCoordinates > 0 ? (
          <p className="map-view-note">{t("withoutCoordinates", { count: response.withoutCoordinates })}</p>
        ) : null}
        {/* `=== true` : un champ absent ou mal typé ne doit pas annoncer une troncature qui n'a pas eu lieu. */}
        {response.truncated === true ? <p className="map-view-note">{t("truncated", { limit: response.limit })}</p> : null}
      </div>

      {points.length === 0 ? (
        // Aucune salle à situer : monter une carte vide chargerait le fond d'un tiers pour ne rien montrer.
        <p className="map-view-empty">{t("empty")}</p>
      ) : (
        <>
          <VenueMap
            tiles={tiles}
            markers={points.map((point) => ({ id: point.id, lat: point.lat, lng: point.lng, label: nameOf(point) }))}
            selectedId={selectedId}
            onSelect={setSelectedId}
            labels={labels}
            rtl={ar}
            loadCanvas={loadCanvas}
          />

          {selected === null ? null : (
            <article className="map-venue-card" aria-label={t("card.label")}>
              <div className="map-venue-card-media">
                {selected.coverThumbUrl ? (
                  <img src={mediaSrc(selected.coverThumbUrl)} alt="" loading="lazy" width={480} height={360} />
                ) : (
                  <div className="venue-card-nophoto">{tCard("noPhoto")}</div>
                )}
              </div>
              <div className="map-venue-card-body">
                <Titre className="map-venue-card-name">{nameOf(selected)}</Titre>
                <p className="map-venue-card-meta">{tCard("capacity", { max: selected.capacityMax })}</p>
                <p className="map-venue-card-price">
                  <span className="venue-card-from">{tCard("from")}</span>
                  {formatDZD(selected.basePriceCents, lang)}
                </p>
                <div className="map-venue-card-actions">
                  <Link href={venuePath(selected.slug)} className="btn btn-accent">
                    {t("card.open")}
                  </Link>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelectedId(null)}>
                    {t("card.close")}
                  </button>
                </div>
              </div>
            </article>
          )}
        </>
      )}
    </div>
  );
}
