// Lot B4c — variantes de prix d'un créneau (D46, B2).
//
// ── Le piège de ce lot, de la même famille que D52 ───────────────────────────
// Une saison PEUT enjamber décembre : « novembre → février » s'écrit
// `startMonth: 11, endMonth: 2`. Valider `startMonth <= endMonth` interdirait
// la saison d'hiver — exactement la faute de B1 sur `endMinutes`, et de D52 sur
// l'heure de fin, une troisième fois. Le moteur, lui, sait déjà l'enjamber
// (`monthInWindow`). L'écran ne valide donc PAS l'ordre des mois : il AFFICHE
// ce que la fenêtre couvre, pour que le pro voie que « nov → fév » est compris.
//
// ── Ce que l'écran doit rendre lisible (D46) ─────────────────────────────────
// « Le pro pense en prix, pas en variantes. » Chaque règle affiche donc un
// montant en dinars, jamais un pourcentage — les prix sont ABSOLUS et ne se
// composent pas : UNE SEULE règle gagne. L'ordre de résolution
// HOLIDAY > WEEKDAY > SEASON, puis priorité décroissante, est ANNONCÉ, sans
// quoi le pro croit à un cumul et se demande pourquoi son total ne monte pas.
//
// ── Le TYPE n'est pas modifiable (B2) ────────────────────────────────────────
// Changer le type en place laisserait des bornes de saison sur une règle
// férié. Le formulaire d'édition n'offre donc pas le champ : on supprime et on
// recrée. L'écran le dit plutôt que de griser un contrôle sans explication.
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@zwadj/ui";
import type { FieldErrors } from "@zwadj/api-client";
import type { PricingRuleDTO, PricingRuleType, SlotTemplateDTO } from "@zwadj/types";
import { useApiErrorMessage, useValidationMessage } from "../auth/auth-ui";
import { useVenuePricingRules } from "./venue-client-context";
import { venueFieldErrors } from "./venue-errors";
import { PriceInput, formatPriceForDisplay, parseIntegerPrice, stripGroupSeparators } from "./venue-form";

/** Ordre de résolution B2, du plus spécifique au moins spécifique. C'est aussi
 *  l'ordre d'AFFICHAGE : la liste se lit comme le moteur décide. */
const TYPE_ORDER: Record<PricingRuleType, number> = { HOLIDAY: 0, WEEKDAY: 1, SEASON: 2 };

const byResolution = (a: PricingRuleDTO, b: PricingRuleDTO): number =>
  TYPE_ORDER[a.ruleType] - TYPE_ORDER[b.ruleType] ||
  b.priority - a.priority ||
  b.createdAt.localeCompare(a.createdAt) ||
  a.id.localeCompare(b.id);

interface RuleDraft {
  ruleType: PricingRuleType;
  label: string;
  price: string;
  startMonth: string;
  endMonth: string;
  daysOfWeek: number[];
  priority: string;
}

const emptyDraft = (): RuleDraft => ({
  ruleType: "SEASON",
  label: "",
  price: "",
  startMonth: "6",
  endMonth: "9",
  daysOfWeek: [],
  priority: "0"
});

const draftOf = (rule: PricingRuleDTO): RuleDraft => ({
  ruleType: rule.ruleType,
  label: rule.label ?? "",
  price: formatPriceForDisplay(String(rule.priceCents / 100)),
  startMonth: rule.startMonth === null ? "" : String(rule.startMonth),
  endMonth: rule.endMonth === null ? "" : String(rule.endMonth),
  daysOfWeek: [...rule.daysOfWeek],
  priority: String(rule.priority)
});

/** Noms de mois et de jours par `Intl`, dans la langue courante : douze + sept
 *  clés i18n de plus seraient douze + sept occasions de divergence FR/AR, pour
 *  des libellés que la plateforme connaît déjà. */
function monthNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2026, i, 1))));
}

function weekdayNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  // 2026-11-01 est un DIMANCHE : l'index 0 du contrat API tombe donc juste.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2026, 10, 1 + i))));
}

