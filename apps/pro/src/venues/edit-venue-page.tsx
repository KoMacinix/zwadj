// Édition d'une salle, PAR ID (le slug est public-only, §4). C'est l'écran
// qu'A6a étendra : la couture média est laissée nette et commentée, sans une
// ligne de rendu média (les champs `photos`/`photos360`/`links360`/`viewer360`
// du DTO sont volontairement ignorés ici).
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "@zwadj/ui";
import type { FieldErrors } from "@zwadj/api-client";
import type { VenueProDTO } from "@zwadj/types";
import { ProHeader } from "../shell/pro-header";
import { Field, FormError, useApiErrorMessage, useValidationMessage } from "../auth/auth-ui";
import { useReferentialsData, useVenues } from "./venue-client-context";
import { isVenueNotFound, venueFieldErrors } from "./venue-errors";
import {
  AmenitiesPicker,
  PublicationBadge,
  StatusSelect,
  VenueFormFields,
  buildUpdateDiff,
  venueToForm,
  type VenueFormValues
} from "./venue-form";

type LoadState =
  | { kind: "loading" }
  /** 404 INDISTINCT : inexistante, supprimée, id malformé, salle d'un autre
   *  pro — un seul et même état, aucune distinction (anti-énumération). */
  | { kind: "notFound" }
  | { kind: "error" }
  | { kind: "ready"; venue: VenueProDTO };

export function EditVenuePage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const venuesApi = useVenues();
  const apiErrorMessage = useApiErrorMessage();
  const tval = useValidationMessage();
  const referentials = useReferentialsData();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [values, setValues] = useState<VenueFormValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(() => {
    setState({ kind: "loading" });
    venuesApi
      .getMine(id)
      .then((venue) => {
        setState({ kind: "ready", venue });
        setValues(venueToForm(venue));
      })
      .catch((err: unknown) => setState({ kind: isVenueNotFound(err) ? "notFound" : "error" }));
  }, [venuesApi, id]);

  useEffect(() => load(), [load]);

  const patch = (next: Partial<VenueFormValues>) =>
    setValues((current) => (current ? { ...current, ...next } : current));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (state.kind !== "ready" || !values || referentials.status !== "ready") return;

    const diff = buildUpdateDiff(values, state.venue);
    if (diff.kind === "errors") {
      setFieldErrors(diff.errors);
      return;
    }
    if (diff.kind === "empty") {
      // Corps vide = 400 côté schéma : on ne l'envoie pas, on l'explique.
      setFieldErrors({});
      setNotice(t("venue.ui.form.noChanges"));
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      const updated = await venuesApi.update(state.venue.id, diff.data);
      setState({ kind: "ready", venue: updated });
      setValues(venueToForm(updated));
      setNotice(t("venue.ui.form.saved"));
    } catch (err) {
      if (isVenueNotFound(err)) {
        setState({ kind: "notFound" });
        return;
      }
      // Les 400 que le validate() local ne POUVAIT pas voir (existence d'un
      // référentiel : commune, équipements) atterrissent ici, sur leur champ.
      const mapped = venueFieldErrors(err);
      if (mapped) setFieldErrors(mapped);
      else setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (state.kind !== "ready") return;
    setConfirmingDelete(false);
    try {
      await venuesApi.softDelete(state.venue.id);
      void navigate("/");
    } catch {
      setFormError(t("venue.ui.delete.error"));
    }
  };

  if (state.kind === "loading") {
    return (
      <>
        <ProHeader />
        <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }} aria-busy="true">
          <p style={{ color: "var(--ink-2)" }}>{t("venue.ui.list.loading")}</p>
        </main>
      </>
    );
  }

  if (state.kind === "notFound") {
    return (
      <>
        <ProHeader />
        <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }}>
          <div className="state-panel">
            <h1>{t("venue.ui.notFound.title")}</h1>
            <p>{t("venue.ui.notFound.body")}</p>
            <Link to="/" className="btn btn-accent">
              {t("venue.ui.notFound.back")}
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (state.kind === "error" || !values) {
    return (
      <>
        <ProHeader />
        <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }}>
          <div className="state-panel">
            <p className="alert alert-error" role="alert">
              {t("venue.ui.form.loadError")}
            </p>
            <button type="button" className="btn btn-accent" onClick={load}>
              {t("venue.ui.list.retry")}
            </button>
          </div>
        </main>
      </>
    );
  }

  const venue = state.venue;

  return (
    <>
      <ProHeader />
      <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }}>
        <Link to="/" className="backlink">
          {t("venue.ui.form.back")}
        </Link>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20 }}>
          <form className="form" onSubmit={(e) => void submit(e)} noValidate>
            <h1>{t("venue.ui.form.editTitle")}</h1>
            <FormError message={formError} />
            {notice ? (
              <p className="alert alert-success" role="status">
                {notice}
              </p>
            ) : null}

            {referentials.status === "error" ? (
              <div className="alert alert-error" role="alert">
                <p style={{ margin: "0 0 8px" }}>{t("venue.ui.form.referentialsError")}</p>
                <button type="button" className="btn btn-ghost" onClick={referentials.reload}>
                  {t("venue.ui.list.retry")}
                </button>
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <PublicationBadge status={venue.publicationStatus} />
            </div>

            {/* Slug : figé à la création, généré serveur — lecture seule. */}
            <Field label={t("venue.ui.form.slug")} hint={t("venue.ui.form.slugHint")}>
              {({ id: slugId, describedBy }) => (
                <input id={slugId} type="text" value={venue.slug} readOnly dir="ltr" aria-describedby={describedBy} />
              )}
            </Field>

            <VenueFormFields
              values={values}
              onChange={patch}
              errors={fieldErrors}
              wilayas={referentials.wilayas}
              referentialsLoading={referentials.status === "loading"}
            />

            {/* D33 — même contrôle à 3 entrées que sur la liste. */}
            <Field label={t("venue.ui.status.label")} hint={t("venue.ui.status.hint")} error={tval(fieldErrors.status)}>
              {({ id: statusId, describedBy }) => (
                <StatusSelect
                  id={statusId}
                  value={values.status}
                  describedBy={describedBy}
                  onChange={(status) => patch({ status })}
                />
              )}
            </Field>

            <AmenitiesPicker
              amenities={referentials.amenities}
              selected={values.amenityIds}
              loading={referentials.status === "loading"}
              error={tval(fieldErrors.amenityIds)}
              onToggle={(amenityId, checked) =>
                patch({
                  amenityIds: checked
                    ? [...values.amenityIds, amenityId]
                    : values.amenityIds.filter((current) => current !== amenityId)
                })
              }
            />

            {/* A6a : médias (photos, ordre ↑/↓, alt, scènes 360°, éditeur de liaisons) — ne rien coder ici */}

            <button type="submit" className="btn btn-accent" disabled={saving || referentials.status !== "ready"}>
              {saving ? t("venue.ui.form.saving") : t("venue.ui.form.save")}
            </button>
          </form>
        </div>

        <div style={{ marginBlockStart: 18 }}>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
            {t("venue.ui.list.delete")}
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={confirmingDelete}
        destructive
        title={t("venue.ui.delete.title")}
        description={t("venue.ui.delete.body")}
        confirmLabel={t("venue.ui.delete.confirm")}
        cancelLabel={t("venue.ui.delete.cancel")}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
