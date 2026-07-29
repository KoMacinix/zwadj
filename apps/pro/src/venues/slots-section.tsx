// Lot B4b — volet CRÉNEAUX de l'écran d'édition d'une salle (D46, D52).
//
// SECTION AUTONOME, montée HORS du <form> principal, même patron que
// `photos-section.tsx` et `virtual-tour-section.tsx` : trois endpoints à elle,
// donc ses propres boutons. Imbriquer un submit dans un autre est invalide en
// HTML et ferait partir deux requêtes sur une touche Entrée.
//
// PROPRIÉTÉ DE L'ÉTAT — la règle qui gouverne tout le reste : la section
// possède son tableau `slots`, initialisé UNE FOIS depuis le DTO. Elle
// n'appelle JAMAIS le `load()` de la page, qui repasserait l'écran en
// « loading » et écraserait les saisies non enregistrées du formulaire
// principal. Aucun `useEffect` de resynchronisation sur la prop non plus.
//
// L'état affiché après mutation vient TOUJOURS de la réponse serveur :
//   création     → le SlotTemplateDTO créé, inséré au bon rang ;
//   modification → le DTO à jour, remplacé en place ;
//   retrait      → un PATCH `isActive:false`, pas un DELETE (l'historique) ;
//   suppression  → 204 sans corps, retrait local (rien ne se renumérote côté
//                  serveur, contrairement au `sortOrder` des photos).
//
// ⚠ COUPLAGE ASSUMÉ, NON SYNCHRONISÉ : toute écriture de créneau recalcule
// `Venue.basePriceCents` (dérivé D46) dans la même transaction. La section ne
// le reflète PAS dans le formulaire principal — le resynchroniser exigerait de
// recharger la salle et donc d'écraser des saisies en cours. L'écran le DIT en
// clair plutôt que d'afficher un « à partir de » périmé en silence.
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@zwadj/ui";
import type { FieldErrors } from "@zwadj/api-client";
import type { SlotTemplateDTO } from "@zwadj/types";
import { useApiErrorMessage, useValidationMessage } from "../auth/auth-ui";
import { useVenues } from "./venue-client-context";
import { venueFieldErrors } from "./venue-errors";
import { PriceInput, formatPriceForDisplay, parseIntegerPrice, stripGroupSeparators } from "./venue-form";
import { clockToMinutes, crossesMidnight, deriveEndMinutes, minutesToClock } from "./slot-time";
import { PricingRulesEditor } from "./pricing-rules-editor";
import { TimeSelect } from "./time-select";

/** Saisie brute d'un créneau : horloges MURALES + prix en DA entiers. La
 *  conversion en minutes absolues (D52) et en centimes n'a lieu qu'à l'envoi. */
interface SlotDraft {
  nameFr: string;
  nameAr: string;
  startClock: string;
  endClock: string;
  price: string;
}

const emptyDraft = (): SlotDraft => ({ nameFr: "", nameAr: "", startClock: "20:00", endClock: "02:00", price: "" });

const draftOf = (slot: SlotTemplateDTO): SlotDraft => ({
  nameFr: slot.nameFr,
  nameAr: slot.nameAr,
  startClock: minutesToClock(slot.startMinutes),
  endClock: minutesToClock(slot.endMinutes),
  price: formatPriceForDisplay(String(slot.basePriceCents / 100))
});

/** Tri d'affichage identique à `SLOT_ORDER_BY` côté API : l'ordre ne doit pas
 *  dépendre de l'endroit d'où on regarde. */
const byStart = (a: SlotTemplateDTO, b: SlotTemplateDTO): number =>
  a.startMinutes - b.startMinutes || a.id.localeCompare(b.id);

