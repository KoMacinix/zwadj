// ADM-2 (D350, rang 52, R-5 écran 2, R-3) — le détail d'une salle : Publier, Rejeter (motif obligatoire), Corriger le motif d'une salle déjà rejetée, les deux taux AFFICHÉS en lecture seule.
//
// ⛔ MD-ADM-15 (D217) : une action n'est JAMAIS affichée comme faite avant la réponse de l'API ; un refus métier (« pas de créneau actif », « n'est plus un brouillon », « le motif vient de changer ») s'affiche
// comme un REFUS, son texte français, jamais comme une panne ni comme une action faite ; une panne s'écrit « le résultat est inconnu » — et la salle est RELUE pour dire l'état réel. L'état « fait » vient de
// la RÉPONSE, jamais d'une supposition. ⛔ MD-ADM-7 (décision du relecteur de D320) : AUCUN champ ne modifie un taux ; l'écran n'appelle jamais la route de réglage des taux. ⛔ Doctrine des bornes (D55) : le
// motif est vérifié par le schéma PARTAGÉ (`venueRejectSchema`), la borne n'est pas recopiée ici. ⛔ D32 : le champ obligatoire porte `required` natif et un `<label>` visible ; le formulaire reste `noValidate`.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { VenuePublicationStatus, venueRejectSchema, type VenueAdminDetailDTO } from "@zwadj/types";
import { ApiError } from "../lib/auth-client";
import { ADMIN_PATH } from "../routes";
import { useAdminClient } from "./admin-client-context";
import { ADMIN_TEXTS, classifyAdminError, formatAdminDate, formatBps, validationText, type AdminProblem } from "./admin-texts";

type Load = { kind: "loading" } | { kind: "notFound" } | { kind: "error"; rights: boolean } | { kind: "ready"; venue: VenueAdminDetailDTO };

/** D120 : la forme minimale que l'écran sait rendre. */
function isVenue(data: unknown): data is VenueAdminDetailDTO {
  const d = data as Partial<VenueAdminDetailDTO> | null;
  return d !== null && typeof d === "object" && typeof d.id === "string" && typeof d.nameFr === "string" && typeof d.publicationStatus === "string";
}

