// Catalogue de prestations d'une salle, côté PRO — Lot E2c.
//
// C'est l'écran qui rend E2a atteignable : l'API existait, personne ne pouvait
// remplir son catalogue.
//
// ── Ce que cet écran doit rendre évident ─────────────────────────────────────
// 1. Que le TYPE de tarification est un choix DÉFINITIF. Il ne se modifie pas
//    (D90) : le formulaire le dit avant la création, pas après.
// 2. Que « retirer de la vente » et « supprimer » sont deux gestes différents.
//    Le premier est réversible et mis en avant ; le second est refusé dès que la
//    prestation a servi (D93), et l'écran l'explique plutôt que d'afficher une
//    erreur nue.
// 3. Que PER_GUEST se multiplie par le nombre d'invités du devis — un pro qui
//    saisit 2 000 DA en croyant fixer un forfait facturerait 500 000 DA.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDZD } from "@zwadj/i18n";
import { ServicePricingType, type ServiceDTO } from "@zwadj/types";
import { Field, useApiErrorMessage } from "../auth/auth-ui";
import { useServices } from "./venue-client-context";
import { PriceInput, formatPriceForDisplay, parseIntegerPrice, stripGroupSeparators } from "./venue-form";

type Draft = {
  pricingType: ServicePricingType;
  nameFr: string;
  nameAr: string;
  price: string;
  unitNameFr: string;
  unitNameAr: string;
  tierLabelFr: string;
  tierLabelAr: string;
};

const EMPTY: Draft = {
  pricingType: ServicePricingType.FIXED,
  nameFr: "",
  nameAr: "",
  price: "",
  unitNameFr: "",
  unitNameAr: "",
  tierLabelFr: "",
  tierLabelAr: ""
};

