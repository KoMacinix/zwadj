// Création d'une salle (§3.3). Le formulaire n'envoie QUE les champs de base
// (`venueCreateSchema`, sans équipements) ; au succès on redirige vers
// `/salles/:id` où les équipements et le statut D33 apparaissent.
// On n'enchaîne JAMAIS POST puis PATCH : ça fabriquerait un état d'échec
// partiel (salle créée, équipements perdus) sans aucune contrepartie.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import type { FieldErrors } from "@zwadj/api-client";
import { ProHeader } from "../shell/pro-header";
import { FormError, useApiErrorMessage } from "../auth/auth-ui";
import { useReferentialsData, useVenues } from "./venue-client-context";
import { venueFieldErrors } from "./venue-errors";
import { VenueFormFields, buildCreateInput, emptyVenueForm, type VenueFormValues } from "./venue-form";

export function CreateVenuePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const venuesApi = useVenues();
  const apiErrorMessage = useApiErrorMessage();
  const referentials = useReferentialsData();

  const [values, setValues] = useState<VenueFormValues>(emptyVenueForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patch = (next: Partial<VenueFormValues>) => setValues((current) => ({ ...current, ...next }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    // Sans référentiels, pas de `cityId` possible : le submit reste bloqué.
    if (referentials.status !== "ready") return;

    const checked = buildCreateInput(values);
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const created = await venuesApi.create(checked.data);
      void navigate(`/salles/${created.id}`);
    } catch (err) {
      const mapped = venueFieldErrors(err);
      if (mapped) setFieldErrors(mapped);
      else setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ProHeader />
      <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }}>
        <Link to="/" className="backlink">
          {t("venue.ui.form.back")}
        </Link>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20 }}>
          <form className="form" onSubmit={(e) => void submit(e)} noValidate>
            <h1>{t("venue.ui.form.createTitle")}</h1>
            <FormError message={formError} />

            {referentials.status === "error" ? (
              <div className="alert alert-error" role="alert">
                <p style={{ margin: "0 0 8px" }}>{t("venue.ui.form.referentialsError")}</p>
                <button type="button" className="btn btn-ghost" onClick={referentials.reload}>
                  {t("venue.ui.list.retry")}
                </button>
              </div>
            ) : null}

            <VenueFormFields
              values={values}
              onChange={patch}
              errors={fieldErrors}
              wilayas={referentials.wilayas}
              referentialsLoading={referentials.status === "loading"}
            />

            {/* §3.3 — pas de champ équipements à la création : on le DIT. */}
            <p className="field-hint">{t("venue.ui.form.amenitiesAfterCreate")}</p>

            <button type="submit" className="btn btn-accent" disabled={submitting || referentials.status !== "ready"}>
              {submitting ? t("venue.ui.form.creating") : t("venue.ui.form.create")}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