export function VenueReviewPage() {
  const admin = useAdminClient();
  const { id = "" } = useParams();
  const reasonId = useId();
  const reasonErrorId = useId();

  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<"publish" | "reject" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<AdminProblem | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  /** Le champ du motif n'est rempli par la lecture qu'à la PREMIÈRE lecture : une relecture après un refus ne perd pas ce que l'admin vient de taper. */
  const seeded = useRef(false);

  const read = useCallback(
    async (initial: boolean): Promise<void> => {
      try {
        const venue = await admin.getVenue(id);
        if (!isVenue(venue)) {
          setLoad({ kind: "error", rights: false });
          return;
        }
        setLoad({ kind: "ready", venue });
        if (!seeded.current) {
          seeded.current = true;
          setReason(venue.rejection?.reason ?? "");
        }
      } catch (err) {
        // Une relecture silencieuse qui échoue laisse l'écran tel qu'il est ; une lecture voulue, elle, a son état.
        if (!initial) return;
        setLoad(err instanceof ApiError && err.code === "VENUE_NOT_FOUND" ? { kind: "notFound" } : { kind: "error", rights: classifyAdminError(err).kind === "rights" });
      }
    },
    [admin, id]
  );

  useEffect(() => {
    seeded.current = false;
    setLoad({ kind: "loading" });
    void read(true);
  }, [read, attempt]);

  /** Un refus ou une issue inconnue : on dit ce qui s'est passé, puis on RELIT la salle pour montrer l'état réel. Les droits, eux, ne se relisent pas (la session est en cause). */
  const fail = async (err: unknown): Promise<void> => {
    const p = classifyAdminError(err);
    setProblem(p);
    if (p.kind !== "rights") await read(false);
  };

  const publish = async (): Promise<void> => {
    if (busy !== null) return;
    setBusy("publish");
    setProblem(null);
    setNotice(null);
    try {
      const dto = await admin.publishVenue(id);
      setLoad((l) => (l.kind === "ready" ? { kind: "ready", venue: { ...l.venue, publicationStatus: dto.publicationStatus, rejection: null } } : l));
      setNotice(ADMIN_TEXTS.review.published);
    } catch (err) {
      await fail(err);
    } finally {
      setBusy(null);
    }
  };

  const reject = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (busy !== null) return;
    const checked = venueRejectSchema.safeParse({ reason });
    if (!checked.success) {
      setReasonError(validationText(checked.error.issues[0]?.message));
      return;
    }
    setReasonError(null);
    setBusy("reject");
    setProblem(null);
    setNotice(null);
    try {
      const result = await admin.rejectVenue(id, checked.data.reason);
      setLoad((l) => (l.kind === "ready" ? { kind: "ready", venue: { ...l.venue, rejection: result.rejection } } : l));
      setReason(result.rejection.reason);
      setNotice(ADMIN_TEXTS.review.rejectSaved);
    } catch (err) {
      await fail(err);
    } finally {
      setBusy(null);
    }
  };

  if (load.kind === "loading") {
    return (
      <section>
        <p role="status">{ADMIN_TEXTS.common.loading}</p>
      </section>
    );
  }
  if (load.kind === "notFound") {
    return (
      <section>
        <p>{ADMIN_TEXTS.review.notFound}</p>
        <Link to={ADMIN_PATH}>{ADMIN_TEXTS.review.backToQueue}</Link>
      </section>
    );
  }
  if (load.kind === "error") {
    return (
      <section>
        <div className="alert alert-error" role="alert">
          <p>{load.rights ? ADMIN_TEXTS.errors.rights : ADMIN_TEXTS.review.loadError}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
            {ADMIN_TEXTS.common.retry}
          </button>
        </div>
      </section>
    );
  }

  const venue = load.venue;
  const published = venue.publicationStatus === VenuePublicationStatus.PUBLISHED;
  const corrects = venue.rejection !== null;

  return (
    <section>
      <p>
        <Link to={ADMIN_PATH}>{ADMIN_TEXTS.review.backToQueue}</Link>
      </p>
      <h1>{venue.nameFr}</h1>
      <p lang="ar" dir="rtl">
        {venue.nameAr}
      </p>

      <p className="admin-meta">
        <span>{ADMIN_TEXTS.review.number(venue.number)}</span>
        <span>{venue.cityNameFr}</span>
        <span>{venue.ownerBusinessName}</span>
        <span>{ADMIN_TEXTS.queue.slots(venue.activeSlotCount)}</span>
      </p>
      <p>
        {ADMIN_TEXTS.review.statusLabel} : <strong>{ADMIN_TEXTS.review.status[venue.publicationStatus]}</strong>
      </p>

      {/* MD-ADM-7 : les taux sont AFFICHÉS, jamais modifiables — aucun champ, aucun appel de réglage. */}
      <dl className="admin-rates">
        <dt>{ADMIN_TEXTS.review.commission}</dt>
        <dd>{formatBps(venue.commissionRateBps)}</dd>
        <dt>{ADMIN_TEXTS.review.cashback}</dt>
        <dd>{formatBps(venue.cashbackRateBps)}</dd>
      </dl>
      <p className="admin-hint">{ADMIN_TEXTS.review.ratesReadOnly}</p>

      {notice ? (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      ) : null}
      {problem ? (
        <p className="alert alert-error" role="alert">
          {problem.kind === "refused" ? `${ADMIN_TEXTS.errors.refusedPrefix} ${problem.text}` : problem.text}
        </p>
      ) : null}

      {venue.rejection ? (
        <section className="admin-rejected" aria-label={ADMIN_TEXTS.review.rejectedTitle}>
          <h2>{ADMIN_TEXTS.review.rejectedTitle}</h2>
          {venue.rejection.rejectedAt ? <p>{ADMIN_TEXTS.review.rejectedOn(formatAdminDate(venue.rejection.rejectedAt))}</p> : null}
          <p dir="auto">{venue.rejection.reason}</p>
        </section>
      ) : null}

      {published ? null : (
        <>
          <div className="admin-actions">
            <button type="button" className="btn btn-accent" disabled={busy !== null} onClick={() => void publish()}>
              {ADMIN_TEXTS.review.publish}
            </button>
          </div>

          <form className="admin-form" onSubmit={(e) => void reject(e)} noValidate>
            {/* D32 : l'astérisque visuel est `aria-hidden` et vit HORS du `<label>` ; l'attribut natif `required` est posé sur le champ réel. */}
            <p>
              <label htmlFor={reasonId}>{ADMIN_TEXTS.review.reasonLabel}</label> <span aria-hidden="true">*</span>
            </p>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? reasonErrorId : undefined}
              dir="auto"
            />
            <p className="admin-hint">{ADMIN_TEXTS.review.reasonHint}</p>
            {reasonError ? (
              <p id={reasonErrorId} className="admin-field-error">
                {reasonError}
              </p>
            ) : null}
            <div className="admin-actions">
              <button type="submit" className="btn btn-ghost" disabled={busy !== null}>
                {corrects ? ADMIN_TEXTS.review.correct : ADMIN_TEXTS.review.reject}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