export function ServicesSection({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const services = useServices();
  const toMessage = useApiErrorMessage();
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;

  const [rows, setRows] = useState<ServiceDTO[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      // GARDE DE FORME (leçon C5b) : cette section est montée sur une page qui
      // en porte cinq autres. Une réponse inattendue ne doit pas la faire lever
      // et emporter le formulaire de la salle avec elle.
      const list = await services.listForVenue(venueId);
      setRows(Array.isArray(list) ? list : []);
      setError(null);
    } catch (cause) {
      setError(toMessageRef.current(cause));
    }
  }, [services, venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsed = parseIntegerPrice(stripGroupSeparators(draft.price));
  const priceOk = parsed.ok && parsed.cents >= 0;
  const needsUnit = draft.pricingType === ServicePricingType.PER_UNIT;
  const needsTier = draft.pricingType === ServicePricingType.TIERED;
  const complete =
    draft.nameFr.trim() !== "" &&
    draft.nameAr.trim() !== "" &&
    priceOk &&
    (!needsUnit || (draft.unitNameFr.trim() !== "" && draft.unitNameAr.trim() !== "")) &&
    (!needsTier || (draft.tierLabelFr.trim() !== "" && draft.tierLabelAr.trim() !== ""));

  async function submit(): Promise<void> {
    if (!complete || !parsed.ok) return;
    setBusy(true);
    setError(null);
    try {
      const common = { nameFr: draft.nameFr.trim(), nameAr: draft.nameAr.trim() };
      // Le corps envoyé dépend du TYPE, et strictement : le schéma partagé est
      // une union discriminée, un champ étranger fait échouer la requête.
      const body =
        draft.pricingType === ServicePricingType.FIXED
          ? { pricingType: "FIXED" as const, ...common, fixedPriceCents: parsed.cents }
          : draft.pricingType === ServicePricingType.PER_GUEST
            ? { pricingType: "PER_GUEST" as const, ...common, perGuestPriceCents: parsed.cents }
            : draft.pricingType === ServicePricingType.PER_UNIT
              ? {
                  pricingType: "PER_UNIT" as const,
                  ...common,
                  perUnitPriceCents: parsed.cents,
                  unitNameFr: draft.unitNameFr.trim(),
                  unitNameAr: draft.unitNameAr.trim()
                }
              : {
                  pricingType: "TIERED" as const,
                  ...common,
                  // Un premier palier est OBLIGATOIRE : un TIERED sans palier est
                  // une prestation que personne ne peut choisir. Les suivants
                  // s'ajoutent après création.
                  tiers: [
                    {
                      labelFr: draft.tierLabelFr.trim(),
                      labelAr: draft.tierLabelAr.trim(),
                      priceCents: parsed.cents
                    }
                  ]
                };
      await services.create(venueId, body);
      setDraft(EMPTY);
      await load();
    } catch (cause) {
      setError(toMessageRef.current(cause));
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (cause) {
      setError(toMessageRef.current(cause));
    } finally {
      setBusy(false);
    }
  }

  function priceLabel(row: ServiceDTO): string {
    if (row.pricingType === ServicePricingType.TIERED) {
      return row.tiers.map((tier) => `${tier.labelFr} ${formatDZD(tier.priceCents)}`).join(" · ");
    }
    if (row.pricingType === ServicePricingType.PER_GUEST) {
      return t("venue.ui.services.perGuest", { amount: formatDZD(row.perGuestPriceCents ?? 0) });
    }
    if (row.pricingType === ServicePricingType.PER_UNIT) {
      return t("venue.ui.services.perUnit", {
        amount: formatDZD(row.perUnitPriceCents ?? 0),
        unit: row.unitNameFr ?? ""
      });
    }
    return formatDZD(row.fixedPriceCents ?? 0);
  }

  return (
    <section className="card">
      <h2>{t("venue.ui.services.title")}</h2>
      <p className="field-hint">{t("venue.ui.services.hint")}</p>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {rows === null ? (
        <p className="field-hint">{t("venue.ui.services.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="field-hint">{t("venue.ui.services.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 8 }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                display: "grid",
                gap: 4,
                padding: 10,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                opacity: row.isActive ? 1 : 0.55
              }}
            >
              <strong>{row.nameFr}</strong>
              <span className="field-hint">{priceLabel(row)}</span>
              {row.isActive ? null : <span className="field-hint">{t("venue.ui.services.retired")}</span>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* Le geste COURANT, et il est réversible : on le met en premier. */}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void run(() => services.update(row.id, { isActive: !row.isActive }))}
                >
                  {row.isActive ? t("venue.ui.services.retire") : t("venue.ui.services.restore")}
                </button>
                {/* Le geste RARE. L'API le refuse dès que la prestation a servi,
                    et le message explique alors quoi faire à la place. */}
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void run(() => services.remove(row.id))}>
                  {t("venue.ui.services.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3>{t("venue.ui.services.addTitle")}</h3>

      <Field label={t("venue.ui.services.type")} hint={t("venue.ui.services.typeHint")}>
        {({ id, describedBy }) => (
          <select
            id={id}
            aria-describedby={describedBy}
            value={draft.pricingType}
            onChange={(e) => setDraft({ ...draft, pricingType: e.target.value as ServicePricingType })}
          >
            <option value={ServicePricingType.FIXED}>{t("venue.ui.services.typeFixed")}</option>
            <option value={ServicePricingType.PER_GUEST}>{t("venue.ui.services.typePerGuest")}</option>
            <option value={ServicePricingType.PER_UNIT}>{t("venue.ui.services.typePerUnit")}</option>
            <option value={ServicePricingType.TIERED}>{t("venue.ui.services.typeTiered")}</option>
          </select>
        )}
      </Field>

      <Field label={t("venue.ui.services.nameFr")}>
        {({ id }) => <input id={id} value={draft.nameFr} onChange={(e) => setDraft({ ...draft, nameFr: e.target.value })} />}
      </Field>
      <Field label={t("venue.ui.services.nameAr")}>
        {({ id }) => (
          <input id={id} dir="rtl" value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} />
        )}
      </Field>

      <Field
        label={t("venue.ui.services.price")}
        hint={
          draft.pricingType === ServicePricingType.PER_GUEST
            ? // ⚠ La phrase qui évite l'erreur la plus chère de l'écran.
              t("venue.ui.services.perGuestWarning")
            : undefined
        }
      >
        {({ id, describedBy }) => (
          <PriceInput
            id={id}
            describedBy={describedBy}
            invalid={!priceOk}
            required
            value={draft.price}
            onValueChange={(value) => setDraft({ ...draft, price: formatPriceForDisplay(value) })}
            currency={t("venue.ui.slots.currency")}
            unitHint={t("venue.ui.services.priceUnitHint")}
          />
        )}
      </Field>

      {needsUnit ? (
        <>
          <Field label={t("venue.ui.services.unitFr")} hint={t("venue.ui.services.unitHint")}>
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                value={draft.unitNameFr}
                onChange={(e) => setDraft({ ...draft, unitNameFr: e.target.value })}
              />
            )}
          </Field>
          <Field label={t("venue.ui.services.unitAr")}>
            {({ id }) => (
              <input
                id={id}
                dir="rtl"
                value={draft.unitNameAr}
                onChange={(e) => setDraft({ ...draft, unitNameAr: e.target.value })}
              />
            )}
          </Field>
        </>
      ) : null}

      {needsTier ? (
        <>
          <Field label={t("venue.ui.services.tierFr")} hint={t("venue.ui.services.tierHint")}>
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                value={draft.tierLabelFr}
                onChange={(e) => setDraft({ ...draft, tierLabelFr: e.target.value })}
              />
            )}
          </Field>
          <Field label={t("venue.ui.services.tierAr")}>
            {({ id }) => (
              <input
                id={id}
                dir="rtl"
                value={draft.tierLabelAr}
                onChange={(e) => setDraft({ ...draft, tierLabelAr: e.target.value })}
              />
            )}
          </Field>
        </>
      ) : null}

      <button type="button" className="btn btn-accent" disabled={!complete || busy} onClick={() => void submit()}>
        {t("venue.ui.services.add")}
      </button>
    </section>
  );
}
