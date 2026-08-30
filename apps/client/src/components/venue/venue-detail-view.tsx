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
// Flux B : l'appel à l'action de RÉSERVATION DE FÊTE est PRÉSENT et INERTE. Un
// bouton désactivé avec sa raison écrite vaut mieux qu'un lien vers une page
// vide ou qu'un bouton absent qui laisse croire que la salle ne se réserve pas.
//
// Flux C : la visite, elle, est RÉELLE depuis C5 — son panneau est monté plus
// bas. Le second bouton inerte « Réserver une visite » a donc été RETIRÉ : deux
// appels à l'action pour la même chose, dont un mort, apprennent surtout au
// visiteur que le site ne marche pas.
import { useLocale, useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";
import type { VenuePublicDTO } from "@zwadj/types";
import { ArrowBackIcon } from "@zwadj/ui";
import { Link } from "../../i18n/navigation";
import { mediaSrc } from "../../lib/media-url";
import { AvailabilityCalendar } from "./availability-calendar";
import { MatterportEmbed } from "./matterport-embed";
import { BookingRequestPanel } from "./booking-request-panel";
import { VisitBookingPanel } from "./visit-booking-panel";

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
        {/* E1b — le DERNIER appel à l'action inerte a disparu. Il annonçait « les
            demandes de réservation ouvriront prochainement » : depuis E1a elles
            sont ouvertes, et le panneau réel est juste au-dessous. Laisser un
            bouton mort à côté d'un formulaire vivant apprend au visiteur que le
            site ne marche pas — même raisonnement que D73 pour la visite. */}
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)" }}>{t("bookingHint")}</p>
      </section>

      {/* C5 — prise de rendez-vous RÉELLE. Le panneau charge ses créneaux depuis
          la route anonyme `/visit-slots` : il s'affiche pour un visiteur non
          connecté, et ne demande la session qu'au moment de réserver. */}
      {/* E1b — la DEMANDE de réservation vient avant la visite : c'est ce que le
          visiteur est venu chercher. La visite est une étape vers elle, pas une
          alternative. */}
      <div style={{ marginBlockStart: 28 }}>
        <BookingRequestPanel
          slug={venue.slug}
          depositRateBps={venue.depositRateBps}
          depositAmountCents={venue.depositAmountCents}
          services={venue.services}
        />
      </div>

      <div style={{ marginBlockStart: 28 }}>
        <VisitBookingPanel slug={venue.slug} />
      </div>
    </main>
  );
}
