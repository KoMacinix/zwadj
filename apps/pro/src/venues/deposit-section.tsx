// Lot E1b / D81 — section « Acompte » de l'écran d'édition d'une salle.
//
// SECTION AUTONOME, avec son propre bouton d'enregistrement, même patron que la
// visite virtuelle et les blocages. Elle passe par le PATCH général
// `/venues/:id`, mais deux raisons la gardent à part :
//
// 1. La politique d'acompte est une décision COMMERCIALE, pas un champ
//    d'identité. La noyer entre l'adresse et la capacité la ferait manquer.
// 2. Elle est une PAIRE indissociable (D81) : l'envoyer avec le diff général
//    obligerait le différentiel à raisonner sur deux champs corrélés, alors
//    qu'ici les deux partent toujours ensemble.
//
// ⚠ ÉDITION SEULEMENT, et c'est voulu : `venueCreateSchema` n'accepte pas ces
// clés (`.strict()`), et la colonne porte un DEFAULT de 3000 bps (D84). Une
// salle naît donc à 30 % — la valeur que le design annonce — et le pro la règle
// ensuite. Ajouter la saisie à la création n'apporterait qu'une décision de plus
// au moment où le pro veut surtout voir sa salle exister.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DEPOSIT_RATE_BPS_MAX, DEPOSIT_RATE_BPS_MIN, type VenueProDTO } from "@zwadj/types";
import { Field, useApiErrorMessage } from "../auth/auth-ui";
import { useVenueCrud } from "./venue-client-context";
import { PriceInput, formatPriceForDisplay, parseIntegerPrice, stripGroupSeparators } from "./venue-form";

type Mode = "RATE" | "AMOUNT";
type Feedback = { kind: "saved" } | { kind: "error"; message: string } | null;

/** Le pro pense en POURCENTS, la base stocke des points de base. La conversion
 *  vit ici et nulle part ailleurs : ×100 dans un sens, ÷100 dans l'autre. */
const RATE_PERCENT_MIN = DEPOSIT_RATE_BPS_MIN / 100;
const RATE_PERCENT_MAX = DEPOSIT_RATE_BPS_MAX / 100;

export function DepositSection({
  venue,
  onApplied
}: {
  venue: VenueProDTO;
  onApplied: (next: { depositRateBps: number | null; depositAmountCents: number | null }) => void;
}) {
  const { t } = useTranslation();
  const toMessage = useApiErrorMessage();
  const venues = useVenueCrud();

  const [mode, setMode] = useState<Mode>(venue.depositAmountCents === null ? "RATE" : "AMOUNT");
  const [percent, setPercent] = useState(
    venue.depositRateBps === null ? String(RATE_PERCENT_MIN) : String(venue.depositRateBps / 100)
  );
  const [amount, setAmount] = useState(
    venue.depositAmountCents === null ? "" : formatPriceForDisplay(String(venue.depositAmountCents / 100))
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const percentNumber = Number(percent);
  const percentInvalid =
    !Number.isInteger(percentNumber) || percentNumber < RATE_PERCENT_MIN || percentNumber > RATE_PERCENT_MAX;
  const parsedAmount = parseIntegerPrice(stripGroupSeparators(amount));
  const amountInvalid = !parsedAmount.ok || parsedAmount.cents <= 0;
  const invalid = mode === "RATE" ? percentInvalid : amountInvalid;

  async function submit(): Promise<void> {
    if (invalid) return;
    setSaving(true);
    setFeedback(null);
    try {
      // La paire part ENTIÈRE, exactement un des deux non nul. Le schéma partagé
      // refuse tout le reste — on ne lui envoie donc jamais une moitié.
      const next =
        mode === "RATE"
          ? { depositRateBps: percentNumber * 100, depositAmountCents: null }
          : { depositRateBps: null, depositAmountCents: parsedAmount.ok ? parsedAmount.cents : 0 };
      const updated = await venues.update(venue.id, next);
      onApplied({ depositRateBps: updated.depositRateBps, depositAmountCents: updated.depositAmountCents });
      setFeedback({ kind: "saved" });
    } catch (error) {
      setFeedback({ kind: "error", message: toMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" aria-labelledby="deposit-heading">
      <h2 id="deposit-heading">{t("venue.ui.deposit.title")}</h2>
      <p className="muted">{t("venue.ui.deposit.intro")}</p>

      <fieldset style={{ border: 0, padding: 0, margin: "0 0 12px" }}>
        <legend className="visually-hidden">{t("venue.ui.deposit.mode")}</legend>
        {/* Boutons radio et non un menu : deux choix mutuellement exclusifs qui
            changent le champ affiché. Un `<select>` cacherait la seconde option
            derrière un geste. */}
        <label style={{ marginInlineEnd: 16 }}>
          <input
            type="radio"
            name="deposit-mode"
            value="RATE"
            checked={mode === "RATE"}
            onChange={() => setMode("RATE")}
          />{" "}
          {t("venue.ui.deposit.modeRate")}
        </label>
        <label>
          <input
            type="radio"
            name="deposit-mode"
            value="AMOUNT"
            checked={mode === "AMOUNT"}
            onChange={() => setMode("AMOUNT")}
          />{" "}
          {t("venue.ui.deposit.modeAmount")}
        </label>
      </fieldset>

      {mode === "RATE" ? (
        <Field
          label={t("venue.ui.deposit.rateLabel")}
          error={percentInvalid ? t("venue.validation.depositRateRange") : undefined}
        >
          {({ id, describedBy }) => (
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={percentInvalid}
              type="text"
              inputMode="numeric"
              value={percent}
              onChange={(e) => setPercent(e.target.value.replace(/[^0-9]/g, ""))}
            />
          )}
        </Field>
      ) : (
        <Field
          label={t("venue.ui.deposit.amountLabel")}
          error={amountInvalid ? t("venue.validation.depositAmountRange") : undefined}
        >
          {({ id, describedBy }) => (
            <PriceInput
              id={id}
              describedBy={describedBy}
              invalid={amountInvalid}
              required
              value={amount}
              onValueChange={setAmount}
              currency={t("venue.ui.slots.currency")}
              unitHint={t("venue.ui.deposit.amountHint")}
            />
          )}
        </Field>
      )}

      {/* ⚠ La phrase qui compte, et qui n'est pas décorative : un acompte fixe
          supérieur au total d'une date est ÉCRÊTÉ, pas refusé. Sans elle, un pro
          qui règle 500 000 DA croirait les encaisser sur un créneau à 200 000. */}
      {mode === "AMOUNT" ? <p className="muted">{t("venue.ui.deposit.clampNotice")}</p> : null}

      <button type="button" className="btn btn-accent" onClick={submit} disabled={saving || invalid}>
        {saving ? t("venue.ui.deposit.saving") : t("venue.ui.deposit.save")}
      </button>

      {feedback?.kind === "saved" ? (
        <p role="status" className="success">
          {t("venue.ui.deposit.saved")}
        </p>
      ) : null}
      {feedback?.kind === "error" ? (
        <p role="alert" className="error">
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
