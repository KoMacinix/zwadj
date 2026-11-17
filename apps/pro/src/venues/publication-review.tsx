// ADM-2 (D350, rang 52, R-6, D-5, MD-ADM-5) — le PRO lit son refus. Ce fichier est un COMPOSANT NEUF : `venue-form.tsx` n'est PAS modifié (la branche `par-carte` y écrit, R-9) ; `PublicationBadge` reste
// ce qu'il est, c'est la page de la salle qui choisit de ne plus le montrer pour une salle refusée.
//
// ⚠ LE DÉFAUT QU'IL CORRIGE. Une salle rejetée affichait « En attente de publication par Zwadj » : le pro croyait attendre alors qu'il avait été refusé, sans rien lire du motif. Le refus (motif, date) est lu
// par `GET /pro/venues/:id/publication` (ADM-1, D349) et s'affiche à DEUX endroits de la page de la salle : l'en-tête de l'assistant, qui ne dit plus « en attente » pour une salle refusée, et l'étape
// « Publication », qui porte le motif complet.
//
// ⛔ D133, D142 : UNE PANNE DE LECTURE N'EST PAS « PAS REFUSÉE ». Si la lecture échoue, l'étape le dit et propose de réessayer ; l'en-tête garde le badge d'avant (on ne SAIT pas). Une réponse malformée est une
// panne, jamais un « pas refusée ». ⛔ Une salle PUBLIÉE n'appelle pas la route : publier efface le motif, il n'y a rien à lire. ⛔ La lecture part UNE fois par ouverture de la salle, pas à chaque changement
// d'étape. ⚠ Le motif est écrit par l'admin (en français, le plus souvent) : il est rendu tel quel, avec `dir="auto"` — la phrase de l'interface autour de lui suit la langue du pro.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { VenuePublicationStatus, type VenuePublicationReviewDTO } from "@zwadj/types";
import { usePublicationClient } from "./venue-client-context";
import { PublicationBadge } from "./venue-form";

export type PublicationReviewState = { kind: "idle" } | { kind: "loading" } | { kind: "error" } | { kind: "ready"; review: VenuePublicationReviewDTO };

/** D120 : la forme que la route promet — un état de publication et un refus ou `null`. Autre chose est une panne. */
function isReview(data: unknown): data is VenuePublicationReviewDTO {
  const d = data as Partial<VenuePublicationReviewDTO> | null;
  if (d === null || typeof d !== "object" || typeof d.publicationStatus !== "string") return false;
  if (d.rejection === null) return true;
  return d.rejection !== undefined && typeof d.rejection === "object" && typeof d.rejection.reason === "string";
}

/** Le jour du refus, à l'heure d'ALGER (UTC+1, sans heure d'été) — le fuseau n'est jamais dérivé de la locale (D48, D56) ; pas d'heure (D57). `locale` est la langue de l'interface du pro. */
export function formatReviewDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", { timeZone: "Africa/Algiers", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/**
 * Lit le refus de SA salle. `status` est l'état de publication connu par la page (`null` tant que la salle n'est pas lue) : il n'y a rien à lire avant, ni pour une salle publiée. La lecture part UNE fois
 * par ouverture de la salle (`venueId`) ; `retry` la relance après une panne.
 */
export function usePublicationReview(venueId: string, status: VenuePublicationStatus | null): { state: PublicationReviewState; retry: () => void } {
  const client = usePublicationClient();
  const [state, setState] = useState<PublicationReviewState>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);
  const active = status !== null && status !== VenuePublicationStatus.PUBLISHED;

  useEffect(() => {
    if (!active) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    // `new Promise` : un appel qui LÈVE sur place, ou qui ne rend pas une promesse, devient un rejet ou une valeur — une panne de lecture, jamais un plantage de la page de la salle.
    new Promise<unknown>((resolve) => resolve(client.getPublicationReview(venueId)))
      .then((review) => {
        if (!cancelled) setState(isReview(review) ? { kind: "ready", review } : { kind: "error" });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [client, venueId, active, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}

/** L'en-tête de l'assistant : le badge d'avant, SAUF pour une salle refusée — « en attente » y serait faux. */
export function PublicationHeaderState({ status, review }: { status: VenuePublicationStatus; review: PublicationReviewState }) {
  const { t } = useTranslation();
  if (review.kind === "ready" && review.review.rejection !== null) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          lineHeight: 1.4,
          paddingBlock: 4,
          paddingInline: 8,
          borderRadius: "var(--radius)",
          border: "1px solid var(--line)",
          background: "var(--danger-soft)",
          color: "var(--danger-ink)"
        }}
      >
        <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("venue.ui.publication.label")}</span>
        {t("publicationReview.refusedBadge")}
      </span>
    );
  }
  return <PublicationBadge status={status} />;
}

/** L'étape « Publication » : le refus complet (motif, date), ou la panne de lecture avec son bouton. Ni alerte ni statut : un avis qui reste, qui ne prend pas la place du message d'enregistrement. */
export function PublicationRefusalNotice({ review, retry }: { review: PublicationReviewState; retry: () => void }) {
  const { t, i18n } = useTranslation();
  if (review.kind === "error") {
    return (
      <div>
        <p className="field-hint">{t("publicationReview.loadError")}</p>
        <button type="button" className="btn btn-ghost" onClick={retry}>
          {t("publicationReview.retry")}
        </button>
      </div>
    );
  }
  if (review.kind !== "ready" || review.review.rejection === null) return null;
  const { reason, rejectedAt } = review.review.rejection;
  return (
    <section aria-label={t("publicationReview.noticeTitle")} style={{ borderInlineStart: "3px solid var(--danger)", paddingInlineStart: 12, marginBlockEnd: 16 }}>
      <h3 style={{ margin: "0 0 6px" }}>{t("publicationReview.noticeTitle")}</h3>
      <p dir="auto" style={{ margin: "0 0 6px" }}>
        {reason}
      </p>
      {rejectedAt ? <p className="field-hint">{t("publicationReview.noticeDate", { date: formatReviewDate(rejectedAt, i18n.language) })}</p> : null}
      <p className="field-hint">{t("publicationReview.noticeHelp")}</p>
    </section>
  );
}
