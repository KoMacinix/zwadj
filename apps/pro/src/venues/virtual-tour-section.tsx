// Lot A6a / D45 — section « Visite virtuelle » de l'écran d'édition d'une salle.
//
// SECTION AUTONOME, avec son propre bouton d'enregistrement : l'endpoint est
// PATCH /venues/:id/virtual-tour, distinct du PATCH général, et son corps porte
// la SAISIE BRUTE (URL ou ID) là où la salle stocke un ID canonique. La glisser
// dans le formulaire principal obligerait à réconcilier deux contrats dans un
// même submit. Même patron que les quatre sections indépendantes d'A11a.
//
// Édition seulement : sans id de salle, il n'y a rien à patcher — l'écran de
// création affiche le même renvoi que les équipements.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseMatterportInput } from "@zwadj/types";
import { Field, useApiErrorMessage } from "../auth/auth-ui";
import { useVenueMedia } from "./venue-client-context";

/** URL publique reconstruite par NOUS depuis l'ID stocké — jamais la chaîne
 *  saisie par le pro. C'est ce qui rend la validation d'hôte inoffensive : rien
 *  de ce qu'il tape n'est jamais suivi comme lien. */
export function matterportShareUrl(modelId: string): string {
  return `https://my.matterport.com/show/?m=${encodeURIComponent(modelId)}`;
}

type Feedback = { kind: "saved" | "cleared" } | { kind: "error"; message: string } | null;

export function VirtualTourSection({
  venueId,
  modelId,
  onApplied
}: {
  venueId: string;
  /** Valeur canonique côté serveur ; `null` = aucune visite rattachée. */
  modelId: string | null;
  onApplied: (next: string | null) => void;
}) {
  const { t } = useTranslation();
  const toMessage = useApiErrorMessage();
  const venues = useVenueMedia();

  // La saisie est libre : on n'y remet PAS l'URL canonique tant que le pro n'a
  // pas enregistré, sinon on écraserait ce qu'il est en train de taper.
  const [input, setInput] = useState(modelId ?? "");
  const [formatError, setFormatError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  /** Contrôle de confort au blur. Le serveur revalide TOUJOURS : ce retour
   *  immédiat n'a aucune autorité, il évite juste un aller-retour inutile. */
  function checkFormat(value: string): void {
    setFormatError(parseMatterportInput(value) === null);
  }

  async function submit(raw: string): Promise<void> {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await venues.updateVirtualTour(venueId, { matterportInput: raw });
      setInput(res.matterportModelId ?? "");
      setFormatError(false);
      setFeedback({ kind: res.matterportModelId === null ? "cleared" : "saved" });
      onApplied(res.matterportModelId);
    } catch (error) {
      setFeedback({ kind: "error", message: toMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          margin: "10px 0 0"
        }}
      >
        {t("venue.ui.form.sectionVirtualTour")}
      </h2>

      <Field
        label={t("venue.ui.form.virtualTour")}
        hint={t("venue.ui.form.virtualTourHint")}
        error={formatError ? t("venue.validation.matterportInvalid") : undefined}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (formatError) setFormatError(false); // on ne harcèle pas pendant la frappe
              setFeedback(null);
            }}
            onBlur={(e) => checkFormat(e.target.value)}
            placeholder={t("venue.ui.form.virtualTourPlaceholder")}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            // Une URL/ID est du texte LTR même en interface arabe.
            dir="ltr"
          />
        )}
      </Field>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <button type="button" className="btn" onClick={() => void submit(input)} disabled={saving}>
          {saving ? t("venue.ui.form.virtualTourSaving") : t("venue.ui.form.virtualTourSave")}
        </button>

        {/* Effacer = enregistrer une chaîne vide. Le bouton n'existe que s'il y
            a quelque chose à retirer CÔTÉ SERVEUR, pas côté saisie. */}
        {modelId !== null ? (
          <>
            <button type="button" className="btn btn-danger" onClick={() => void submit("")} disabled={saving}>
              {t("venue.ui.form.virtualTourClear")}
            </button>
            {/* Pas d'aperçu embarqué au MVP (A6b annulé) : un lien suffit au pro
                pour vérifier de ses yeux que le scan est le bon. */}
            <a href={matterportShareUrl(modelId)} target="_blank" rel="noopener noreferrer">
              {t("venue.ui.form.virtualTourOpen")}
            </a>
          </>
        ) : null}
      </div>

      {feedback ? (
        <p
          className={feedback.kind === "error" ? "alert alert-error" : "alert alert-success"}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.kind === "error"
            ? feedback.message
            : t(feedback.kind === "cleared" ? "venue.ui.form.virtualTourCleared" : "venue.ui.form.virtualTourSaved")}
        </p>
      ) : null}
    </section>
  );
}
