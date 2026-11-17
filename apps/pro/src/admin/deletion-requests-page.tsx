// ADM-2 (D350, rang 52, R-5 écran 3) — les demandes de suppression de compte : la liste, rejeter avec un motif, approuver APRÈS une confirmation qui dit que c'est IRRÉVERSIBLE.
//
// ⛔ L'APPROBATION ANONYMISE LE COMPTE ET ARCHIVE SES SALLES : rien ne la défait. Aucun appel d'approbation ne part avant la confirmation ; annuler n'appelle rien ; la confirmation dit l'irréversible et le nombre
// de salles archivées. Le service qui l'exécute décide désormais du statut DANS sa transaction (R-2) : même quand l'utilisateur annule en même temps, une demande n'est décidée qu'une fois.
// ⛔ MD-ADM-15 / D217 : une action n'est jamais affichée comme faite avant la RÉPONSE (la demande ne quitte la liste qu'à la réponse) ; « déjà traitée ou annulée » est un REFUS lisible, la liste est relue ;
// une panne est « le résultat est inconnu », la liste est relue pour dire la vérité ; une panne de lecture n'est pas « aucune demande ».
// ⛔ Doctrine des bornes (D55) : le schéma accepte une note de décision facultative ; cet écran EXIGE un motif pour REJETER — restriction délibérée et écrite : l'utilisateur dont le compte reste actif reçoit
// ce motif par e-mail et doit savoir pourquoi. La borne haute est celle du schéma partagé, pas une valeur recopiée.
import { useCallback, useEffect, useId, useState } from "react";
import { ConfirmDialog } from "@zwadj/ui";
import { deletionDecisionSchema, type AdminDeletionRequestDTO } from "@zwadj/types";
import { useAdminClient } from "./admin-client-context";
import { ADMIN_TEXTS, classifyAdminError, validationText, type AdminProblem } from "./admin-texts";
import { formatAdminDate } from "./admin-format";

type Load = { kind: "loading" } | { kind: "error"; rights: boolean } | { kind: "ready"; rows: AdminDeletionRequestDTO[] };

function isRows(data: unknown): data is AdminDeletionRequestDTO[] {
  return Array.isArray(data) && data.every((r) => r !== null && typeof r === "object" && typeof (r as { id?: unknown }).id === "string");
}

