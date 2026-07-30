"use client";

// Lot A8 — détail public d'une salle. Comme la recherche : composant client
// rendu par le serveur, aucun `fetch`, tout arrive en props. Le seul morceau qui
// exige réellement JavaScript est la visite Matterport, isolée dans son propre
// composant.
//
// D33 (visibilité) : cette page ne reçoit que des salles `ACTIVE` ou
// `TEMPORARILY_UNAVAILABLE`. Une salle `HIDDEN` est un 404 côté API, y compris
// en accès direct — il n'y a donc aucun état « cachée » à rendre ici.
//
// Flux B/C : les deux appels à l'action sont PRÉSENTS et INERTES. Un bouton
// désactivé avec sa raison écrite vaut mieux qu'un lien vers une page vide ou
// qu'un bouton absent qui laisse croire que la salle ne se réserve pas.
import { useLocale, useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";
import type { VenuePublicDTO } from "@zwadj/types";
import { ArrowBackIcon } from "@zwadj/ui";
import { Link } from "../../i18n/navigation";
import { mediaSrc } from "../../lib/media-url";
import { AvailabilityCalendar } from "./availability-calendar";
import { MatterportEmbed } from "./matterport-embed";

const SECTION_TITLE = {
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--ink-mute)",
  marginBlockEnd: 6
};

