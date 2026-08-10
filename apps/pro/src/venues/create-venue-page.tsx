// Création d'une salle — ÉTAPE 1 de l'assistant (Lot UIP-C, décision (a)).
//
// ── Une seule étape ici, et c'est le point du lot ────────────────────────────
// Cette page ne porte que « L'essentiel » : les cinq champs que
// `venueCreateSchema` exige — noms FR/AR, wilaya, capacité, prix de base. Au
// succès, la salle EXISTE, et l'assistant continue sur `/salles/:id?etape=2` où
// toutes les étapes suivantes écrivent sur un id réel.
//
// C'est ce qui lève l'asymétrie création/édition signalée avant ce lot :
// équipements, créneaux, prestations, acompte, photos et visite virtuelle ont
// tous besoin d'un id, et ils l'ont désormais dès l'étape 2.
//
// ⚠ On n'enchaîne toujours JAMAIS POST puis PATCH dans le même geste : ça
// fabriquerait un état d'échec partiel (salle créée, reste perdu) sans aucune
// contrepartie. La navigation vers l'étape 2 est une navigation, pas un second
// appel silencieux.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { ArrowBackIcon } from "@zwadj/ui";
import type { FieldErrors } from "@zwadj/api-client";
import { ProHeader } from "../shell/pro-header";
import { FormError, useApiErrorMessage } from "../auth/auth-ui";
import { useReferentialsData, useVenues } from "./venue-client-context";
import { venueFieldErrors } from "./venue-errors";
import {
  CapacityPriceFields,
  CityField,
  NameFields,
  buildCreateInput,
  emptyVenueForm,
  liveErrors,
  type VenueFormValues
} from "./venue-form";
import { VenueWizard } from "./venue-wizard";

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

  /** ⚠ La validité de l'étape 1 EST le contrat de création. Aucune règle
   *  parallèle : on essaie de construire le corps, et s'il passe, l'étape passe
   *  (D55 — le schéma a autorité, on n'invente pas de borne pour l'occasion). */
  const controle = buildCreateInput(values);
  const stepValid = referentials.status === "ready" && controle.errors === null;
  /** Les erreurs affichées : celles du dernier essai, PLUS celles des champs déjà
   *  remplis — sans quoi un « Suivant » grisé ne dirait pas quel champ fâche. */
  const erreursVues = { ...liveErrors(controle.errors ?? {}, values), ...fieldErrors };

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
      // La salle existe : l'assistant reprend à l'étape 2, sur un id réel.
      void navigate(`/salles/${created.id}?etape=2`);
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
        <Link to="/salles" className="backlink">
          <ArrowBackIcon />
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

            <VenueWizard
              steps={[
                {
                  n: 1,
                  title: t("venue.ui.wizard.step1"),
                  valid: stepValid,
                  reachable: true,
                  body: (
                    <>
                      <NameFields values={values} onChange={patch} errors={erreursVues} />
                      <CityField
                        values={values}
                        onChange={patch}
                        errors={erreursVues}
                        wilayas={referentials.wilayas}
                        referentialsLoading={referentials.status === "loading"}
                      />
                      <CapacityPriceFields values={values} onChange={patch} errors={erreursVues} />
                      {/* Ce que l'étape 1 ne demande PAS, et pourquoi : ces volets
                          ont chacun leur endpoint, et un endpoint a besoin d'un id.
                          Ils arrivent donc juste après, une fois la salle née. */}
                      <p className="field-hint">{t("venue.ui.wizard.afterCreate")}</p>
                    </>
                  )
                }
              ]}
              current={1}
              onGo={() => undefined}
              onNext={() => void submit(new Event("submit") as unknown as React.FormEvent)}
              nextLabel={submitting ? t("venue.ui.form.creating") : t("venue.ui.wizard.createAndContinue")}
              busy={submitting}
              invalidHint={t("venue.ui.wizard.step1Invalid")}
            />

            <Link to="/salles" className="btn">
              <ArrowBackIcon />
              {t("venue.ui.form.back")}
            </Link>
          </form>
        </div>
      </main>
    </>
  );
}
