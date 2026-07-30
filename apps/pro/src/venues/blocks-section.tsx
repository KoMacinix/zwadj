// Lot B4d — volet BLOCAGES de l'écran d'édition d'une salle (D51).
//
// SECTION AUTONOME, hors du <form> principal, même patron que les créneaux et
// les photos : ses propres endpoints, ses propres boutons, et JAMAIS d'appel au
// `load()` de la page — qui repasserait l'écran en « loading » et écraserait
// les saisies non enregistrées du formulaire.
//
// ── Une différence avec les autres volets ────────────────────────────────────
// Les blocages ne voyagent PAS dans `VenueProDTO` : ils sont potentiellement
// nombreux et sans borne temporelle, les embarquer ferait grossir le DTO sans
// fin. Ce volet CHARGE donc les siens au montage, sur une fenêtre — d'où un
// état de chargement que photos et créneaux n'ont pas.
//
// ── Ce que l'écran ne fait surtout PAS ───────────────────────────────────────
// Aucune conversion de fuseau. D51 confie l'heure d'Alger à l'API : les
// chaînes civiles sont assemblées par concaténation (`block-time.ts`), jamais
// via `new Date().toISOString()` qui appliquerait le fuseau du navigateur. Un
// pro connecté depuis la France bloquerait sinon les mauvaises heures sans rien
// voir.
//
// ── La borne de fin est INCLUSIVE à l'écran, exclusive dans l'API ────────────
// « Du 3 au 10 août » doit bloquer le 10. La traduction se fait dans
// `toBlockPayload`, une seule fois, et la relecture la défait symétriquement.
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@zwadj/ui";
import type { AvailabilityBlockDTO } from "@zwadj/types";
import { useApiErrorMessage } from "../auth/auth-ui";
import { useVenues } from "./venue-client-context";
import { defaultWindow, inclusiveEndDate, isWholeDays, toBlockPayload } from "./block-time";
import { TimeSelect } from "./time-select";

interface BlockDraft {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  reason: string;
}

const emptyDraft = (from: string): BlockDraft => ({
  startDate: from,
  startTime: "08:00",
  endDate: from,
  endTime: "18:00",
  allDay: true,
  reason: ""
});