export function VenueDetailView({ venue }: { venue: VenuePublicDTO }) {
  const t = useTranslations("venueDetail");
  const locale = useLocale();
  const ar = locale === "ar";

  const name = ar ? venue.nameAr : venue.nameFr;
  const tagline = ar ? venue.taglineAr : venue.taglineFr;
  const description = ar ? venue.descriptionAr : venue.descriptionFr;
  const district = ar ? venue.districtAr : venue.districtFr;
  const city = ar ? venue.city.nameAr : venue.city.nameFr;

  return (
    <main style={{ padding: 20, maxInlineSize: 900, marginInline: "auto" }}>
      <Link href="/salles" className="backlink">
        <ArrowBackIcon />
        {t("backToSearch")}
      </Link>

      {/* D33 — bandeau, pas un 404 : la salle reste consultable et indexée, elle
          n'accepte simplement pas de demande. */}
      {venue.status === "TEMPORARILY_UNAVAILABLE" ? (
        <div className="alert alert-error" role="status" style={{ marginBlockEnd: 16 }}>
          <strong>{t("unavailableTitle")}</strong>
          <p style={{ margin: "4px 0 0" }}>{t("unavailableBody")}</p>
        </div>
      ) : null}

      <h1 style={{ marginBlockEnd: 4 }}>{name}</h1>
      <p style={{ margin: 0, color: "var(--ink-2)" }}>{district ? `${district} — ${city}` : city}</p>
      {tagline ? <p style={{ marginBlockStart: 8, fontSize: 15 }}>{tagline}</p> : null}

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBlock: 18,
          padding: 14,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          background: "var(--surface)"
        }}
      >
        <div>
          <dt style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("priceFrom")}</dt>
          <dd style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>{formatDZD(venue.basePriceCents)}</dd>
        </div>
        <div>
          <dt style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("capacity", { max: venue.capacityMax })}</dt>
          <dd style={{ margin: 0 }}>
            {venue.bookingMode === "SINGLE_SLOT" ? t("bookingModeSingle") : t("bookingModeMulti")}
          </dd>
        </div>
      </dl>
      {/* Le prix affiché est une BASE : le dire ici évite une déception au devis
          (le prix réel dépend de la date et des prestations — Flux B). */}
      <p style={{ marginBlockStart: -10, fontSize: 12, color: "var(--ink-2)" }}>{t("priceNote")}</p>

      <section style={{ marginBlockStart: 24 }}>
        <h2 style={SECTION_TITLE}>{t("photos")}</h2>
        {venue.photos.length === 0 ? (
          <p style={{ color: "var(--ink-2)" }}>{t("photosNone")}</p>
        ) : (
          <ul
            aria-label={t("photos")}
            style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, margin: 0 }}
          >
            {/* `venue.photos` arrive DÉJÀ trié par sortOrder (contrat A4) et la
                couverture est la première : rien à réordonner ici. */}
            {venue.photos.map((photo, index) => (
              <li
                key={photo.id}
                style={
                  index === 0
                    ? undefined
                    : { display: "inline-block", marginInlineEnd: 10, verticalAlign: "top", maxInlineSize: 160 }
                }
              >
                {/* « Agrandir » sans JavaScript : la version pleine taille est
                    déjà servie par l'API, un lien suffit. Une visionneuse
                    modale serait du JS pour un geste que le navigateur sait
                    déjà faire. */}
                <a href={mediaSrc(photo.url)} target="_blank" rel="noopener noreferrer" title={t("photoOpen")}>
                  <img
                    src={mediaSrc(index === 0 ? photo.url : photo.thumbUrl)}
                    // L'alt saisi par le pro FAIT FOI. Vide, l'image est
                    // décorative : mieux que de fabriquer « photo de la salle
                    // 3 », qui pollue sans informer.
                    alt={(ar ? photo.altAr : photo.altFr) ?? ""}
                    // Ratio du LARGE en attributs : réserve la boîte, zéro CLS.
                    width={photo.width}
                    height={photo.height}
                    // La couverture est l'image d'en-tête : elle ne doit PAS
                    // être différée, c'est le plus grand élément affiché
                    // (métrique LCP). Les suivantes, oui.
                    loading={index === 0 ? "eager" : "lazy"}
                    style={{
                      inlineSize: "100%",
                      blockSize: "auto",
                      display: "block",
                      borderRadius: "var(--radius)",
                      background: "var(--bg-2)"
                    }}
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* B5 — calendrier de disponibilité. Composant CLIENT : il navigue de
          mois en mois, la fiche autour de lui reste rendue au serveur. */}
      <AvailabilityCalendar slug={venue.slug} />

      {venue.matterportModelId ? <MatterportEmbed modelId={venue.matterportModelId} /> : null}

      {description ? (
        <section style={{ marginBlockStart: 24 }}>
          <h2 style={SECTION_TITLE}>{t("description")}</h2>
          {/* `white-space: pre-line` : les sauts de ligne du pro sont conservés
              sans jamais interpréter son texte comme du HTML. */}
          <p style={{ whiteSpace: "pre-line", margin: 0 }}>{description}</p>
        </section>
      ) : null}

      <section style={{ marginBlockStart: 24 }}>
        <h2 style={SECTION_TITLE}>{t("amenities")}</h2>
        {venue.amenities.length === 0 ? (
          <p style={{ color: "var(--ink-2)" }}>{t("amenitiesNone")}</p>
        ) : (
          <ul
            aria-label={t("amenities")}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: 0 }}
          >
            {venue.amenities.map((amenity) => (
              <li
                key={amenity.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: 13
                }}
              >
                {ar ? amenity.nameAr : amenity.nameFr}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBlockStart: 24 }}>
        <h2 style={SECTION_TITLE}>{t("location")}</h2>
        {venue.address ? <p style={{ margin: 0 }}>{venue.address}</p> : null}
        <p style={{ margin: "2px 0 0", color: "var(--ink-2)" }}>{district ? `${district} — ${city}` : city}</p>
      </section>

      <section
        style={{
          marginBlockStart: 28,
          padding: 16,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          background: "var(--surface)"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {/* INERTES, et désactivés pour de vrai : `disabled` interdit le clic
              ET sort les boutons de l'ordre de tabulation. Un bouton d'allure
              cliquable qui ne fait rien est un défaut, pas un aperçu. */}
          <button type="button" className="btn btn-accent" disabled>
            {t("bookingCta")}
          </button>
          <button type="button" className="btn" disabled>
            {t("visitCta")}
          </button>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-2)" }}>{t("ctaSoon")}</p>
      </section>
    </main>
  );
}