export function DeletionRequestsPage() {
  const admin = useAdminClient();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<AdminProblem | null>(null);
  const [confirming, setConfirming] = useState<AdminDeletionRequestDTO | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const read = useCallback(
    async (initial: boolean): Promise<void> => {
      try {
        const rows = await admin.listDeletionRequests();
        if (!isRows(rows)) {
          if (initial) setLoad({ kind: "error", rights: false });
          return;
        }
        setLoad({ kind: "ready", rows });
      } catch (err) {
        // Une relecture silencieuse qui échoue laisse la liste connue ; une lecture voulue, elle, a son état (jamais « aucune demande »).
        if (initial) setLoad({ kind: "error", rights: classifyAdminError(err).kind === "rights" });
      }
    },
    [admin]
  );

  useEffect(() => {
    setLoad({ kind: "loading" });
    void read(true);
  }, [read, attempt]);

  const removeLocally = (id: string) => setLoad((l) => (l.kind === "ready" ? { kind: "ready", rows: l.rows.filter((r) => r.id !== id) } : l));

  /** Un refus ou une issue inconnue : on le dit, puis on RELIT la liste pour montrer l'état réel. Les droits ne se relisent pas. */
  const fail = async (err: unknown): Promise<void> => {
    const p = classifyAdminError(err);
    setProblem(p);
    if (p.kind !== "rights") await read(false);
  };

  const approve = async (row: AdminDeletionRequestDTO): Promise<void> => {
    if (busyId !== null) return;
    setConfirming(null);
    setBusyId(row.id);
    setProblem(null);
    setNotice(null);
    try {
      await admin.approveDeletion(row.id);
      removeLocally(row.id);
      setNotice(ADMIN_TEXTS.deletions.approved(row.userEmail));
    } catch (err) {
      await fail(err);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: AdminDeletionRequestDTO, note: string): Promise<void> => {
    if (busyId !== null) return;
    setBusyId(row.id);
    setProblem(null);
    setNotice(null);
    try {
      await admin.rejectDeletion(row.id, note);
      removeLocally(row.id);
      setRejecting(null);
      setNotice(ADMIN_TEXTS.deletions.rejected(row.userEmail));
    } catch (err) {
      setRejecting(null);
      await fail(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <h1>{ADMIN_TEXTS.deletions.title}</h1>

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

      {load.kind === "loading" ? <p role="status">{ADMIN_TEXTS.common.loading}</p> : null}

      {load.kind === "error" ? (
        <div className="alert alert-error" role="alert">
          <p>{load.rights ? ADMIN_TEXTS.errors.rights : ADMIN_TEXTS.deletions.loadError}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
            {ADMIN_TEXTS.common.retry}
          </button>
        </div>
      ) : null}

      {load.kind === "ready" && load.rows.length === 0 ? <p>{ADMIN_TEXTS.deletions.empty}</p> : null}

      {load.kind === "ready" && load.rows.length > 0 ? (
        <ul className="admin-list">
          {load.rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              busy={busyId === row.id}
              disabled={busyId !== null}
              rejecting={rejecting === row.id}
              onApprove={() => setConfirming(row)}
              onStartReject={() => setRejecting(row.id)}
              onCancelReject={() => setRejecting(null)}
              onReject={(note) => void reject(row, note)}
            />
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        title={ADMIN_TEXTS.deletions.approveDialog.title}
        description={ADMIN_TEXTS.deletions.approveDialog.description(confirming?.venueCount ?? 0)}
        confirmLabel={ADMIN_TEXTS.deletions.approveDialog.confirm}
        cancelLabel={ADMIN_TEXTS.deletions.approveDialog.cancel}
        destructive
        onConfirm={() => {
          if (confirming !== null) void approve(confirming);
        }}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}

interface RowProps {
  row: AdminDeletionRequestDTO;
  busy: boolean;
  disabled: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onReject: (note: string) => void;
}

function Row({ row, disabled, rejecting, onApprove, onStartReject, onCancelReject, onReject }: RowProps) {
  const noteId = useId();
  const errorId = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = note.trim();
    if (trimmed.length === 0) {
      setError(validationText("admin.validation.decisionNoteRequired"));
      return;
    }
    const checked = deletionDecisionSchema.safeParse({ decisionNote: trimmed });
    if (!checked.success) {
      setError(validationText(checked.error.issues[0]?.message));
      return;
    }
    setError(null);
    onReject(checked.data.decisionNote ?? trimmed);
  };

  return (
    <li className="admin-card">
      <h2>{row.userEmail}</h2>
      <p className="admin-meta">
        <span>{(ADMIN_TEXTS.deletions.role as Record<string, string | undefined>)[row.userRole] ?? row.userRole}</span>
        <span>{ADMIN_TEXTS.deletions.requestedOn(formatAdminDate(row.requestedAt))}</span>
        {row.venueCount > 0 ? <span>{ADMIN_TEXTS.deletions.venueCount(row.venueCount)}</span> : null}
      </p>
      <p>
        {row.reason ? (
          <>
            <strong>{ADMIN_TEXTS.deletions.userReasonLabel}</strong> <span dir="auto">{row.reason}</span>
          </>
        ) : (
          ADMIN_TEXTS.deletions.noReason
        )}
      </p>

      {rejecting ? (
        <form className="admin-form" onSubmit={submit} noValidate>
          <p>
            <label htmlFor={noteId}>{ADMIN_TEXTS.deletions.noteLabel}</label> <span aria-hidden="true">*</span>
          </p>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            dir="auto"
          />
          <p className="admin-hint">{ADMIN_TEXTS.deletions.noteHint}</p>
          {error ? (
            <p id={errorId} className="admin-field-error">
              {error}
            </p>
          ) : null}
          <div className="admin-actions">
            <button type="submit" className="btn btn-ghost" disabled={disabled}>
              {ADMIN_TEXTS.deletions.confirmReject}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancelReject}>
              {ADMIN_TEXTS.deletions.cancelReject}
            </button>
          </div>
        </form>
      ) : (
        <div className="admin-actions">
          <button type="button" className="btn btn-danger" disabled={disabled} onClick={onApprove}>
            {ADMIN_TEXTS.deletions.approve}
          </button>
          <button type="button" className="btn btn-ghost" disabled={disabled} onClick={onStartReject}>
            {ADMIN_TEXTS.deletions.reject}
          </button>
        </div>
      )}
    </li>
  );
}