export function BlocksSection({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const venues = useVenues();
  const toMessage = useApiErrorMessage();
  const formId = useId();

  // Fenêtre figée au montage : la recalculer à chaque rendu ferait repartir le
  // chargement en boucle dès qu'une minute passe.
  const [window] = useState(() => defaultWindow(Date.now()));
  const [blocks, setBlocks] = useState<AvailabilityBlockDTO[] | null>(null);
  const [draft, setDraft] = useState<BlockDraft>(() => emptyDraft(window.from));
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<AvailabilityBlockDTO | null>(null);

  // ⚠ `useApiErrorMessage` rend une NOUVELLE fonction à chaque rendu : la
  // mettre en dépendance d'effet relancerait la requête indéfiniment. En test
  // la boucle s'arrête à deux appels (le mock rend la même référence de
  // tableau, React court-circuite le rendu) — contre une vraie API, elle ne
  // s'arrêterait pas. On la lit donc par ref, hors du graphe de dépendances.
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await venues.listAvailabilityBlocks(venueId, window);
        if (!cancelled) setBlocks(rows);
      } catch (cause) {
        if (cancelled) return;
        setError(toMessageRef.current(cause));
        setBlocks([]);
      }
    })();
    // Démontage pendant la requête : on n'écrit plus dans un état mort.
    return () => {
      cancelled = true;
    };
  }, [venues, venueId, window]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = toBlockPayload(draft);
      const created = await venues.createAvailabilityBlock(venueId, {
        ...payload,
        reason: draft.reason.trim() === "" ? null : draft.reason.trim()
      });
      // L'état affiché vient de la RÉPONSE serveur, jamais du brouillon local.
      setBlocks((current) => [...(current ?? []), created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setOpen(false);
      setDraft(emptyDraft(window.from));
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(block: AvailabilityBlockDTO) {
    setBusy(true);
    setError(null);
    try {
      await venues.deleteAvailabilityBlock(venueId, block.id);
      setBlocks((current) => (current ?? []).filter((b) => b.id !== block.id));
      setConfirming(null);
    } catch (cause) {
      setError(toMessage(cause));
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  /** Relecture SYMÉTRIQUE de la saisie : un blocage de journées entières se
   *  réaffiche « du 3 au 10 », pas « du 3 au 11 à 00:00 » — sans quoi le pro
   *  croit à un décalage d'un jour et corrige une erreur qui n'existe pas. */
  function describe(block: AvailabilityBlockDTO): string {
    if (isWholeDays(block.startsAt, block.endsAt)) {
      const first = block.startsAt.slice(0, 10);
      const last = inclusiveEndDate(block.endsAt);
      return first === last ? first : t("venue.ui.blocks.range", { from: first, to: last });
    }
    return t("venue.ui.blocks.range", { from: block.startsAt.replace("T", " "), to: block.endsAt.replace("T", " ") });
  }

  return (
    <section className="panel" aria-labelledby={`${formId}-title`}>
      <h2 id={`${formId}-title`} className="panel-title">
        {t("venue.ui.blocks.section")}
      </h2>
      <p className="field-hint">{t("venue.ui.blocks.hint")}</p>
      <p className="field-hint">{t("venue.ui.blocks.window", { from: window.from, to: window.to })}</p>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {blocks === null && <p className="field-hint">{t("venue.ui.blocks.loading")}</p>}
      {blocks !== null && blocks.length === 0 && <p className="field-hint">{t("venue.ui.blocks.empty")}</p>}

      {blocks !== null && blocks.length > 0 && (
        <ul className="block-list" aria-label={t("venue.ui.blocks.section")}>
          {blocks.map((block) => (
            <li key={block.id} className="block-row">
              <span className="block-range">{describe(block)}</span>
              {block.reason && <span className="block-reason">{block.reason}</span>}
              <button type="button" className="btn btn-danger" onClick={() => setConfirming(block)} disabled={busy}>
                {t("venue.ui.blocks.lift")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="block-form">
          <label className="check">
            <input
              type="checkbox"
              checked={draft.allDay}
              onChange={(e) => setDraft({ ...draft, allDay: e.target.checked })}
            />
            {t("venue.ui.blocks.allDay")}
          </label>

          <div className="field">
            <label htmlFor={`${formId}-startDate`}>{t("venue.ui.blocks.from")}</label>
            <input
              id={`${formId}-startDate`}
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
            {/* D57 — 24 h garanti : le widget natif afficherait AM/PM sur un
                navigateur en anglais. */}
            {!draft.allDay && (
              <TimeSelect
                label={t("venue.ui.blocks.startTime")}
                value={draft.startTime}
                onChange={(startTime) => setDraft({ ...draft, startTime })}
              />
            )}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-endDate`}>{t("venue.ui.blocks.to")}</label>
            <input
              id={`${formId}-endDate`}
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
            {!draft.allDay && (
              <TimeSelect
                label={t("venue.ui.blocks.endTime")}
                value={draft.endTime}
                onChange={(endTime) => setDraft({ ...draft, endTime })}
              />
            )}
            {/* La borne saisie est INCLUSIVE : on le dit, plutôt que de laisser
                le pro deviner si son dernier jour est couvert. */}
            {draft.allDay && <p className="field-hint">{t("venue.ui.blocks.endInclusive")}</p>}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-reason`}>{t("venue.ui.blocks.reason")}</label>
            <input
              id={`${formId}-reason`}
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            />
          </div>

          <div className="slot-actions">
            <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
              {t("venue.ui.blocks.create")}
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
              {t("venue.ui.slots.cancel")}
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} disabled={busy}>
          {t("venue.ui.blocks.add")}
        </button>
      )}

      {confirming && (
        <ConfirmDialog
          open
          title={t("venue.ui.blocks.confirmTitle")}
          description={t("venue.ui.blocks.confirmMessage")}
          confirmLabel={t("venue.ui.blocks.lift")}
          cancelLabel={t("venue.ui.slots.cancel")}
          destructive
          onConfirm={() => void remove(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </section>
  );
}