export function PricingRulesEditor({
  venueId,
  slot,
  onRulesChanged
}: {
  venueId: string;
  slot: SlotTemplateDTO;
  onRulesChanged: (rules: PricingRuleDTO[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const venues = useVenuePricingRules();
  const toMessage = useApiErrorMessage();
  const tval = useValidationMessage();
  const formId = useId();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<PricingRuleDTO | null>(null);

  const months = monthNames(i18n.language);
  const weekdays = weekdayNames(i18n.language);
  const rules = [...slot.pricingRules].sort(byResolution);

  const openCreate = () => {
    setEditing("new");
    setDraft(emptyDraft());
    setFieldErrors({});
    setError(null);
  };
  const openEdit = (rule: PricingRuleDTO) => {
    setEditing(rule.id);
    setDraft(draftOf(rule));
    setFieldErrors({});
    setError(null);
  };
  const close = () => {
    setEditing(null);
    setFieldErrors({});
    setError(null);
  };

  /** Validation LOCALE minimale : uniquement ce qui empêche de construire un
   *  corps. Les champs REQUIS PAR TYPE (saison ⇒ bornes, jour ⇒ au moins un
   *  jour) appartiennent à l'API — les dupliquer ici créerait deux règles à
   *  faire diverger. On n'y touche pas non plus à l'ORDRE des mois : une
   *  saison qui enjambe décembre est légale. */
  function buildInput() {
    const errors: FieldErrors = {};
    const price = parseIntegerPrice(stripGroupSeparators(draft.price));
    const priority = Number(draft.priority);
    if (!price.ok) errors.priceCents = "venue.validation.pricePositive";
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
      errors.priority = "venue.validation.priorityRange";
    }
    if (Object.keys(errors).length > 0 || !price.ok) {
      setFieldErrors(errors);
      return null;
    }
    const isSeason = draft.ruleType === "SEASON";
    return {
      ruleType: draft.ruleType,
      label: draft.label.trim() === "" ? null : draft.label.trim(),
      priceCents: price.cents,
      startMonth: isSeason && draft.startMonth !== "" ? Number(draft.startMonth) : null,
      endMonth: isSeason && draft.endMonth !== "" ? Number(draft.endMonth) : null,
      daysOfWeek: draft.ruleType === "WEEKDAY" ? [...draft.daysOfWeek].sort((a, b) => a - b) : [],
      priority
    };
  }

  async function submit() {
    const input = buildInput();
    if (!input) return;
    setBusy(true);
    setError(null);
    try {
      if (editing === "new") {
        const created = await venues.createPricingRule(venueId, slot.id, input);
        onRulesChanged([...slot.pricingRules, created]);
      } else if (editing) {
        // Le TYPE ne part PAS en modification : il n'est pas modifiable (B2).
        // Retiré explicitement plutôt que déstructuré-ignoré, pour que la
        // raison reste lisible et que le lint n'ait rien à excuser.
        const patch = { ...input };
        delete (patch as Partial<typeof input>).ruleType;
        const updated = await venues.updatePricingRule(venueId, slot.id, editing, patch);
        onRulesChanged(slot.pricingRules.map((r) => (r.id === updated.id ? updated : r)));
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

  async function remove(rule: PricingRuleDTO) {
    setBusy(true);
    setError(null);
    try {
      await venues.deletePricingRule(venueId, slot.id, rule.id);
      onRulesChanged(slot.pricingRules.filter((r) => r.id !== rule.id));
      setConfirming(null);
      if (editing === rule.id) close();
    } catch (cause) {
      setError(toMessage(cause));
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  /** Ce que la fenêtre de mois COUVRE réellement, y compris en enjambant
   *  décembre. C'est la phrase qui prouve au pro que « nov → fév » est compris
   *  et non silencieusement inversé. */
  function seasonSummary(): string | null {
    const start = Number(draft.startMonth);
    const end = Number(draft.endMonth);
    if (draft.ruleType !== "SEASON" || !start || !end) return null;
    const covered: string[] = [];
    for (let m = 1; m <= 12; m += 1) {
      const inWindow = start <= end ? m >= start && m <= end : m >= start || m <= end;
      if (inWindow) covered.push(months[m - 1] ?? String(m));
    }
    return covered.join(", ");
  }

  function describe(rule: PricingRuleDTO): string {
    if (rule.ruleType === "HOLIDAY") return t("venue.ui.rules.typeHoliday");
    if (rule.ruleType === "WEEKDAY") {
      return rule.daysOfWeek.map((d) => weekdays[d] ?? String(d)).join(", ");
    }
    const start = rule.startMonth === null ? "?" : (months[rule.startMonth - 1] ?? "?");
    const end = rule.endMonth === null ? "?" : (months[rule.endMonth - 1] ?? "?");
    return `${start} → ${end}`;
  }

  return (
    // Région NOMMÉE : un lecteur d'écran (et un test) doit pouvoir distinguer
    // les variantes d'un créneau de la liste des créneaux elle-même.
    <section className="rules-block" aria-label={t("venue.ui.rules.title")}>
      <h4 className="rules-title">{t("venue.ui.rules.title")}</h4>
      {/* D46 — l'ordre de résolution est ANNONCÉ : sans cela le pro croit à un
          cumul et ne comprend pas pourquoi une seule règle s'applique. */}
      <p className="field-hint">{t("venue.ui.rules.resolutionOrder")}</p>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {rules.length === 0 && <p className="field-hint">{t("venue.ui.rules.empty")}</p>}

      {rules.length > 0 && (
        <ul className="rules-list" aria-label={t("venue.ui.rules.title")}>
          {rules.map((rule) => (
            <li key={rule.id} className={rule.isActive ? "rule-row" : "rule-row is-inactive"}>
              <span className="rule-label">{rule.label ?? t(`venue.ui.rules.type${rule.ruleType[0]}${rule.ruleType.slice(1).toLowerCase()}`)}</span>
              <span className="rule-scope">{describe(rule)}</span>
              <span className="rule-price">
                {formatPriceForDisplay(String(rule.priceCents / 100))} {t("venue.ui.slots.currency")}
              </span>
              <span className="rule-priority">{t("venue.ui.rules.priority")} {rule.priority}</span>
              <button type="button" className="btn" onClick={() => openEdit(rule)} disabled={busy}>
                {t("venue.ui.slots.edit")}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setConfirming(rule)} disabled={busy}>
                {t("venue.ui.slots.delete")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <div className="rule-form">
          {editing === "new" ? (
            <div className="field">
              <label htmlFor={`${formId}-type`}>{t("venue.ui.rules.type")}</label>
              <select
                id={`${formId}-type`}
                value={draft.ruleType}
                onChange={(e) => setDraft({ ...draft, ruleType: e.target.value as PricingRuleType })}
              >
                <option value="HOLIDAY">{t("venue.ui.rules.typeHoliday")}</option>
                <option value="WEEKDAY">{t("venue.ui.rules.typeWeekday")}</option>
                <option value="SEASON">{t("venue.ui.rules.typeSeason")}</option>
              </select>
            </div>
          ) : (
            /* B2 — le type n'est pas modifiable : on l'explique, on ne grise
               pas un contrôle sans raison visible. */
            <p className="field-hint">{t("venue.ui.rules.typeLocked")}</p>
          )}

          <div className="field">
            <label htmlFor={`${formId}-label`}>{t("venue.ui.rules.label")}</label>
            <input
              id={`${formId}-label`}
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </div>

          {draft.ruleType === "SEASON" && (
            <div className="field">
              <label htmlFor={`${formId}-startMonth`}>{t("venue.ui.rules.fromMonth")}</label>
              <select
                id={`${formId}-startMonth`}
                value={draft.startMonth}
                onChange={(e) => setDraft({ ...draft, startMonth: e.target.value })}
              >
                {months.map((name, i) => (
                  <option key={name} value={String(i + 1)}>
                    {name}
                  </option>
                ))}
              </select>
              <label htmlFor={`${formId}-endMonth`}>{t("venue.ui.rules.toMonth")}</label>
              <select
                id={`${formId}-endMonth`}
                value={draft.endMonth}
                onChange={(e) => setDraft({ ...draft, endMonth: e.target.value })}
              >
                {months.map((name, i) => (
                  <option key={name} value={String(i + 1)}>
                    {name}
                  </option>
                ))}
              </select>
              {/* Une saison qui enjambe décembre est LÉGALE : on montre les mois
                  couverts au lieu de refuser l'ordre « inverse ». */}
              <p className="field-hint" role="status">
                {t("venue.ui.rules.covers")} {seasonSummary()}
              </p>
            </div>
          )}

          {draft.ruleType === "WEEKDAY" && (
            <fieldset className="field">
              <legend>{t("venue.ui.rules.days")}</legend>
              {weekdays.map((name, day) => (
                <label key={name} className="check">
                  <input
                    type="checkbox"
                    checked={draft.daysOfWeek.includes(day)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        daysOfWeek: e.target.checked
                          ? [...draft.daysOfWeek, day]
                          : draft.daysOfWeek.filter((d) => d !== day)
                      })
                    }
                  />
                  {name}
                </label>
              ))}
            </fieldset>
          )}

          <div className="field">
            <label htmlFor={`${formId}-price`}>{t("venue.ui.rules.price")}</label>
            <PriceInput
              id={`${formId}-price`}
              value={draft.price}
              onValueChange={(next) => setDraft({ ...draft, price: next })}
              describedBy={undefined}
              invalid={Boolean(fieldErrors.priceCents)}
              required
              currency={t("venue.ui.slots.currency")}
              unitHint={t("venue.ui.slots.priceHint")}
            />
            {fieldErrors.priceCents && <p className="field-error">{tval(fieldErrors.priceCents)}</p>}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-priority`}>{t("venue.ui.rules.priority")}</label>
            <input
              id={`${formId}-priority`}
              type="number"
              min={0}
              max={100}
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
              aria-invalid={Boolean(fieldErrors.priority)}
            />
            {fieldErrors.priority && <p className="field-error">{tval(fieldErrors.priority)}</p>}
          </div>

          <div className="slot-actions">
            <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
              {editing === "new" ? t("venue.ui.rules.create") : t("venue.ui.slots.save")}
            </button>
            <button type="button" className="btn" onClick={close} disabled={busy}>
              {t("venue.ui.slots.cancel")}
            </button>
          </div>
        </div>
      )}

      {editing === null && (
        <button type="button" className="btn" onClick={openCreate} disabled={busy}>
          {t("venue.ui.rules.add")}
        </button>
      )}

      {confirming && (
        <ConfirmDialog
          open
          title={t("venue.ui.rules.confirmTitle")}
          description={t("venue.ui.rules.confirmMessage")}
          confirmLabel={t("venue.ui.slots.delete")}
          cancelLabel={t("venue.ui.slots.cancel")}
          destructive
          onConfirm={() => void remove(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </section>
  );
}
