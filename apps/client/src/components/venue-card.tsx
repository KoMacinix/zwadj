"use client";

// Carte de salle — EXTRAITE de `search-view.tsx` au lot Accueil.
//
// ⚠ POURQUOI UN MODULE À PART PLUTÔT QU'UN EXPORT DEPUIS LA RECHERCHE.
// L'accueil a besoin de la MÊME carte : c'est le garde-fou n°3 de
// `preview-venues.ts` — un jeu de démonstration qui passerait par un autre
// chemin de rendu ne prouverait rien du rendu réel, et la remarque vaut autant
// pour deux pages que pour deux jeux de données. Mais importer depuis
// `search-view.tsx` aurait tiré TOUTE la vue de recherche — filtres, pagination,
// bascule carte — dans le paquet navigateur de l'accueil. La cible est un
// Android bas de gamme sur réseau lent (backlog 24.6) : ce n'est pas un détail
// d'élégance.
//
// Le corps de ce composant est repris SANS MODIFICATION de la recherche, à une
// exception près : le niveau de titre est devenu un paramètre (voir plus bas).
import { useTranslations } from "next-intl";
import { formatDZD, formatRating } from "@zwadj/i18n";
import { HeartIcon, StarIcon } from "@zwadj/ui";
import { Link } from "../i18n/navigation";
import { mediaSrc } from "../lib/media-url";
import type { VenueCardData } from "../lib/preview-venues";

export function VenueCard({
  venue,
  ar,
  headingLevel = 2
}: {
  venue: VenueCardData;
  ar: boolean;
  headingLevel?: 2 | 3;
}) {
  const t = useTranslations("search");
  const Titre = headingLevel === 3 ? "h3" : "h2";
  const name = ar ? venue.nameAr : venue.nameFr;
  const tagline = ar ? venue.taglineAr : venue.taglineFr;
  const district = ar ? venue.districtAr : venue.districtFr;
  const lang = ar ? "ar" : "fr";
  const rating = venue.ratingAvg;
  const reviews = venue.reviewCount;

  return (
    <li className="venue-card">
      {/* La destination du détail est A8 : le lien pointe la route par SLUG
          (décision Flux A). */}
      <Link href={`/salles/${venue.slug}`} className="venue-card-link">
        <div className="venue-card-media">
          {venue.coverThumbUrl ? (
            // `<img>` nu, PAS `next/image` : la vignette est déjà générée à la
            // bonne taille par le pipeline du Lot A4. La repasser dans
            // l'optimiseur ajouterait une configuration `remotePatterns`, un
            // proxy en dev et un deuxième ré-encodage, pour zéro gain.
            <img src={mediaSrc(venue.coverThumbUrl)} alt="" loading="lazy" width={480} height={360} />
          ) : (
            <div className="venue-card-nophoto">{t("card.noPhoto")}</div>
          )}

          {venue.badge ? <span className="venue-card-badge">{t(`badge.${venue.badge}`)}</span> : null}

          {/* Points DÉCORATIFS : ils disent « cette salle a plusieurs photos »,
              ils ne les font pas défiler — le DTO de liste ne porte que la
              couverture. Un point cliquable qui ne change rien serait pire. */}
          {venue.photoCount > 1 ? (
            <span className="venue-card-dots" aria-hidden="true">
              {Array.from({ length: Math.min(venue.photoCount, 4) }, (_, i) => (
                <span key={i} className={i === 0 ? "venue-card-dot is-first" : "venue-card-dot"} />
              ))}
            </span>
          ) : null}
        </div>

        <div className="venue-card-body">
          <div className="venue-card-head">
            {/* ⚠ NIVEAU DE TITRE PARAMÉTRABLE, et ce n'est pas du zèle. Sur la
                recherche la page est un `h1` et les cartes des `h2` : la
                hiérarchie est juste. Sur l'accueil, les SECTIONS sont des `h2` —
                une salle y serait donc au même rang que « Récemment ajoutées »,
                et un lecteur d'écran annoncerait un plan de page faux. */}
            <Titre className="venue-card-name">{name}</Titre>
            {rating !== undefined && reviews !== undefined ? (
              <span className="venue-card-rating">
                <StarIcon />
                <span>{formatRating(rating, lang)}</span>
                <span className="venue-card-reviews">({reviews})</span>
                {/* L'étoile est décorative : sans ce doublon, un lecteur
                    d'écran annonce « 4,92 (142) » sans dire de quoi il parle. */}
                <span className="sr-only">
                  {t("card.rating", { rating: formatRating(rating, lang), count: reviews })}
                </span>
              </span>
            ) : null}
          </div>

          {tagline ? <p className="venue-card-tagline">{tagline}</p> : null}

          <div className="venue-card-foot">
            <span className="venue-card-meta">
              {t("card.capacity", { max: venue.capacityMax })}
              {district ? ` · ${district}` : ""}
            </span>
            <span className="venue-card-price">
              <span className="venue-card-from">{t("card.from")}</span>
              {formatDZD(venue.basePriceCents, lang)}
            </span>
          </div>
        </div>
      </Link>

      {/* Favoris : rubrique annoncée, pas construite — même doctrine que la
          navigation (UI-N1). `disabled` la sort de l'ordre de tabulation, le
          titre dit pourquoi. Un cœur qui accepte le clic sans rien enregistrer
          ferait croire à une salle sauvegardée. */}
      <button
        type="button"
        className="venue-card-fav"
        disabled
        aria-label={t("card.favourite")}
        title={t("card.favourite")}
      >
        <HeartIcon />
      </button>
    </li>
  );
}