export function SlotsSection({ venueId, initialSlots }: { venueId: string; initialSlots: SlotTemplateDTO[] }) {
  const { t } = useTranslation();
  const venues = useVenues();
  const toMessage = useApiErrorMessage();
  const tval = useValidationMessage();
  const formId = useId();

  // Consommé UNE FOIS : cf. en-tête (aucune resynchronisation sur la prop).
  const [slots, setSlots] = useState<SlotTemplateDTO[]>([...initialSlots].sort(byStart));
  /** `null` = aucun formulaire ouvert ; `"new"` = création ; sinon l'id édité. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<SlotDraft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<SlotTemplateDTO | null>(null);
  /** B4c — quel créneau montre ses variantes de prix. Replié par défaut : la
   *  liste doit rester lisible quand une salle a quatre créneaux. */
  const [expanded, setExpanded] = useState<string | null>(null);

  const openCreate = () => {
    setEditing("new");
    setDraft(emptyDraft());
    setFieldErrors({});
    setError(null);
  };

  const openEdit = (slot: SlotTemplateDTO) => {
    setEditing(slot.id);
    setDraft(draftOf(slot));
    setFieldErrors({});
    setError(null);
  };

  const close = () => {
    setEditing(null);
    setFieldErrors({});
    setError(null);
  };

  /** Validation LOCALE minimale : uniquement ce qui empêche de construire un
   *  corps valide. Tout le reste (chevauchement, mode SINGLE_SLOT, prix
   *  positif) appartient à l'API — le dupliquer ici créerait deux règles à
   *  faire diverger. */
  function buildInput(): { nameFr: string; nameAr: string; startMinutes: number; endMinutes: number; basePriceCents: number } | null {
    const errors: FieldErrors = {};
    const start = clockToMinutes(draft.startClock);
    const end = clockToMinutes(draft.endClock);
    const price = parseIntegerPrice(stripGroupSeparators(draft.price));

    if (!draft.nameFr.trim()) errors.nameFr = "venue.validation.textEmpty";
    if (!draft.nameAr.trim()) errors.nameAr = "venue.validation.textEmpty";
    if (start === null) errors.startMinutes = "venue.validation.slotOutOfDay";
    if (end === null) errors.endMinutes = "venue.validation.slotOutOfDay";
    if (!price.ok) errors.basePriceCents = "venue.validation.basePriceInteger";

    if (Object.keys(errors).length > 0 || start === null || end === null || !price.ok) {
      setFieldErrors(errors);
      return null;
    }
    return {
      nameFr: draft.nameFr.trim(),
      nameAr: draft.nameAr.trim(),
      startMinutes: start,
      // D52 — la fin est DÉDUITE ici, jamais saisie au-delà de 24 h.
      endMinutes: deriveEndMinutes(start, end),
      basePriceCents: price.cents
    };
  }

  async function submit() {
    const input = buildInput();
    if (!input) return;
    setBusy(true);
    setError(null);
    try {
      if (editing === "new") {
        const created = await venues.createSlotTemplate(venueId, input);
        setSlots((current) => [...current, created].sort(byStart));
      } else if (editing) {
        const updated = await venues.updateSlotTemplate(venueId, editing, input);
        setSlots((current) => current.map((s) => (s.id === updated.id ? updated : s)).sort(byStart));
      }
      close();
    } catch (cause) {
      const fields = venueFieldErrors(cause);
      if (fields) setFieldErrors(fields);
      else setError(toMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  /** RETRAIT : `isActive:false`, la voie normale. La suppression dure est
   *  réservée aux créneaux jamais vendus (409 sinon). */
  async function toggleActive(slot: SlotTemplateDTO) {
    setBusy(true);
    setError(null);
    try {
      const updated = await venues.updateSlotTemplate(venueId, slot.id, { isActive: !slot.isActive });
      setSlots((current) => current.map((s) => (s.id === updated.id ? updated : s)).sort(byStart));
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(slot: SlotTemplateDTO) {
    setBusy(true);
    setError(null);
    try {
      await venues.deleteSlotTemplate(venueId, slot.id);
      // Rien ne se renumérote côté serveur : le retrait local suffit, aucun
      // refetch (contrairement aux photos, dont le `sortOrder` se décale).
      setSlots((current) => current.filter((s) => s.id !== slot.id));
      setConfirmingDelete(null);
      if (editing === slot.id) close();
    } catch (cause) {
      setError(toMessage(cause));
      setConfirmingDelete(null);
    } finally {
      setBusy(false);
    }
  }

  const derivedEnd = (() => {
    const start = clockToMinutes(draft.startClock);
    const end = clockToMinutes(draft.endClock);
    if (start === null || end === null) return null;
    const absolute = deriveEndMinutes(start, end);
    return { absolute, next: crossesMidnight(absolute) };
  })();

  return (
    <section className="panel" aria-labelledby={`${formId}-title`}>
      <h2 id={`${formId}-title`} className="panel-title">
        {t("venue.ui.slots.section")}
      </h2>
      <p className="field-hint">{t("venue.ui.slots.hint")}</p>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {slots.length === 0 && editing === null && <p className="field-hint">{t("venue.ui.slots.empty")}</p>}

      {slots.length > 0 && (
        <ul className="slot-list">
          {slots.map((slot) => (
            <li key={slot.id} className={slot.isActive ? "slot-row" : "slot-row is-inactive"}>
              <div>
                <span className="slot-name">{slot.nameFr}</span>
                <span className="slot-name-ar" lang="ar" dir="rtl">
                  {slot.nameAr}
                </span>
                <span className="slot-range">
                  {minutesToClock(slot.startMinutes)}–{minutesToClock(slot.endMinutes)}
                  {crossesMidnight(slot.endMinutes) && ` ${t("venue.ui.slots.nextDay")}`}
                </span>
                <span className="slot-price">
                  {formatPriceForDisplay(String(slot.basePriceCents / 100))} {t("venue.ui.slots.currency")}
                </span>
                {!slot.isActive && <span className="slot-badge">{t("venue.ui.slots.inactive")}</span>}
                {slot.pricingRules.length > 0 && (
                  <span className="slot-rules">{t("venue.ui.slots.ruleCount", { count: slot.pricingRules.length })}</span>
                )}
              </div>
              <div className="slot-actions">
                <button type="button" className="btn" onClick={() => openEdit(slot)} disabled={busy}>
                  {t("venue.ui.slots.edit")}
                </button>
                <button type="button" className="btn" onClick={() => void toggleActive(slot)} disabled={busy}>
                  {slot.isActive ? t("venue.ui.slots.deactivate") : t("venue.ui.slots.activate")}
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(slot)} disabled={busy}>
                  {t("venue.ui.slots.delete")}
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-expanded={expanded === slot.id}
                  onClick={() => setExpanded(expanded === slot.id ? null : slot.id)}
                  disabled={busy}
                >
                  {t("venue.ui.rules.toggle")}
                </button>
              </div>
              {expanded === slot.id && (
                <PricingRulesEditor
                  venueId={venueId}
                  slot={slot}
                  onRulesChanged={(pricingRules) =>
                    setSlots((current) => current.map((s) => (s.id === slot.id ? { ...s, pricingRules } : s)))
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <div className="slot-form">
          <div className="field">
            <label htmlFor={`${formId}-nameFr`}>{t("venue.ui.slots.nameFr")}</label>
            <input
              id={`${formId}-nameFr`}
              value={draft.nameFr}
              onChange={(e) => setDraft({ ...draft, nameFr: e.target.value })}
              aria-invalid={Boolean(fieldErrors.nameFr)}
            />
            {fieldErrors.nameFr && <p className="field-error">{tval(fieldErrors.nameFr)}</p>}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-nameAr`}>{t("venue.ui.slots.nameAr")}</label>
            <input
              id={`${formId}-nameAr`}
              lang="ar"
              dir="rtl"
              value={draft.nameAr}
              onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
              aria-invalid={Boolean(fieldErrors.nameAr)}
            />
            {fieldErrors.nameAr && <p className="field-error">{tval(fieldErrors.nameAr)}</p>}
          </div>

          <div className="field">
            <span className="field-label">{t("venue.ui.slots.start")}</span>
            {/* D57 — deux listes que NOUS rendons : `<input type="time">`
                afficherait AM/PM sur un navigateur en anglais. */}
            <TimeSelect
              label={t("venue.ui.slots.start")}
              value={draft.startClock}
              onChange={(startClock) => setDraft({ ...draft, startClock })}
            />
          </div>

          <div className="field">
            <span className="field-label">{t("venue.ui.slots.end")}</span>
            <TimeSelect
              label={t("venue.ui.slots.end")}
              value={draft.endClock}
              onChange={(endClock) => setDraft({ ...draft, endClock })}
            />
            {/* D52 — ce qui a été DÉDUIT est dit en clair. Une soirée 20h→02h
                est le cas normal, pas une erreur de saisie à corriger. */}
            <p id={`${formId}-end-hint`} className="field-hint" role="status">
              {derivedEnd?.next ? t("venue.ui.slots.endsNextDay") : t("venue.ui.slots.endsSameDay")}
            </p>
            {fieldErrors.endMinutes && <p className="field-error">{tval(fieldErrors.endMinutes)}</p>}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-price`}>{t("venue.ui.slots.price")}</label>
            <PriceInput
              id={`${formId}-price`}
              value={draft.price}
              onValueChange={(next) => setDraft({ ...draft, price: next })}
              describedBy={undefined}
              invalid={Boolean(fieldErrors.basePriceCents)}
              required
              currency={t("venue.ui.slots.currency")}
              unitHint={t("venue.ui.slots.priceHint")}
            />
            {fieldErrors.basePriceCents && <p className="field-error">{tval(fieldErrors.basePriceCents)}</p>}
          </div>

          <div className="slot-actions">
            <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
              {editing === "new" ? t("venue.ui.slots.create") : t("venue.ui.slots.save")}
            </button>
            <button type="button" className="btn" onClick={close} disabled={busy}>
              {t("venue.ui.slots.cancel")}
            </button>
          </div>
        </div>
      )}

      {editing === null && (
        <button type="button" className="btn btn-primary" onClick={openCreate} disabled={busy}>
          {t("venue.ui.slots.add")}
        </button>
      )}

      <p className="field-hint">{t("venue.ui.slots.derivedPriceNotice")}</p>

      {confirmingDelete && (
        <ConfirmDialog
          open
          title={t("venue.ui.slots.confirmTitle")}
          description={t("venue.ui.slots.confirmMessage", { name: confirmingDelete.nameFr })}
          confirmLabel={t("venue.ui.slots.delete")}
          cancelLabel={t("venue.ui.slots.cancel")}
          destructive
          onConfirm={() => void remove(confirmingDelete)}
          onCancel={() => setConfirmingDelete(null)}
        />
      )}
    </section>
  );
}
